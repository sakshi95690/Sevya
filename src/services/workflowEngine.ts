import { db, checkDatabaseConnection, isConnectionError } from '../db/index.ts';
import {
  workflowEvents,
  workflows,
  workflowExecutions,
  workflowJobs,
  notificationPreferences,
  notificationDeliveries,
  webPushSubscriptions,
  approvalRequests,
  approvalSteps,
  notifications,
  users,
  tasks,
  meetings,
  auditLogs,
  temples,
  announcements,
  sevas,
  feedbacks,
} from '../db/schema.ts';
import { eq, and, or, sql, inArray, gte, lte, desc, ne } from 'drizzle-orm';
import { sendWebPushNotification } from './webPushService.ts';
import { normalizeRole, getRequiredParentRole } from '../utils/roleHierarchy.ts';
import { isValidUuid } from '../middleware/auth.ts';

// Strongly Typed Event Names
export type WorkflowEventType =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_OVERDUE'
  | 'TASK_REMINDER'
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELLED'
  | 'MEETING_REMINDER'
  | 'APPROVAL_SUBMITTED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED'
  | 'ANNOUNCEMENT_CREATED'
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'FEEDBACK_SUBMITTED'
  | 'SECRETARY_ASSIGNED'
  | 'SEVA_CREATED'
  | 'SEVA_BOOKED'
  | 'SEVA_APPROVED'
  | 'SEVA_CANCELLED'
  | 'DONATION_CREATED'
  | 'DONATION_CONFIRMED'
  | 'REPORT_GENERATED';

export interface EmitEventParams {
  templeId: string;
  eventType: WorkflowEventType;
  entityType: 'task' | 'meeting' | 'approval' | 'user' | 'seva' | 'donation' | 'expense' | 'department' | 'announcement' | 'feedback' | 'secretary' | 'report' | 'payment';
  entityId: string;
  payload?: Record<string, any>;
  actorUserId?: string | null;
  idempotencyKey?: string;
}

export interface MultiChannelNotificationParams {
  templeId: string;
  recipientUserId: string;
  category: 'tasks' | 'meetings' | 'approvals' | 'sevas' | 'announcements' | 'reports' | 'feedback' | 'system';
  title: string;
  message: string;
  linkId?: string;
  mandatory?: boolean;
  emailData?: { to?: string; subject: string; body: string; isHtml?: boolean };
  whatsAppData?: { phone?: string; text: string };
  pushData?: { url?: string; icon?: string };
}

// Global queue processing flag
let isProcessingQueue = false;

// Global sender functions registry
let globalEmailSender: ((tenantId: string, opts: any, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>) | null = null;
let globalWhatsAppSender: ((tenantId: string, phone: string, text: string, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>) | null = null;

export function registerNotificationSenders(
  emailSender: (tenantId: string, opts: any, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>,
  whatsappSender: (tenantId: string, phone: string, text: string, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>
) {
  globalEmailSender = emailSender;
  globalWhatsAppSender = whatsappSender;
}

/**
 * 1. Central Event Emission Handler
 * Inserts the event, enforces idempotency, checks matching workflow rules, and enqueues jobs.
 */
export async function emitWorkflowEvent(params: EmitEventParams): Promise<{ eventId: string; skippedDuplicate?: boolean }> {
  const { templeId, eventType, entityType, entityId, payload = {}, actorUserId = null, idempotencyKey } = params;

  // Derive default idempotency key if not provided
  const actualIdempotencyKey = idempotencyKey || `${eventType}:${entityType}:${entityId}:${Date.now()}`;

  // Check duplicate idempotency
  if (idempotencyKey) {
    const existing = await db
      .select({ id: workflowEvents.id })
      .from(workflowEvents)
      .where(eq(workflowEvents.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[Workflow Engine] Skipping duplicate event with idempotencyKey: ${idempotencyKey}`);
      return { eventId: existing[0].id, skippedDuplicate: true };
    }
  }

  // Record Event
  const [newEvent] = await db
    .insert(workflowEvents)
    .values({
      templeId,
      eventType,
      entityType,
      entityId,
      payloadJson: payload,
      idempotencyKey: actualIdempotencyKey,
      actorUserId: actorUserId || undefined,
      status: 'PROCESSING',
    })
    .returning();

  // Find matching active custom workflow rules
  const matchingWorkflows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.templeId, templeId), eq(workflows.triggerEvent, eventType), eq(workflows.active, true)));

  // If no specific custom workflow rules configured, execute built-in event handlers
  if (matchingWorkflows.length === 0) {
    await executeBuiltInEventHandler(newEvent, params);
  } else {
    for (const wf of matchingWorkflows) {
      // Create execution log entry
      const [execution] = await db
        .insert(workflowExecutions)
        .values({
          templeId,
          workflowId: wf.id,
          eventId: newEvent.id,
          status: 'SUCCESS',
          executionLogJson: [{ step: 'TRIGGERED', time: new Date().toISOString(), message: `Workflow '${wf.name}' triggered by ${eventType}` }],
        })
        .returning();

      // Enqueue workflow actions as jobs
      const actions = (wf.actionsJson as any[]) || [];
      for (const action of actions) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: action.type || 'EXECUTE_WORKFLOW_ACTION',
          payloadJson: {
            workflowId: wf.id,
            executionId: execution.id,
            action,
            eventPayload: payload,
            entityType,
            entityId,
          },
          idempotencyKey: `${execution.id}:${action.type || 'action'}:${Date.now()}`,
        });
      }
    }
  }

  // Update event status to COMPLETED
  await db
    .update(workflowEvents)
    .set({ status: 'COMPLETED', processedAt: new Date() })
    .where(eq(workflowEvents.id, newEvent.id));

  // Trigger non-blocking async queue worker
  processQueueJobs().catch((err) => console.error('[Queue Worker Error]:', err));

  return { eventId: newEvent.id };
}

/**
 * 2. Enqueue Job for Asynchronous Processing
 */
export async function enqueueJob(params: {
  templeId: string;
  queue?: string;
  jobType: string;
  payloadJson: Record<string, any>;
  idempotencyKey?: string;
  scheduledFor?: Date;
}) {
  const actualKey = params.idempotencyKey || `${params.jobType}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  
  if (params.idempotencyKey) {
    const existing = await db
      .select({ id: workflowJobs.id })
      .from(workflowJobs)
      .where(eq(workflowJobs.idempotencyKey, params.idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }
  }

  const [job] = await db
    .insert(workflowJobs)
    .values({
      templeId: params.templeId,
      queue: params.queue || 'default',
      jobType: params.jobType,
      payloadJson: params.payloadJson,
      idempotencyKey: actualKey,
      scheduledFor: params.scheduledFor || new Date(),
      status: 'PENDING',
    })
    .returning();

  return job.id;
}

/**
 * Helper to build elegant HTML email template
 */
function buildHtmlEmail(options: {
  title: string;
  heading: string;
  subtitle?: string;
  greeting?: string;
  content: string;
  details?: Array<{ label: string; value: string }>;
  ctaText?: string;
  ctaUrl?: string;
  templeName?: string;
}): string {
  const {
    title,
    heading,
    subtitle,
    greeting = 'Hari Om & Namaste,',
    content,
    details = [],
    ctaText,
    ctaUrl,
    templeName = 'SEVYA Temple Management',
  } = options;

  const detailRows = details
    .map(
      (d) => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 600; color: #475569; width: 35%; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${d.label}</td>
        <td style="padding: 8px 12px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${d.value}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); width: 100%; border-collapse: collapse;">
    <!-- Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 28px 32px; text-align: left;">
        <div style="font-size: 11px; font-weight: 800; color: #fed7aa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">SEVYA NOTIFICATION</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">${heading}</h1>
        ${subtitle ? `<p style="margin: 6px 0 0 0; color: #ffedd5; font-size: 13px;">${subtitle}</p>` : ''}
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 15px; color: #334155; margin-top: 0; font-weight: 600;">${greeting}</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0;">${content.replace(/\n/g, '<br/>')}</p>

        ${
          details.length > 0
            ? `<table style="width: 100%; margin: 20px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; border-collapse: collapse;">
                ${detailRows}
              </table>`
            : ''
        }

        ${
          ctaText && ctaUrl
            ? `<div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${ctaUrl}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.3);">
                  ${ctaText}
                </a>
              </div>`
            : ''
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">${templeName} • Seva & Operations Portal</p>
        <p style="margin: 0;">May dedicated seva bring peace and prosperity. You received this notice based on your role and notification preferences in SEVYA.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 3. Central Notification Dispatcher with User Preferences & Multi-Channel Delivery
 */
export async function dispatchMultiChannelNotification(
  params: MultiChannelNotificationParams,
  emailSenderFunc?: (tenantId: string, opts: any, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>,
  whatsappSenderFunc?: (tenantId: string, phone: string, text: string, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>
) {
  const { templeId, recipientUserId, category, title, message, linkId, mandatory = false, emailData, whatsAppData, pushData } = params;

  const emailFn = emailSenderFunc || globalEmailSender;
  const waFn = whatsappSenderFunc || globalWhatsAppSender;

  // Fetch recipient user details
  const [recipient] = await db.select().from(users).where(eq(users.id, recipientUserId)).limit(1);
  if (!recipient) {
    console.warn(`[NotificationService] Recipient user ${recipientUserId} not found.`);
    return;
  }

  // Fetch or initialize user notification preferences
  let [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, recipientUserId), eq(notificationPreferences.category, category)))
    .limit(1);

  if (!prefs) {
    // Insert default recommended preferences
    const [newPref] = await db
      .insert(notificationPreferences)
      .values({
        templeId,
        userId: recipientUserId,
        category,
        emailEnabled: true,
        whatsappEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      })
      .returning();
    prefs = newPref;
  }

  const allowEmail = mandatory || prefs.emailEnabled;
  const allowWhatsApp = mandatory || prefs.whatsappEnabled;
  const allowPush = mandatory || prefs.pushEnabled;
  const allowInApp = mandatory || prefs.inAppEnabled;

  // 1. In-App Notification Record
  let createdNotificationId: string | null = null;
  if (allowInApp) {
    try {
      const [inAppNotif] = await db
        .insert(notifications)
        .values({
          templeId,
          recipientUserId,
          type: category.toUpperCase(),
          title,
          message,
          linkId,
        })
        .returning();
      createdNotificationId = inAppNotif.id;

      await db.insert(notificationDeliveries).values({
        notificationId: createdNotificationId,
        channel: 'in_app',
        status: 'DELIVERED',
        providerResponse: 'In-app notification saved to inbox',
        deliveredAt: new Date(),
      });
    } catch (err: any) {
      console.error('[NotificationService] In-App delivery failed:', err);
    }
  }

  // 2. Email Notification (Gmail / Google Workspace OAuth)
  if (allowEmail && recipient.email && emailData && emailFn) {
    try {
      const emailRes = await emailFn(templeId, {
        to: emailData.to || recipient.email,
        subject: emailData.subject,
        body: emailData.body,
        isHtml: emailData.isHtml !== false, // default true
      }, recipientUserId);

      if (createdNotificationId) {
        await db.insert(notificationDeliveries).values({
          notificationId: createdNotificationId,
          channel: 'email',
          status: emailRes.success ? 'DELIVERED' : 'FAILED',
          providerResponse: emailRes.message,
          deliveredAt: emailRes.success ? new Date() : undefined,
          failedAt: !emailRes.success ? new Date() : undefined,
        });
      }
    } catch (err: any) {
      console.error('[NotificationService] Email delivery exception:', err);
      if (createdNotificationId) {
        await db.insert(notificationDeliveries).values({
          notificationId: createdNotificationId,
          channel: 'email',
          status: 'FAILED',
          providerResponse: err.message || 'Email delivery exception',
          failedAt: new Date(),
        });
      }
    }
  }

  // 3. WhatsApp Notification (WhatsApp Business API / Gateway)
  if (allowWhatsApp && (recipient.phone || whatsAppData?.phone) && whatsAppData && waFn) {
    const targetPhone = whatsAppData.phone || recipient.phone || '';
    if (targetPhone) {
      try {
        const waRes = await waFn(templeId, targetPhone, whatsAppData.text, recipientUserId);

        if (createdNotificationId) {
          await db.insert(notificationDeliveries).values({
            notificationId: createdNotificationId,
            channel: 'whatsapp',
            status: waRes.success ? 'DELIVERED' : 'FAILED',
            providerResponse: waRes.message,
            deliveredAt: waRes.success ? new Date() : undefined,
            failedAt: !waRes.success ? new Date() : undefined,
          });
        }
      } catch (err: any) {
        console.error('[NotificationService] WhatsApp delivery exception:', err);
        if (createdNotificationId) {
          await db.insert(notificationDeliveries).values({
            notificationId: createdNotificationId,
            channel: 'whatsapp',
            status: 'FAILED',
            providerResponse: err.message || 'WhatsApp delivery exception',
            failedAt: new Date(),
          });
        }
      }
    }
  }

  // 4. Web Push Notification
  if (allowPush) {
    try {
      const subs = await db
        .select()
        .from(webPushSubscriptions)
        .where(and(eq(webPushSubscriptions.userId, recipientUserId), eq(webPushSubscriptions.active, true)));

      for (const sub of subs) {
        const pushResult = await sendWebPushNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keysJson as any,
          },
          {
            title,
            body: message,
            url: pushData?.url || linkId || '/dashboard',
            icon: pushData?.icon || '/vite.svg',
          }
        );

        if (!pushResult.success && pushResult.error?.includes('410')) {
          await db.update(webPushSubscriptions).set({ active: false }).where(eq(webPushSubscriptions.id, sub.id));
        }

        if (createdNotificationId) {
          await db.insert(notificationDeliveries).values({
            notificationId: createdNotificationId,
            channel: 'push',
            status: pushResult.success ? 'DELIVERED' : 'FAILED',
            providerResponse: pushResult.error || 'Push delivered successfully',
            deliveredAt: pushResult.success ? new Date() : undefined,
            failedAt: !pushResult.success ? new Date() : undefined,
          });
        }
      }
    } catch (err: any) {
      console.error('[NotificationService] Web Push delivery exception:', err);
    }
  }
}

/**
 * 4. Built-in Event Handlers for Core Sevya Application Flow
 */
async function executeBuiltInEventHandler(eventRecord: any, params: EmitEventParams) {
  const { templeId, eventType, entityType, entityId, payload = {} } = params;

  switch (eventType) {
    // 1. Task Assigned / Created
    case 'TASK_CREATED':
    case 'TASK_ASSIGNED': {
      if (payload.assignedTo) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_TASK_ASSIGNED_NOTIFICATION',
          payloadJson: {
            taskId: entityId,
            recipientUserId: payload.assignedTo,
            taskTitle: payload.title || 'Temple Task',
            description: payload.description || '',
            priority: payload.priority || 'medium',
            dueDate: payload.dueDate || '',
            departmentName: payload.departmentName || 'General Seva',
          },
          idempotencyKey: `task_assigned:${entityId}:${payload.assignedTo}`,
        });
      }
      break;
    }

    // 2. Task Completed
    case 'TASK_COMPLETED': {
      if (payload.createdBy) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_TASK_COMPLETED_NOTIFICATION',
          payloadJson: {
            taskId: entityId,
            recipientUserId: payload.createdBy,
            taskTitle: payload.title || 'Temple Task',
            completedByName: payload.completedByName || 'Devotee',
          },
          idempotencyKey: `task_completed:${entityId}:${payload.createdBy}`,
        });
      }
      break;
    }

    // 3. Task Overdue / Deadline Reminder
    case 'TASK_OVERDUE':
    case 'TASK_REMINDER': {
      if (payload.assignedTo) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_TASK_OVERDUE_NOTIFICATION',
          payloadJson: {
            taskId: entityId,
            recipientUserId: payload.assignedTo,
            taskTitle: payload.title || 'Pending Seva Task',
            dueDate: payload.dueDate || 'Today',
            priority: payload.priority || 'high',
          },
          idempotencyKey: `task_overdue:${entityId}:${Date.now()}`,
        });
      }
      break;
    }

    // 4. Meeting Created (Zoom / Google Meet)
    case 'MEETING_CREATED': {
      const participantIds = payload.participantUserIds || payload.participants || [];
      if (Array.isArray(participantIds)) {
        for (const userId of participantIds) {
          await enqueueJob({
            templeId,
            queue: 'notifications',
            jobType: 'SEND_MEETING_INVITE_NOTIFICATION',
            payloadJson: {
              meetingId: entityId,
              recipientUserId: userId,
              title: payload.title || 'Temple Meeting',
              date: payload.date || '',
              time: payload.time || '',
              duration: payload.durationMinutes || 45,
              platform: payload.meetingPlatform || (payload.isZoomMeeting ? 'Zoom' : 'Google Meet'),
              joinUrl: payload.zoomJoinUrl || payload.googleMeetUrl || payload.joinUrl || '',
              passcode: payload.zoomPassword || payload.passcode || '',
              agenda: payload.agenda || '',
            },
            idempotencyKey: `meeting_invite:${entityId}:${userId}`,
          });
        }
      }
      break;
    }

    // 5. Approval Submitted
    case 'APPROVAL_SUBMITTED': {
      if (payload.approverUserId) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_APPROVAL_SUBMITTED_NOTIFICATION',
          payloadJson: {
            approvalRequestId: entityId,
            recipientUserId: payload.approverUserId,
            title: payload.title || 'New Approval Request',
            requesterName: payload.requesterName || 'Devotee',
            approvalType: payload.approvalType || 'general',
            amount: payload.amount || 0,
          },
          idempotencyKey: `approval_sub:${entityId}:${payload.approverUserId}`,
        });
      }
      break;
    }

    // 6. Approval Result (Approved / Rejected)
    case 'APPROVAL_APPROVED':
    case 'APPROVAL_REJECTED': {
      if (payload.requesterId) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_APPROVAL_RESULT_NOTIFICATION',
          payloadJson: {
            approvalRequestId: entityId,
            recipientUserId: payload.requesterId,
            title: payload.title || 'Approval Request',
            status: eventType === 'APPROVAL_APPROVED' ? 'APPROVED' : 'REJECTED',
            reviewerName: payload.reviewerName || 'Administrator',
            comments: payload.comments || '',
          },
          idempotencyKey: `approval_res:${entityId}:${eventType}`,
        });
      }
      break;
    }

    // 7. User Created (Welcome Email & WhatsApp)
    case 'USER_CREATED': {
      if (entityId) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_USER_WELCOME_NOTIFICATION',
          payloadJson: {
            userId: entityId,
            recipientUserId: entityId,
            name: payload.name || 'Respected Devotee',
            role: payload.role || 'volunteer',
            email: payload.email || '',
            phone: payload.phone || '',
          },
          idempotencyKey: `user_welcome:${entityId}`,
        });
      }
      break;
    }

    // 8. Announcement Created / Broadcast
    case 'ANNOUNCEMENT_CREATED':
    case 'ANNOUNCEMENT_PUBLISHED': {
      // Broadcast to target roles or all temple users
      const allTempleUsers = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.templeId, templeId));
      const targetAudience = payload.targetAudience || 'ALL';
      const targetRoles: string[] = Array.isArray(payload.targetRoles) ? payload.targetRoles : [];

      for (const u of allTempleUsers) {
        const matches = targetAudience === 'ALL' || (targetRoles.length > 0 && targetRoles.includes(u.role));
        if (matches) {
          await enqueueJob({
            templeId,
            queue: 'notifications',
            jobType: 'SEND_ANNOUNCEMENT_BROADCAST_NOTIFICATION',
            payloadJson: {
              announcementId: entityId,
              recipientUserId: u.id,
              title: payload.title || 'Important Mandir Announcement',
              content: payload.content || '',
              priority: payload.priority || 'normal',
            },
            idempotencyKey: `announcement:${entityId}:${u.id}`,
          });
        }
      }
      break;
    }

    // 9. Feedback Submitted (Notify Admins)
    case 'FEEDBACK_SUBMITTED': {
      const adminUsers = await db.select({ id: users.id }).from(users).where(
        and(eq(users.templeId, templeId), or(eq(users.role, 'super_admin'), eq(users.role, 'temple_admin')))
      );

      for (const admin of adminUsers) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_FEEDBACK_ADMIN_NOTIFICATION',
          payloadJson: {
            feedbackId: entityId,
            recipientUserId: admin.id,
            subject: payload.subject || payload.title || 'Devotee Feedback',
            category: payload.category || 'General',
            rating: payload.rating || 5,
            submittedByName: payload.submittedByName || 'Anonymous Devotee',
          },
          idempotencyKey: `feedback_admin:${entityId}:${admin.id}`,
        });
      }
      break;
    }

    // 10. Secretary Assigned
    case 'SECRETARY_ASSIGNED': {
      if (payload.secretaryUserId) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_SECRETARY_ASSIGNED_NOTIFICATION',
          payloadJson: {
            secretaryId: entityId,
            recipientUserId: payload.secretaryUserId,
            principalName: payload.principalName || 'Temple Leader',
            principalRole: payload.principalRole || 'temple_admin',
            permissionsCount: Array.isArray(payload.delegatedPermissions) ? payload.delegatedPermissions.length : 0,
          },
          idempotencyKey: `secretary_assigned:${entityId}`,
        });
      }
      break;
    }

    // 11. Seva / Donation Confirmation
    case 'DONATION_CONFIRMED':
    case 'SEVA_BOOKED': {
      if (payload.userId) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_SEVA_CONFIRMATION_NOTIFICATION',
          payloadJson: {
            entityId,
            recipientUserId: payload.userId,
            title: payload.title || (eventType === 'DONATION_CONFIRMED' ? 'Donation Received with Gratitude' : 'Seva Booking Confirmed'),
            amount: payload.amount,
            date: payload.date || new Date().toLocaleDateString(),
          },
          idempotencyKey: `confirmation:${entityId}:${payload.userId}`,
        });
      }
      break;
    }

    // 12. Report Generated
    case 'REPORT_GENERATED': {
      if (payload.recipientUserId) {
        await enqueueJob({
          templeId,
          queue: 'notifications',
          jobType: 'SEND_REPORT_NOTIFICATION',
          payloadJson: {
            reportId: entityId,
            recipientUserId: payload.recipientUserId,
            reportType: payload.reportType || 'Weekly Seva Summary',
            summary: payload.summary || '',
          },
          idempotencyKey: `report:${entityId}:${payload.recipientUserId}`,
        });
      }
      break;
    }

    default:
      console.log(`[Workflow Engine] Handled default built-in event ${eventType}`);
      break;
  }
}

/**
 * 5. Reusable Approval Workflow Engine
 */
export async function createApprovalRequest(params: {
  templeId: string;
  requesterId: string;
  approvalType: 'leave' | 'expense' | 'seva' | 'task' | 'department' | 'user_role' | 'announcement' | 'donation' | string;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  amount?: number;
  parentUserId?: string;
  approverUserId?: string;
  approverRoleId?: string;
  levels?: Array<{ approverRoleId?: string; approverUserId?: string }>;
  metadata?: Record<string, any>;
}) {
  const {
    templeId,
    requesterId,
    approvalType,
    title,
    description = '',
    entityType = '',
    entityId = '',
    amount = 0,
    parentUserId,
    approverUserId,
    approverRoleId,
    levels,
    metadata = {}
  } = params;

  // 1. Fetch Requester details from DB
  const [requester] = await db.select().from(users).where(eq(users.id, requesterId)).limit(1);
  const requesterRole = requester?.role ? normalizeRole(requester.role) : 'member';
  const requesterName = requester?.name || requester?.displayName || 'Devotee';

  // 2. Resolve Direct Parent Approver (Requester CANNOT be their own approver)
  let targetParentUserId = parentUserId || approverUserId || requester?.parentId || undefined;
  if (targetParentUserId === requesterId) {
    targetParentUserId = undefined;
  }
  let targetParentUser: any = null;

  if (targetParentUserId && isValidUuid(targetParentUserId)) {
    const parentCheck = await db.select().from(users).where(and(eq(users.id, targetParentUserId), ne(users.id, requesterId))).limit(1);
    if (parentCheck.length > 0) {
      targetParentUser = parentCheck[0];
    }
  }

  // If requester didn't have parentId set in DB, but a valid parent was specified, save it for future requests
  if (targetParentUser && requester && !requester.parentId && targetParentUser.id !== requester.id) {
    await db.update(users).set({ parentId: targetParentUser.id, updatedAt: new Date() }).where(eq(users.id, requester.id)).catch(() => {});
  }

  // If no parent found yet, find candidates matching required parent role for the user's role in the temple
  if (!targetParentUser && requester) {
    const reqParentRole = getRequiredParentRole(requesterRole);
    if (reqParentRole) {
      const candidates = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.templeId, templeId),
            eq(users.role, reqParentRole),
            ne(users.id, requesterId)
          )
        )
        .limit(1);
      if (candidates.length > 0) {
        targetParentUser = candidates[0];
        targetParentUserId = targetParentUser.id;
        if (!requester.parentId && targetParentUser.id !== requester.id) {
          await db.update(users).set({ parentId: targetParentUser.id, updatedAt: new Date() }).where(eq(users.id, requester.id)).catch(() => {});
        }
      }
    }
  }

  // If still no parent found (e.g. top administrator or single-user tenant), fallback to temple_admin or super_admin
  if (!targetParentUser) {
    const adminCandidates = await db
      .select()
      .from(users)
      .where(and(eq(users.templeId, templeId), ne(users.id, requesterId), or(eq(users.role, 'temple_admin'), eq(users.role, 'super_admin'))))
      .limit(1);
    if (adminCandidates.length > 0) {
      targetParentUser = adminCandidates[0];
      targetParentUserId = targetParentUser.id;
    }
  }

  const finalApproverUserId = targetParentUser ? targetParentUser.id : (approverUserId || undefined);
  const finalApproverRole = targetParentUser ? normalizeRole(targetParentUser.role) : (approverRoleId || (requesterRole === 'super_admin' ? 'super_admin' : 'temple_admin'));
  const parentName = targetParentUser ? (targetParentUser.name || targetParentUser.displayName || 'Parent Supervisor') : '';

  let approvalLevels = levels || [];
  if (approvalLevels.length === 0) {
    // Single-Level Parent Approval
    approvalLevels = [
      {
        approverRoleId: finalApproverRole,
        approverUserId: finalApproverUserId,
      }
    ];
  }

  const enrichedMetadata = {
    ...metadata,
    parentUserId: finalApproverUserId,
    parentName,
    parentRole: finalApproverRole,
    requesterName,
    requesterRole,
  };

  const [request] = await db
    .insert(approvalRequests)
    .values({
      templeId,
      requesterId,
      approvalType,
      title,
      description,
      entityType,
      entityId,
      amount: Math.round(Number(amount) || 0),
      currentLevel: 1,
      totalLevels: approvalLevels.length,
      status: 'PENDING',
      metadataJson: enrichedMetadata,
    })
    .returning();

  // Create steps
  for (let idx = 0; idx < approvalLevels.length; idx++) {
    const lvl = approvalLevels[idx];
    await db.insert(approvalSteps).values({
      approvalRequestId: request.id,
      level: idx + 1,
      approverRoleId: lvl.approverRoleId || finalApproverRole,
      approverUserId: lvl.approverUserId || finalApproverUserId || undefined,
      status: 'PENDING',
    });
  }

  // Create in-app notification for the parent / approver
  if (finalApproverUserId) {
    await db.insert(notifications).values({
      templeId,
      recipientUserId: finalApproverUserId,
      type: 'approval_request',
      title: `Approval Request from ${requesterName}`,
      message: `${requesterName} submitted a ${approvalType} request: "${title}". Please review and authorize.`,
      linkId: request.id,
      read: false,
    }).catch((err) => console.warn('Failed to insert parent notification:', err));
  }

  // Emit event
  await emitWorkflowEvent({
    templeId,
    eventType: 'APPROVAL_SUBMITTED',
    entityType: 'approval',
    entityId: request.id,
    payload: {
      requesterId,
      requesterName,
      approverUserId: finalApproverUserId,
      approverName: parentName,
      title,
      approvalType,
      amount,
    },
    actorUserId: requesterId,
  });

  return {
    ...request,
    requesterName,
    requesterRole,
    parentName,
    parentRole: finalApproverRole,
    parentUserId: finalApproverUserId,
  };
}

/**
 * 6. Asynchronous Background Queue Worker & Job Processing
 */
export async function processQueueJobs(
  emailSenderFunc?: (tenantId: string, opts: any, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>,
  whatsappSenderFunc?: (tenantId: string, phone: string, text: string, userId?: string) => Promise<{ success: boolean; message: string; messageId?: string }>
) {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  const emailFn = emailSenderFunc || globalEmailSender;
  const waFn = whatsappSenderFunc || globalWhatsAppSender;

  try {
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return;
    }

    const now = new Date();
    // Select pending jobs due for execution
    const pendingJobs = await db
      .select()
      .from(workflowJobs)
      .where(and(eq(workflowJobs.status, 'PENDING'), lte(workflowJobs.scheduledFor, now)))
      .limit(25);

    for (const job of pendingJobs) {
      // Lock job
      await db
        .update(workflowJobs)
        .set({ status: 'PROCESSING', lockedAt: new Date(), attempts: (job.attempts || 0) + 1 })
        .where(eq(workflowJobs.id, job.id));

      try {
        const payload = (job.payloadJson as any) || {};

        if (job.jobType.startsWith('SEND_') && payload.recipientUserId) {
          let title = 'System Notification';
          let message = 'You have an update in SEVYA.';
          let category: any = 'system';
          let emailSubject = '';
          let emailBodyHtml = '';
          let whatsAppMessage = '';

          // 1. Task Assigned
          if (job.jobType === 'SEND_TASK_ASSIGNED_NOTIFICATION') {
            category = 'tasks';
            title = `New Seva Task Assigned: ${payload.taskTitle}`;
            message = `You have been assigned the task "${payload.taskTitle}". Priority: ${payload.priority.toUpperCase()}, Due: ${payload.dueDate || 'N/A'}.`;
            emailSubject = `[Sevya Task] New Assignment: ${payload.taskTitle}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'New Task Assignment',
              subtitle: 'A new Seva task has been delegated to you',
              content: `Hare Krishna! You have been assigned a new task on SEVYA. Please review the details below and ensure timely completion with devotion.`,
              details: [
                { label: 'Task Title', value: payload.taskTitle },
                { label: 'Department', value: payload.departmentName || 'General Seva' },
                { label: 'Priority', value: (payload.priority || 'Normal').toUpperCase() },
                { label: 'Due Date', value: payload.dueDate || 'Open Timeline' },
                { label: 'Description', value: payload.description || 'No additional instructions.' },
              ],
              ctaText: 'View Task in Sevya',
              ctaUrl: `/tasks`,
            });
            whatsAppMessage = `🙏 *Hari Om!*\n\nYou have been assigned a new task: *${payload.taskTitle}*\n📌 *Priority:* ${payload.priority.toUpperCase()}\n📅 *Due Date:* ${payload.dueDate || 'Open'}\n\nPlease review and submit proof on SEVYA portal. Thank you for your devoted service!`;
          }

          // 2. Task Completed
          else if (job.jobType === 'SEND_TASK_COMPLETED_NOTIFICATION') {
            category = 'tasks';
            title = `Task Completed: ${payload.taskTitle}`;
            message = `Task "${payload.taskTitle}" has been completed by ${payload.completedByName}.`;
            emailSubject = `[Sevya Task] Completed: ${payload.taskTitle}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'Task Successfully Completed',
              subtitle: `Completed by ${payload.completedByName}`,
              content: `The task "${payload.taskTitle}" has been marked completed. You can review the attached proof and close the item.`,
              details: [
                { label: 'Task Title', value: payload.taskTitle },
                { label: 'Completed By', value: payload.completedByName },
                { label: 'Timestamp', value: new Date().toLocaleString() },
              ],
              ctaText: 'Inspect Task Proof',
              ctaUrl: `/tasks`,
            });
            whatsAppMessage = `✅ *Task Completed!*\n\nTask *${payload.taskTitle}* has been submitted by *${payload.completedByName}*.\nReview proof on SEVYA portal.`;
          }

          // 3. Task Overdue / Deadline Reminder
          else if (job.jobType === 'SEND_TASK_OVERDUE_NOTIFICATION') {
            category = 'tasks';
            title = `⚠️ Seva Reminder: ${payload.taskTitle}`;
            message = `Gentle reminder: Task "${payload.taskTitle}" is scheduled for completion (Due: ${payload.dueDate}).`;
            emailSubject = `[Sevya Alert] Deadline Reminder: ${payload.taskTitle}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'Urgent Task Reminder',
              subtitle: `Due Date: ${payload.dueDate}`,
              content: `Hari Om! This is a gentle reminder that task "${payload.taskTitle}" requires your immediate attention. Please update progress or submit proof.`,
              details: [
                { label: 'Task Title', value: payload.taskTitle },
                { label: 'Due Date', value: payload.dueDate },
                { label: 'Priority', value: (payload.priority || 'High').toUpperCase() },
              ],
              ctaText: 'Update Task Now',
              ctaUrl: `/tasks`,
            });
            whatsAppMessage = `⏰ *Seva Task Reminder!*\n\nGentle reminder for task: *${payload.taskTitle}*\n📅 *Due Date:* ${payload.dueDate}\n\nPlease submit completion proof on SEVYA. Thank you! 🙏`;
          }

          // 4. Meeting Invitation
          else if (job.jobType === 'SEND_MEETING_INVITE_NOTIFICATION') {
            category = 'meetings';
            title = `Meeting Invitation: ${payload.title}`;
            message = `You are invited to "${payload.title}" on ${payload.date} at ${payload.time}. Platform: ${payload.platform}.`;
            emailSubject = `[Sevya Meeting] Invitation: ${payload.title} (${payload.date})`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'Mandir Meeting Invitation',
              subtitle: `${payload.date} at ${payload.time}`,
              content: `You have been invited to participate in the scheduled temple meeting "${payload.title}". Please find the conference details and link below.`,
              details: [
                { label: 'Meeting Topic', value: payload.title },
                { label: 'Date & Time', value: `${payload.date} @ ${payload.time}` },
                { label: 'Platform', value: payload.platform || 'Online Video' },
                { label: 'Join Link', value: payload.joinUrl ? `<a href="${payload.joinUrl}">${payload.joinUrl}</a>` : 'Available on Portal' },
                { label: 'Passcode', value: payload.passcode || 'None' },
                { label: 'Agenda', value: payload.agenda || 'General Coordination' },
              ],
              ctaText: 'Join Conference',
              ctaUrl: payload.joinUrl || '/meetings',
            });
            whatsAppMessage = `📹 *Meeting Invitation: ${payload.title}*\n\n📅 *Date:* ${payload.date}\n⏰ *Time:* ${payload.time}\n🌐 *Platform:* ${payload.platform}\n🔗 *Join Link:* ${payload.joinUrl || 'Check SEVYA Portal'}\n${payload.passcode ? `🔑 *Passcode:* ${payload.passcode}\n` : ''}\nSee you at the sync! 🙏`;
          }

          // 5. Approval Submitted
          else if (job.jobType === 'SEND_APPROVAL_SUBMITTED_NOTIFICATION') {
            category = 'approvals';
            title = `Approval Request: ${payload.title}`;
            message = `New ${payload.approvalType} approval request "${payload.title}" submitted by ${payload.requesterName}.`;
            emailSubject = `[Sevya Approval] Action Required: ${payload.title}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'New Approval Request',
              subtitle: `Submitted by ${payload.requesterName}`,
              content: `A new request requiring your authorization has been submitted on SEVYA. Please review and provide your decision.`,
              details: [
                { label: 'Request Title', value: payload.title },
                { label: 'Category', value: (payload.approvalType || 'General').toUpperCase() },
                { label: 'Submitted By', value: payload.requesterName },
                { label: 'Amount', value: payload.amount ? `₹${payload.amount}` : 'N/A' },
              ],
              ctaText: 'Review & Authorize',
              ctaUrl: `/approvals`,
            });
            whatsAppMessage = `📝 *New Approval Request!*\n\n*${payload.title}*\n👤 *Requester:* ${payload.requesterName}\n📌 *Type:* ${payload.approvalType.toUpperCase()}\n${payload.amount ? `💰 *Amount:* ₹${payload.amount}\n` : ''}\nPlease review on SEVYA.`;
          }

          // 6. Approval Result
          else if (job.jobType === 'SEND_APPROVAL_RESULT_NOTIFICATION') {
            category = 'approvals';
            const isApproved = payload.status === 'APPROVED';
            title = `Approval ${payload.status}: ${payload.title}`;
            message = `Your request "${payload.title}" was ${payload.status.toLowerCase()} by ${payload.reviewerName}.`;
            emailSubject = `[Sevya Approval] Request ${payload.status}: ${payload.title}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: `Request ${payload.status}`,
              subtitle: `Reviewed by ${payload.reviewerName}`,
              content: `Your approval request "${payload.title}" has been ${payload.status.toLowerCase()}.`,
              details: [
                { label: 'Request Title', value: payload.title },
                { label: 'Decision', value: payload.status },
                { label: 'Reviewer', value: payload.reviewerName },
                { label: 'Remarks', value: payload.comments || 'No remarks provided.' },
              ],
              ctaText: 'View Approval Status',
              ctaUrl: `/approvals`,
            });
            whatsAppMessage = `${isApproved ? '✅' : '❌'} *Approval Status: ${payload.status}*\n\nRequest: *${payload.title}*\nReviewer: *${payload.reviewerName}*\n${payload.comments ? `Remarks: ${payload.comments}\n` : ''}`;
          }

          // 7. Welcome User
          else if (job.jobType === 'SEND_USER_WELCOME_NOTIFICATION') {
            category = 'system';
            title = `Welcome to SEVYA: ${payload.name}`;
            message = `Welcome to SEVYA Temple Management System. Your account has been registered with role "${payload.role}".`;
            emailSubject = `Welcome to SEVYA Temple Management System! 🙏`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'Welcome to SEVYA',
              subtitle: `Dedicated Seva & Operations Management`,
              greeting: `Hari Om ${payload.name},`,
              content: `Welcome to SEVYA! Your user account has been successfully provisioned. You can now access daily seva schedules, participate in committee meetings, and coordinate tasks smoothly.`,
              details: [
                { label: 'Devotee Name', value: payload.name },
                { label: 'Assigned Role', value: (payload.role || 'Volunteer').replace('_', ' ').toUpperCase() },
                { label: 'Registered Email', value: payload.email || 'N/A' },
                { label: 'Mobile Number', value: payload.phone || 'N/A' },
              ],
              ctaText: 'Access SEVYA Portal',
              ctaUrl: `/dashboard`,
            });
            whatsAppMessage = `🙏 *Welcome to SEVYA!*\n\nHari Om *${payload.name}*,\nYour account is now active on SEVYA as *${(payload.role || 'Volunteer').replace('_', ' ').toUpperCase()}*.\n\nMay your dedicated seva be blessed!`;
          }

          // 8. Announcement Broadcast
          else if (job.jobType === 'SEND_ANNOUNCEMENT_BROADCAST_NOTIFICATION') {
            category = 'announcements';
            title = `Mandir Notice: ${payload.title}`;
            message = payload.content || payload.title;
            emailSubject = `[Notice] ${payload.title}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: payload.title,
              subtitle: `Official Mandir Notice (${payload.priority.toUpperCase()} Priority)`,
              content: payload.content || '',
              details: [
                { label: 'Priority', value: payload.priority.toUpperCase() },
                { label: 'Date', value: new Date().toLocaleDateString() },
              ],
              ctaText: 'Read Notice in App',
              ctaUrl: `/announcements`,
            });
            whatsAppMessage = `📢 *Mandir Announcement: ${payload.title}*\n\n${payload.content}\n\nSEVYA Temple Management 🙏`;
          }

          // 9. Feedback Admin
          else if (job.jobType === 'SEND_FEEDBACK_ADMIN_NOTIFICATION') {
            category = 'feedback';
            title = `New Feedback: ${payload.subject}`;
            message = `New feedback in category "${payload.category}" submitted by ${payload.submittedByName} (Rating: ${payload.rating}/5).`;
            emailSubject = `[Sevya Feedback] ${payload.subject}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'New Devotee Feedback',
              subtitle: `Category: ${payload.category} | Rating: ${payload.rating}/5`,
              content: `A new feedback submission has been received. Please review the comments and take necessary follow-up actions.`,
              details: [
                { label: 'Subject', value: payload.subject },
                { label: 'Category', value: payload.category },
                { label: 'Rating', value: `${payload.rating} / 5 Stars` },
                { label: 'Submitted By', value: payload.submittedByName },
              ],
              ctaText: 'Open Feedback Desk',
              ctaUrl: `/feedback`,
            });
            whatsAppMessage = `📩 *New Feedback Received*\n\n*${payload.subject}*\nCategory: ${payload.category} | Rating: ${payload.rating}/5\nSubmitted by: ${payload.submittedByName}`;
          }

          // 10. Secretary Assigned
          else if (job.jobType === 'SEND_SECRETARY_ASSIGNED_NOTIFICATION') {
            category = 'system';
            title = `Appointed Secretary for ${payload.principalName}`;
            message = `You have been appointed as Secretary for ${payload.principalName} with ${payload.permissionsCount} delegated permissions.`;
            emailSubject = `[Sevya Delegation] Secretary Appointment for ${payload.principalName}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'Secretary Delegation Granted',
              subtitle: `Principal: ${payload.principalName} (${payload.principalRole})`,
              content: `You have been officially appointed as Secretary for ${payload.principalName}. You now have delegated administrative authority to assist with tasks, schedules, and approvals.`,
              details: [
                { label: 'Principal Leader', value: payload.principalName },
                { label: 'Role', value: payload.principalRole },
                { label: 'Delegated Responsibilities', value: `${payload.permissionsCount} Active Modules` },
              ],
              ctaText: 'Access Delegated Workspace',
              ctaUrl: `/secretaries`,
            });
            whatsAppMessage = `📋 *Secretary Appointment!*\n\nYou have been appointed as Secretary for *${payload.principalName}* (${payload.principalRole}).\nYou have been granted delegated responsibilities on SEVYA. 🙏`;
          }

          // 11. Seva / Donation Confirmation
          else if (job.jobType === 'SEND_SEVA_CONFIRMATION_NOTIFICATION') {
            category = 'sevas';
            title = payload.title || 'Seva Booking Confirmation';
            message = `Your seva booking "${payload.title}" has been confirmed for ${payload.date}.`;
            emailSubject = `[Sevya Confirmation] ${payload.title}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: 'Seva Confirmation',
              subtitle: 'Confirmed with Gratitude',
              content: `Hare Krishna! Your booking "${payload.title}" has been successfully recorded in the temple records.`,
              details: [
                { label: 'Seva Title', value: payload.title },
                { label: 'Date', value: payload.date },
                { label: 'Amount', value: payload.amount ? `₹${payload.amount}` : 'Devotional Seva' },
              ],
              ctaText: 'View Seva Schedule',
              ctaUrl: `/sevas`,
            });
            whatsAppMessage = `🪔 *Seva Confirmation!*\n\n*${payload.title}* has been confirmed for *${payload.date}*.\nMay Bhagwan bless you and your family! 🙏`;
          }

          // 12. Report Notification
          else if (job.jobType === 'SEND_REPORT_NOTIFICATION') {
            category = 'reports';
            title = `Report: ${payload.reportType}`;
            message = `Your ${payload.reportType} is ready for review.`;
            emailSubject = `[Sevya Report] ${payload.reportType}`;
            emailBodyHtml = buildHtmlEmail({
              title: emailSubject,
              heading: payload.reportType,
              subtitle: `Generated on ${new Date().toLocaleDateString()}`,
              content: payload.summary || 'Your requested temple analytics and workload report has been prepared.',
              details: [
                { label: 'Report Type', value: payload.reportType },
                { label: 'Generation Date', value: new Date().toLocaleString() },
              ],
              ctaText: 'Download Full Report',
              ctaUrl: `/reports`,
            });
            whatsAppMessage = `📊 *${payload.reportType} Generated*\n\nYour analytics report is ready on SEVYA.`;
          }

          await dispatchMultiChannelNotification(
            {
              templeId: job.templeId,
              recipientUserId: payload.recipientUserId,
              category,
              title,
              message,
              linkId: payload.taskId || payload.meetingId || payload.approvalRequestId || payload.announcementId || payload.feedbackId,
              emailData: {
                subject: emailSubject || title,
                body: emailBodyHtml || message,
                isHtml: true,
              },
              whatsAppData: {
                text: whatsAppMessage || `${title}\n${message}`,
              },
            },
            emailFn || undefined,
            waFn || undefined
          );
        }

        // Mark job COMPLETED
        await db
          .update(workflowJobs)
          .set({ status: 'COMPLETED', updatedAt: new Date() })
          .where(eq(workflowJobs.id, job.id));
      } catch (err: any) {
        console.error(`[Job Processing Failed] Job ID ${job.id}:`, err);
        const nextAttempts = (job.attempts || 0) + 1;
        const max = job.maxAttempts || 3;

        if (nextAttempts >= max) {
          await db
            .update(workflowJobs)
            .set({ status: 'DEAD_LETTER', lastError: err.message || 'Job execution failed', updatedAt: new Date() })
            .where(eq(workflowJobs.id, job.id));
        } else {
          // Retry with exponential backoff
          const backoffMs = Math.pow(2, nextAttempts) * 5000;
          await db
            .update(workflowJobs)
            .set({
              status: 'PENDING',
              scheduledFor: new Date(Date.now() + backoffMs),
              lastError: err.message || 'Job execution failed, retrying...',
              updatedAt: new Date(),
            })
            .where(eq(workflowJobs.id, job.id));
        }
      }
    }
  } catch (err: any) {
    if (isConnectionError(err) || (err?.message && (err.message.includes('timeout') || err.message.includes('terminated')))) {
      // Re-trigger connection verification / fallback quietly
      checkDatabaseConnection().catch(() => {});
    } else {
      console.warn('[processQueueJobs Worker]:', err?.message || err);
    }
  } finally {
    isProcessingQueue = false;
  }
}

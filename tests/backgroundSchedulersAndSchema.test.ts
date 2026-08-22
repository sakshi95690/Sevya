import test from 'node:test';
import assert from 'node:assert/strict';
import { db, checkDatabaseConnection } from '../src/db';
import {
  workflowJobs,
  announcements,
  recurringTaskTemplates,
  tasks,
  temples,
  users,
  secretaries,
  workflowEvents,
  workflows,
  workflowExecutions,
  notificationPreferences,
  webPushSubscriptions,
  approvalRequests,
  approvalSteps,
  integrationSyncs,
  feedbacks,
  donations,
  webhookEvents,
  emailOtps,
} from '../src/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { processRecurringTaskTemplates } from '../src/services/recurringTaskScheduler';

test('Background Schedulers and Full Schema Verification', async (t) => {
  await checkDatabaseConnection();

  // Setup a test temple and user
  const [temple] = await db.insert(temples).values({
    name: 'Scheduler Test Temple',
  }).returning();
  const testTempleId = temple.id;

  const [user] = await db.insert(users).values({
    templeId: testTempleId,
    name: 'Scheduler Admin',
    email: `admin_${Date.now()}@example.com`,
    role: 'super_admin',
  }).returning();
  const testUserId = user.id;

  await t.test('workflow_jobs queue query operates cleanly without aborting', async () => {
    // Insert a test job
    const [job] = await db.insert(workflowJobs).values({
      templeId: testTempleId,
      queue: 'default',
      jobType: 'SEND_EMAIL',
      payloadJson: { recipient: 'test@example.com', body: 'Hello' },
      status: 'PENDING',
      scheduledFor: new Date(),
    }).returning();

    assert.ok(job);
    assert.ok(job.id);

    // Run the exact query from processQueueJobs
    const jobs = await db
      .select()
      .from(workflowJobs)
      .where(
        and(
          eq(workflowJobs.status, 'PENDING'),
          lte(workflowJobs.scheduledFor, new Date())
        )
      )
      .limit(10);

    assert.ok(Array.isArray(jobs));
    assert.ok(jobs.length > 0);
    assert.ok(jobs.some((j) => j.id === job.id));
  });

  await t.test('scheduled announcements query operates cleanly without aborting', async () => {
    // Insert a scheduled announcement
    const [announcement] = await db.insert(announcements).values({
      templeId: testTempleId,
      title: 'Scheduled Festival Notice',
      content: 'Festival celebrations tomorrow at 7 AM',
      category: 'Festival & Event',
      priority: 'high',
      targetAudience: 'ALL',
      pinned: true,
      published: false,
      scheduledAt: new Date(Date.now() - 1000),
      notified: false,
      createdBy: testUserId,
    }).returning();

    assert.ok(announcement);
    assert.ok(announcement.id);

    // Run the exact query from processScheduledAnnouncements
    const scheduled = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.published, false),
          lte(announcements.scheduledAt, new Date())
        )
      );

    assert.ok(Array.isArray(scheduled));
    assert.ok(scheduled.length > 0);
    assert.ok(scheduled.some((a) => a.id === announcement.id));
  });

  await t.test('processRecurringTaskTemplates generates tasks without aborting', async () => {
    // Insert a recurring task template
    const [template] = await db.insert(recurringTaskTemplates).values({
      templeId: testTempleId,
      title: 'Daily Morning Temple Cleaning',
      description: 'Clean the main courtyard',
      frequency: 'Daily',
      dueTime: '06:00 AM',
      nextRunAt: new Date(Date.now() - 5000),
      active: true,
      requiresProof: true,
      expectedProofType: 'Photo',
      createdBy: testUserId,
    }).returning();

    assert.ok(template);

    // Execute recurring task processor
    await processRecurringTaskTemplates();

    // Verify task generation
    const generatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.recurringTemplateId, template.id));

    assert.ok(generatedTasks.length > 0);
    assert.equal(generatedTasks[0].title, 'Daily Morning Temple Cleaning');
  });

  await t.test('all ancillary workflow and administrative tables operate cleanly', async () => {
    // Secretaries
    const [sec] = await db.insert(secretaries).values({
      templeId: testTempleId,
      principalUserId: testUserId,
      secretaryUserId: testUserId,
      delegatedPermissions: ['tasks', 'meetings'],
      status: 'active',
    }).returning();
    assert.ok(sec.id);

    // Workflow Events
    const [wEvent] = await db.insert(workflowEvents).values({
      templeId: testTempleId,
      eventType: 'TASK_CREATED',
      entityType: 'task',
      entityId: 'test-123',
      status: 'PENDING',
    }).returning();
    assert.ok(wEvent.id);

    // Workflows
    const [wf] = await db.insert(workflows).values({
      templeId: testTempleId,
      name: 'Auto Assign Workflow',
      triggerEvent: 'TASK_CREATED',
      active: true,
    }).returning();
    assert.ok(wf.id);

    // Workflow Executions
    const [wfExec] = await db.insert(workflowExecutions).values({
      templeId: testTempleId,
      workflowId: wf.id,
      eventId: wEvent.id,
      status: 'SUCCESS',
    }).returning();
    assert.ok(wfExec.id);

    // Notification Preferences
    const [notifPref] = await db.insert(notificationPreferences).values({
      templeId: testTempleId,
      userId: testUserId,
      category: 'tasks',
      emailEnabled: true,
      pushEnabled: true,
    }).returning();
    assert.ok(notifPref.id);

    // Web Push Subscriptions
    const [pushSub] = await db.insert(webPushSubscriptions).values({
      templeId: testTempleId,
      userId: testUserId,
      endpoint: 'https://fcm.googleapis.com/fcm/send/12345',
      keysJson: { p256dh: 'test', auth: 'test' },
      active: true,
    }).returning();
    assert.ok(pushSub.id);

    // Approval Requests & Steps
    const [approval] = await db.insert(approvalRequests).values({
      templeId: testTempleId,
      requesterId: testUserId,
      approvalType: 'expense',
      title: 'Flower purchase approval',
      amount: 1500,
      status: 'PENDING',
    }).returning();
    assert.ok(approval.id);

    const [approvalStep] = await db.insert(approvalSteps).values({
      approvalRequestId: approval.id,
      level: 1,
      approverUserId: testUserId,
      status: 'PENDING',
    }).returning();
    assert.ok(approvalStep.id);

    // Integration Syncs
    const [syncLog] = await db.insert(integrationSyncs).values({
      templeId: testTempleId,
      provider: 'zoom',
      entityType: 'meeting',
      syncDirection: 'OUTBOUND',
      status: 'SUCCESS',
      itemsSynced: 1,
    }).returning();
    assert.ok(syncLog.id);

    // Feedbacks
    const [fb] = await db.insert(feedbacks).values({
      templeId: testTempleId,
      userId: testUserId,
      category: 'General',
      subject: 'Great seva organization',
      message: 'The prasadam distribution went smoothly.',
      status: 'RESOLVED',
    }).returning();
    assert.ok(fb.id);

    // Donations
    const [donation] = await db.insert(donations).values({
      templeId: testTempleId,
      donorName: 'Devotee Family',
      amount: 5100,
      category: 'Annadanam Seva',
      receiptNo: 'REC-TEST-001',
    }).returning();
    assert.ok(donation.id);

    // Webhook Events
    const [webhook] = await db.insert(webhookEvents).values({
      templeId: testTempleId,
      provider: 'payment',
      eventType: 'payment.success',
      payloadJson: { id: 'pay_123', amount: 5100 },
      status: 'RECEIVED',
    }).returning();
    assert.ok(webhook.id);

    // Email OTPs
    const [otp] = await db.insert(emailOtps).values({
      email: 'test@example.com',
      otpHash: 'hashed_otp_value',
      salt: 'random_salt',
      expiresAt: new Date(Date.now() + 600000),
    }).returning();
    assert.ok(otp.id);
  });
});

import { db, checkDatabaseConnection } from '../db/index.ts';
import { recurringTaskTemplates, tasks, auditLogs } from '../db/schema.ts';
import { eq, lte, and, or, like } from 'drizzle-orm';

export async function processRecurringTaskTemplates() {
  let generatedCount = 0;
  let processedTemplatesCount = 0;

  try {
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return { generatedCount: 0, processedTemplatesCount: 0 };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Find active templates due for execution
    const dueTemplates = await db
      .select()
      .from(recurringTaskTemplates)
      .where(
        and(
          eq(recurringTaskTemplates.active, true),
          lte(recurringTaskTemplates.nextRunAt, now)
        )
      );

    processedTemplatesCount = dueTemplates.length;

    for (const tmpl of dueTemplates) {
      // 1. Check Date Bounds (Start Date & End Date)
      if (tmpl.startDate && todayStr < tmpl.startDate) {
        // Start date has not been reached yet
        continue;
      }

      if (tmpl.endDate && todayStr > tmpl.endDate) {
        // Template has expired, mark inactive
        await db
          .update(recurringTaskTemplates)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(recurringTaskTemplates.id, tmpl.id));
        continue;
      }

      // Calculate next run date
      const nextRun = new Date(tmpl.nextRunAt);
      if (tmpl.frequency === 'DAILY') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (tmpl.frequency === 'WEEKLY') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (tmpl.frequency === 'MONTHLY') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      } else {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      // 2. Strict Uniqueness / Duplicate Check
      // Ensure no task instance exists for this template AND today's date
      const existing = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.templeId, tmpl.templeId),
            eq(tasks.dueDate, todayStr),
            or(
              eq(tasks.recurringTemplateId, tmpl.id),
              like(tasks.title, `${tmpl.title}%`)
            )
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Task instance already generated for today; update nextRunAt to prevent endless retry loop
        await db
          .update(recurringTaskTemplates)
          .set({
            nextRunAt: nextRun,
            updatedAt: new Date(),
          })
          .where(eq(recurringTaskTemplates.id, tmpl.id));
        continue;
      }

      // 3. Create Task Instance in DB
      const [newTask] = await db
        .insert(tasks)
        .values({
          templeId: tmpl.templeId,
          projectId: tmpl.projectId || undefined,
          recurringTemplateId: tmpl.id,
          title: tmpl.title,
          description: tmpl.description || '',
          departmentId: tmpl.departmentId || 'dept-1',
          assignedTo: tmpl.assignedTo || undefined,
          createdBy: tmpl.createdBy || undefined,
          priority: 'medium',
          status: 'pending',
          dueDate: todayStr,
          dueTime: tmpl.dueTime || '10:00 AM',
          proofRequired: tmpl.requiresProof,
          expectedProofType: tmpl.expectedProofType || 'Photo',
          remarksJson: [],
        })
        .returning();

      generatedCount++;

      // 4. Update next_run_at to advance schedule
      await db
        .update(recurringTaskTemplates)
        .set({
          nextRunAt: nextRun,
          updatedAt: new Date(),
        })
        .where(eq(recurringTaskTemplates.id, tmpl.id));

      // 5. Log audit record
      await db.insert(auditLogs).values({
        templeId: tmpl.templeId,
        actorUserId: tmpl.createdBy || undefined,
        actorUserName: 'Recurring Task Scheduler',
        actorUserRole: 'system',
        action: 'RECURRING_TASK_GENERATED',
        entityType: 'task',
        entityId: newTask.id,
        details: `Generated daily recurring task instance "${newTask.title}" for date ${todayStr}`,
      });

      console.log(`[Recurring Task Scheduler] Successfully generated task instance ${newTask.id} for template "${tmpl.title}"`);
    }
  } catch (error) {
    console.error('[Recurring Task Scheduler] Error processing recurring task templates:', error);
  }

  return { generatedCount, processedTemplatesCount };
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startRecurringTaskScheduler(intervalMs = 60000) {
  if (schedulerInterval) return;
  // Run after a slight delay to ensure database schema initialization finishes
  setTimeout(() => {
    processRecurringTaskTemplates().catch((err) => {
      console.warn('[Recurring Task Scheduler] Initial run skipped due to database readiness:', err?.message || err);
    });
  }, 3000);

  // Schedule periodic runs
  schedulerInterval = setInterval(() => {
    processRecurringTaskTemplates().catch((err) => {
      console.warn('[Recurring Task Scheduler] Scheduled run skipped:', err?.message || err);
    });
  }, intervalMs);
  console.log('[Recurring Task Scheduler] Scheduler started.');
}

export function stopRecurringTaskScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

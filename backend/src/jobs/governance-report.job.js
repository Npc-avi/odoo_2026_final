import cron from 'node-cron';
import { adminPool, pool } from '../config/database.js';
import { getDashboardMetrics } from '../repository/reporting.repository.js';
import { sendGovernanceReportEmail } from '../service/email.service.js';

// Map of active cron tasks keyed by tenantId
const activeReportCronTasks = new Map();

/**
 * Maps readable frequencies to standard cron expressions
 */
export const FREQUENCY_CRON_MAP = {
  hourly: '0 * * * *',           // Every hour at minute 0
  every_6h: '0 */6 * * *',       // Every 6 hours (00:00, 06:00, 12:00, 18:00)
  daily: '0 9 * * *',            // Daily at 09:00 AM
  weekly: '0 9 * * 1',           // Weekly on Monday at 09:00 AM
  custom: '0 9 * * *'
};

/**
 * Formats human-friendly cron descriptions
 */
export function getCronDescription(cronExpr) {
  if (cronExpr === '0 * * * *') return 'Hourly (at minute 0)';
  if (cronExpr === '0 */6 * * *') return 'Every 6 hours';
  if (cronExpr === '0 9 * * *') return 'Daily at 09:00 AM';
  if (cronExpr === '0 9 * * 1') return 'Weekly on Monday at 09:00 AM';
  return `Custom Schedule (${cronExpr})`;
}

/**
 * Initializes active recurring report cron schedules on server startup
 */
export async function initGovernanceReportCronJobs() {
  console.log('[Cron Job] Initializing Governance Report Email Scheduler...');
  const db = adminPool || pool;

  try {
    const res = await db.query(`
      SELECT tenant_id, recipient_email, frequency, cron_expression, is_active, last_sent_at
      FROM governance_report_schedules
      WHERE is_active = TRUE;
    `);

    for (const schedule of res.rows) {
      scheduleGovernanceReportTask(schedule.tenant_id, schedule);
    }

    console.log(`[Cron Job] Active governance report schedules initialized (${res.rowCount} active).`);
  } catch (err) {
    console.warn('[Cron Job Warning] Could not initialize governance report schedules:', err.message);
  }
}

/**
 * Registers or updates a recurring cron job for a tenant
 */
export function scheduleGovernanceReportTask(tenantId, schedule) {
  if (!tenantId) return;

  // 1. Cancel previous running task if exists
  if (activeReportCronTasks.has(tenantId)) {
    try {
      activeReportCronTasks.get(tenantId).stop();
    } catch (_) {}
    activeReportCronTasks.delete(tenantId);
  }

  // 2. If inactive, exit early
  if (!schedule.is_active) {
    console.log(`[Cron Job] Governance report cron task deactivated for tenant ${tenantId}.`);
    return;
  }

  const cronExpr = schedule.cron_expression || FREQUENCY_CRON_MAP[schedule.frequency] || '0 9 * * *';

  if (!cron.validate(cronExpr)) {
    console.error(`[Cron Job Error] Invalid cron expression: "${cronExpr}" for tenant ${tenantId}.`);
    return;
  }

  // 3. Create scheduled task
  const task = cron.schedule(cronExpr, async () => {
    console.log(`[Cron Job ${new Date().toISOString()}] Triggering scheduled governance report for tenant ${tenantId}...`);
    const db = adminPool || pool;
    let client;
    try {
      client = await db.connect();
      // Set session tenant context for queries
      await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
      await client.query(`SELECT set_config('app.current_actor_type', 'staff', true)`);

      const metrics = await getDashboardMetrics(client, {});

      await sendGovernanceReportEmail({
        recipientEmail: schedule.recipient_email,
        metrics,
        filterInfo: {
          periodLabel: schedule.frequency ? schedule.frequency.toUpperCase() : 'Scheduled',
          triggeredBy: `Scheduled Cron (${getCronDescription(cronExpr)})`
        }
      });

      // Update last_sent_at in schedule
      await client.query(`
        UPDATE governance_report_schedules
        SET last_sent_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1;
      `, [tenantId]);

      console.log(`[Cron Job ${new Date().toISOString()}] Scheduled governance report sent successfully to ${schedule.recipient_email}.`);
    } catch (err) {
      console.error(`[Cron Job Error] Failed to send scheduled governance report for tenant ${tenantId}:`, err.message);
    } finally {
      if (client) client.release();
    }
  });

  activeReportCronTasks.set(tenantId, task);
  console.log(`[Cron Job] Governance report cron task scheduled for tenant ${tenantId} [${cronExpr}] -> ${schedule.recipient_email}`);
}

/**
 * Stops an active recurring report cron task
 */
export function stopGovernanceReportTask(tenantId) {
  if (activeReportCronTasks.has(tenantId)) {
    try {
      activeReportCronTasks.get(tenantId).stop();
    } catch (_) {}
    activeReportCronTasks.delete(tenantId);
    console.log(`[Cron Job] Governance report cron task stopped for tenant ${tenantId}.`);
  }
}

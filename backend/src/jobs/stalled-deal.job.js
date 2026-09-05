import cron from 'node-cron';
import { withSystemContext } from '../middleware/tenant-context.middleware.js';

/**
 * DealFlow 360 - Automated Stalled Deal Health Monitor
 * 
 * Runs on a recurring schedule (default: hourly at minute 0) to execute the
 * `sp_flag_stalled_deals(p_idle_days INT)` stored procedure.
 * 
 * Uses administrative / maintenance database context so it can scan across all tenants
 * without requiring single-tenant session GUCs.
 */
export function startStalledDealCronJob() {
  console.log('[Cron Job] Initializing automated deal health sweep (hourly)...');

  // Run every hour at minute 0: '0 * * * *'
  const task = cron.schedule('0 * * * *', async () => {
    console.log(`[Cron Job ${new Date().toISOString()}] Running sp_flag_stalled_deals(3)...`);
    try {
      await withSystemContext(async (client) => {
        await client.query('CALL sp_flag_stalled_deals(3)');
      });
      console.log(`[Cron Job ${new Date().toISOString()}] Stalled deal detection completed successfully.`);
    } catch (err) {
      console.error(`[Cron Job Error] Failed to execute sp_flag_stalled_deals:`, err.message);
    }
  });

  return task;
}

/**
 * Allows manual on-demand trigger of the stalled-deal monitor
 */
export async function triggerStalledDealCheck(idleDays = 3) {
  return withSystemContext(async (client) => {
    await client.query('CALL sp_flag_stalled_deals($1)', [idleDays]);
  });
}

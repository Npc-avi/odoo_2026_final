import dotenv from 'dotenv';
dotenv.config();

import { pool, adminPool } from '../src/config/database.js';
import { verifyDatabaseInitialization } from '../src/config/init.js';
import { getDashboardMetrics } from '../src/repository/reporting.repository.js';
import { sendGovernanceReportEmail } from '../src/service/email.service.js';
import {
  initGovernanceReportCronJobs,
  scheduleGovernanceReportTask,
  stopGovernanceReportTask
} from '../src/jobs/governance-report.job.js';

async function testGovernanceMailingAndCron() {
  console.log('===========================================================');
  console.log(' DealFlow 360 — Governance Report Mailing & Cron Testing');
  console.log('===========================================================\n');

  // 1. Initialize schema & tables
  console.log('1. Checking database schema and table initialization...');
  await verifyDatabaseInitialization();

  const db = adminPool || pool;
  let client = await db.connect();

  try {
    // 2. Query sample tenant & admin user
    console.log('\n2. Looking up tenant & admin user context...');
    const tenantRes = await client.query(`SELECT id, name FROM tenants LIMIT 1`);
    if (tenantRes.rowCount === 0) {
      console.log('   No tenant found.');
      return;
    }
    const tenantId = tenantRes.rows[0].id;
    console.log(`   Tenant: ${tenantRes.rows[0].name} (${tenantId})`);

    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
    await client.query(`SELECT set_config('app.current_actor_type', 'staff', true)`);

    // 3. Fetch live metrics
    console.log('\n3. Fetching live governance & sales telemetry...');
    const metrics = await getDashboardMetrics(client, {});
    console.log(`   Quotes Created:    ${metrics.overview?.quotes_created || 0}`);
    console.log(`   Confirmed Revenue: $${metrics.overview?.total_confirmed_revenue || '0.00'}`);
    console.log(`   Rep Performance:   ${metrics.repPerformance?.length || 0} reps found`);

    // 4. Test live on-demand dispatch
    console.log('\n4. Dispatched Governance Report Email ("Send Now"):');
    const recipient = process.env.SMTP_USER || 'avyayhkachhia@gmail.com';
    const emailRes = await sendGovernanceReportEmail({
      recipientEmail: recipient,
      metrics,
      filterInfo: {
        periodLabel: 'All Time',
        triggeredBy: 'Test Runner (Admin On-Demand)'
      }
    });
    console.log(`   SUCCESS: Report delivered to ${recipient} (MessageId: ${emailRes.messageId})`);

    // 5. Test Recurring Cron Scheduler Registration
    console.log('\n5. Testing Recurring Cron Task Registration...');
    const sampleSchedule = {
      tenant_id: tenantId,
      recipient_email: recipient,
      frequency: 'daily',
      cron_expression: '0 9 * * *',
      is_active: true
    };
    scheduleGovernanceReportTask(tenantId, sampleSchedule);
    console.log('   SUCCESS: node-cron task scheduled for daily 9:00 AM delivery.');

    // Stop task for test cleanup
    stopGovernanceReportTask(tenantId);
    console.log('   SUCCESS: Test completed cleanly.');
  } finally {
    client.release();
    await pool.end();
    await adminPool.end();
  }
}

testGovernanceMailingAndCron().catch(console.error);

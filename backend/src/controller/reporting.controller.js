import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import { getDashboardMetrics } from '../repository/reporting.repository.js';
import { sendGovernanceReportEmail } from '../service/email.service.js';
import {
  FREQUENCY_CRON_MAP,
  scheduleGovernanceReportTask,
  stopGovernanceReportTask
} from '../jobs/governance-report.job.js';
import cron from 'node-cron';

export async function getReports(req, res, next) {
  try {
    const { startDate, endDate, repId, status, productId } = req.query;
    const metrics = await withTenantContext(req.actor, async (client) => {
      return getDashboardMetrics(client, { startDate, endDate, repId, status, productId });
    });

    return res.status(200).json(metrics);
  } catch (err) {
    next(err);
  }
}

/**
 * Export summary data in JSON/CSV structure for client PDF/XLS export
 */
export async function exportReportData(req, res, next) {
  try {
    const { format = 'json', startDate, endDate, repId, status, productId } = req.query;
    const data = await withTenantContext(req.actor, async (client) => {
      return getDashboardMetrics(client, { startDate, endDate, repId, status, productId });
    });

    if (format === 'csv') {
      let csv = 'DEALFLOW 360 EXECUTIVE SALES & GOVERNANCE REPORT\n';
      csv += `Generated At: ${new Date().toISOString()}\n`;
      csv += `Quotes Created: ${data.overview?.quotes_created || 0}, Confirmed Revenue: $${data.overview?.total_confirmed_revenue || '0.00'}, Avg Approval Time: ${data.overview?.avg_approval_time_hours || 0} hrs\n\n`;

      csv += '--- QUOTATION LEDGER ---\n';
      csv += 'Quote Code,Customer,Sales Rep,Status,Total Amount,Blended Risk Score,Approval Time (hrs),Created Date\n';
      if (data.ledger && data.ledger.length > 0) {
        for (const row of data.ledger) {
          csv += `"${row.quotation_code}","${row.customer_name}","${row.rep_name || 'N/A'}","${row.status}",$${Number(row.total_amount || 0).toFixed(2)},${row.blended_risk_score || 0},${row.approval_time_hours || 0},"${new Date(row.created_at).toLocaleDateString()}"\n`;
        }
      }

      csv += '\n--- SALES REP PERFORMANCE ---\n';
      csv += 'Rep Name,Total Quotes,Won Quotes,Total Revenue,Avg Margin %\n';
      for (const rep of data.repPerformance) {
        csv += `"${rep.rep_name}",${rep.total_quotes},${rep.won_quotes},$${Number(rep.total_revenue || 0).toFixed(2)},${rep.avg_margin_pct}%\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dealflow-governance-report.csv"');
      return res.send(csv);
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN ONLY: Dispatch governance report email on the spot right now
 */
export async function sendReportNow(req, res, next) {
  try {
    const { recipientEmail, period = 'all', repId, status, productId } = req.body;
    const targetEmail = recipientEmail || req.actor.email;

    if (!targetEmail) {
      return res.status(400).json({ message: 'Recipient email address is required.' });
    }

    // Compute date range if period provided
    let startDate, endDate;
    const now = new Date();
    if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endDate = now.toISOString();
    } else if (period === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      endDate = now.toISOString();
    } else if (period === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1).toISOString();
      endDate = now.toISOString();
    } else if (period === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      endDate = now.toISOString();
    }

    const metrics = await withTenantContext(req.actor, async (client) => {
      return getDashboardMetrics(client, { startDate, endDate, repId, status, productId });
    });

    const result = await sendGovernanceReportEmail({
      recipientEmail: targetEmail,
      metrics,
      filterInfo: {
        periodLabel: period === 'all' ? 'All Time' : period.replace('_', ' ').toUpperCase(),
        triggeredBy: `Admin On-Demand (${req.actor.email || 'Admin'})`
      }
    });

    return res.status(200).json({
      message: `Governance report successfully emailed to ${targetEmail}.`,
      result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN ONLY: Get recurring report cron schedule for this tenant
 */
export async function getCronSchedule(req, res, next) {
  try {
    const schedule = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(
        `SELECT id, tenant_id, recipient_email, frequency, cron_expression, is_active, last_sent_at, created_at, updated_at
         FROM governance_report_schedules
         WHERE tenant_id = $1`,
        [req.actor.tenantId]
      );
      return result.rows[0] || null;
    });

    return res.status(200).json({ schedule });
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN ONLY: Save or update recurring report cron schedule
 */
export async function saveCronSchedule(req, res, next) {
  try {
    const { is_active = true, frequency = 'daily', cron_expression, recipient_email } = req.body;
    const targetEmail = recipient_email || req.actor.email;

    if (!targetEmail) {
      return res.status(400).json({ message: 'Recipient email is required for recurring schedule.' });
    }

    const cronExpr = cron_expression || FREQUENCY_CRON_MAP[frequency] || '0 9 * * *';
    if (!cron.validate(cronExpr)) {
      return res.status(400).json({ message: `Invalid cron expression format: "${cronExpr}".` });
    }

    const schedule = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(
        `INSERT INTO governance_report_schedules (
           tenant_id, created_by, recipient_email, frequency, cron_expression, is_active, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (tenant_id) DO UPDATE
         SET recipient_email = EXCLUDED.recipient_email,
             frequency = EXCLUDED.frequency,
             cron_expression = EXCLUDED.cron_expression,
             is_active = EXCLUDED.is_active,
             updated_at = NOW()
         RETURNING *;`,
        [req.actor.tenantId, req.actor.userId, targetEmail, frequency, cronExpr, Boolean(is_active)]
      );
      return result.rows[0];
    });

    // Update active in-memory cron runner
    scheduleGovernanceReportTask(req.actor.tenantId, schedule);

    return res.status(200).json({
      message: is_active
        ? `Recurring governance report scheduled (${frequency}: ${cronExpr}) to ${targetEmail}.`
        : 'Recurring governance report schedule disabled.',
      schedule
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN ONLY: Deactivate recurring report cron schedule
 */
export async function deleteCronSchedule(req, res, next) {
  try {
    await withTenantContext(req.actor, async (client) => {
      await client.query(
        `UPDATE governance_report_schedules
         SET is_active = FALSE, updated_at = NOW()
         WHERE tenant_id = $1;`,
        [req.actor.tenantId]
      );
    });

    stopGovernanceReportTask(req.actor.tenantId);

    return res.status(200).json({
      message: 'Recurring governance report schedule deactivated.'
    });
  } catch (err) {
    next(err);
  }
}

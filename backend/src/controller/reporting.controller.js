import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import { getDashboardMetrics } from '../repository/reporting.repository.js';

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

import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import { getDashboardMetrics } from '../repository/reporting.repository.js';

export async function getReports(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const metrics = await withTenantContext(req.actor, async (client) => {
      return getDashboardMetrics(client, { startDate, endDate });
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
    const { format = 'json', startDate, endDate } = req.query;
    const data = await withTenantContext(req.actor, async (client) => {
      return getDashboardMetrics(client, { startDate, endDate });
    });

    if (format === 'csv') {
      let csv = 'Rep Name,Total Quotes,Won Quotes,Total Revenue,Avg Margin %\n';
      for (const rep of data.repPerformance) {
        csv += `"${rep.rep_name}",${rep.total_quotes},${rep.won_quotes},${rep.total_revenue},${rep.avg_margin_pct}%\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dealflow-sales-report.csv"');
      return res.send(csv);
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

import {
  GET_SALES_OVERVIEW_METRICS,
  GET_TOP_UPSOLD_METRIC,
  GET_REP_PERFORMANCE_METRICS,
  GET_STATUS_BREAKDOWN,
  GET_TOP_PRODUCTS_AND_DISCOUNTS,
  GET_REPORTING_QUOTATION_LEDGER
} from '../queries/reporting.query.js';

export async function getDashboardMetrics(client, { startDate, endDate, repId, status, productId }) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const rep = repId && repId !== 'all' ? repId : null;
  const st = status && status !== 'all' ? status : null;
  const prod = productId && productId !== 'all' ? productId : null;

  const queryParams = [start, end, rep, st, prod];

  const [overviewRes, topUpsoldRes, repRes, statusRes, productRes, ledgerRes] = await Promise.all([
    client.query(GET_SALES_OVERVIEW_METRICS, queryParams),
    client.query(GET_TOP_UPSOLD_METRIC, queryParams),
    client.query(GET_REP_PERFORMANCE_METRICS, queryParams),
    client.query(GET_STATUS_BREAKDOWN, queryParams),
    client.query(GET_TOP_PRODUCTS_AND_DISCOUNTS, queryParams),
    client.query(GET_REPORTING_QUOTATION_LEDGER, queryParams)
  ]);

  const overview = overviewRes.rows[0] || {};
  const topUpsold = topUpsoldRes.rows[0] || null;

  return {
    overview: {
      ...overview,
      top_upsold_product: topUpsold ? topUpsold.product_name : 'Care Plan 2yr',
      top_upsold_revenue: topUpsold ? topUpsold.total_revenue : '0.00',
      top_upsold_occurrences: topUpsold ? topUpsold.occurrences : 0
    },
    repPerformance: repRes.rows,
    statusBreakdown: statusRes.rows,
    topProducts: productRes.rows,
    ledger: ledgerRes.rows
  };
}

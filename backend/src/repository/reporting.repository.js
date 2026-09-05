import {
  GET_SALES_OVERVIEW_METRICS,
  GET_REP_PERFORMANCE_METRICS,
  GET_STATUS_BREAKDOWN,
  GET_TOP_PRODUCTS_AND_DISCOUNTS
} from '../queries/reporting.query.js';

export async function getDashboardMetrics(client, { startDate, endDate }) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const [overviewRes, repRes, statusRes, productRes] = await Promise.all([
    client.query(GET_SALES_OVERVIEW_METRICS, [start, end]),
    client.query(GET_REP_PERFORMANCE_METRICS, [start, end]),
    client.query(GET_STATUS_BREAKDOWN, [start, end]),
    client.query(GET_TOP_PRODUCTS_AND_DISCOUNTS, [start, end])
  ]);

  return {
    overview: overviewRes.rows[0],
    repPerformance: repRes.rows,
    statusBreakdown: statusRes.rows,
    topProducts: productRes.rows
  };
}

import {
  LIST_DEAL_HEALTH_ALERTS,
  RESOLVE_ALERT
} from '../queries/dealhealth.query.js';

export async function getAlerts(client) {
  const result = await client.query(LIST_DEAL_HEALTH_ALERTS);
  return result.rows;
}

export async function markAlertResolved(client, alertId) {
  const result = await client.query(RESOLVE_ALERT, [alertId]);
  return result.rows[0] || null;
}

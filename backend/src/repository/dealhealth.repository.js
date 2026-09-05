import {
  LIST_DEAL_HEALTH_ALERTS,
  RESOLVE_ALERT,
  UPDATE_ALERT_ACTION
} from '../queries/dealhealth.query.js';

export async function getAlerts(client) {
  const result = await client.query(LIST_DEAL_HEALTH_ALERTS);
  return result.rows;
}

export async function markAlertResolved(client, alertId) {
  const result = await client.query(RESOLVE_ALERT, [alertId]);
  return result.rows[0] || null;
}

export async function updateAlertAction(client, alertId, actionStatus) {
  const result = await client.query(UPDATE_ALERT_ACTION, [alertId, actionStatus]);
  return result.rows[0] || null;
}

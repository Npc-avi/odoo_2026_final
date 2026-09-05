/**
 * SQL Queries for Deal Health Alerts and Monitoring
 */

export const LIST_DEAL_HEALTH_ALERTS = `
  SELECT dha.id, dha.tenant_id, dha.quotation_id, dha.alert_type,
         dha.severity, dha.description, dha.trigger_metric, dha.is_resolved, dha.created_at,
         COALESCE(dha.action_status, 'Pending Review') AS action_status,
         q.quotation_code, q.status AS quotation_status, q.total_amount,
         c.company_name AS customer_name,
         u.full_name AS assigned_rep_name
  FROM deal_health_alerts dha
  JOIN quotations q ON q.id = dha.quotation_id
  JOIN customers c ON c.id = q.customer_id
  LEFT JOIN users u ON u.id = q.assigned_rep_id
  WHERE COALESCE(dha.is_resolved, FALSE) = FALSE
  ORDER BY dha.created_at DESC;
`;

export const RESOLVE_ALERT = `
  UPDATE deal_health_alerts
  SET is_resolved = TRUE, action_status = 'Resolved'
  WHERE id = $1
  RETURNING *;
`;

export const UPDATE_ALERT_ACTION = `
  UPDATE deal_health_alerts
  SET action_status = $2
  WHERE id = $1
  RETURNING *;
`;

/**
 * SQL Queries for Deal Health Alerts and Monitoring
 */

export const LIST_DEAL_HEALTH_ALERTS = `
  SELECT dha.id, dha.tenant_id, dha.quotation_id, dha.alert_type,
         dha.severity, dha.description, dha.trigger_metric, dha.is_resolved, dha.created_at,
         q.quotation_code, q.status AS quotation_status, q.total_amount,
         c.company_name AS customer_name,
         u.full_name AS assigned_rep_name
  FROM deal_health_alerts dha
  JOIN quotations q ON q.id = dha.quotation_id
  JOIN customers c ON c.id = q.customer_id
  JOIN users u ON u.id = q.assigned_rep_id
  ORDER BY dha.is_resolved ASC, dha.created_at DESC;
`;

export const RESOLVE_ALERT = `
  UPDATE deal_health_alerts
  SET is_resolved = TRUE
  WHERE id = $1
  RETURNING *;
`;

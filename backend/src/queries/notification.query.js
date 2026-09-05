/**
 * SQL Queries for Staff In-App Notifications
 */

export const LIST_NOTIFICATIONS_FOR_USER = `
  SELECT id, tenant_id, recipient_user_id, notification_type,
         reference_table, reference_id, message, is_read, created_at
  FROM notifications
  WHERE recipient_user_id = $1
  ORDER BY is_read ASC, created_at DESC;
`;

export const MARK_NOTIFICATION_READ = `
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = $1 AND recipient_user_id = $2
  RETURNING *;
`;

export const MARK_ALL_NOTIFICATIONS_READ = `
  UPDATE notifications
  SET is_read = TRUE
  WHERE recipient_user_id = $1 AND is_read = FALSE
  RETURNING id;
`;

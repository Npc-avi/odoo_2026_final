import {
  LIST_NOTIFICATIONS_FOR_USER,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ
} from '../queries/notification.query.js';

export async function getUserNotifications(client, userId) {
  const result = await client.query(LIST_NOTIFICATIONS_FOR_USER, [userId]);
  return result.rows;
}

export async function markNotificationAsRead(client, notificationId, userId) {
  const result = await client.query(MARK_NOTIFICATION_READ, [notificationId, userId]);
  return result.rows[0] || null;
}

export async function markAllUserNotificationsAsRead(client, userId) {
  const result = await client.query(MARK_ALL_NOTIFICATIONS_READ, [userId]);
  return result.rowCount;
}

import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllUserNotificationsAsRead
} from '../repository/notification.repository.js';

export async function listNotifications(req, res, next) {
  try {
    const notifications = await withTenantContext(req.actor, async (client) => {
      return getUserNotifications(client, req.actor.userId);
    });
    return res.status(200).json({ notifications });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await withTenantContext(req.actor, async (client) => {
      return markNotificationAsRead(client, id, req.actor.userId);
    });

    if (!notification) {
      const err = new Error('Notification not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const count = await withTenantContext(req.actor, async (client) => {
      return markAllUserNotificationsAsRead(client, req.actor.userId);
    });
    return res.status(200).json({ message: `Marked ${count} notifications as read.` });
  } catch (err) {
    next(err);
  }
}

import { Router } from 'express';
import {
  listNotifications,
  markAsRead,
  markAllRead
} from '../controller/notification.controller.js';
import { verifyStaffToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

router.get('/', listNotifications);
router.patch('/:id/read', markAsRead);
router.post('/read-all', markAllRead);

export default router;

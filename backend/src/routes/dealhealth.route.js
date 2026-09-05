import { Router } from 'express';
import {
  listAlerts,
  resolveAlert,
  triggerStalledCheck
} from '../controller/dealhealth.controller.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

router.get('/alerts', listAlerts);
router.patch('/alerts/:id/resolve', resolveAlert);
router.post('/check-stalled', requireStaffRole('admin', 'sales_manager'), triggerStalledCheck);

export default router;

import { Router } from 'express';
import {
  listAlerts,
  resolveAlert,
  updateAction,
  triggerStalledCheck
} from '../controller/dealhealth.controller.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);
router.use(requireStaffRole('admin', 'sales_manager', 'finance'));

router.get('/alerts', listAlerts);
router.patch('/alerts/:id/resolve', resolveAlert);
router.post('/alerts/:id/action', updateAction);
router.post('/check-stalled', triggerStalledCheck);

export default router;

import { Router } from 'express';
import {
  getReports,
  exportReportData,
  sendReportNow,
  getCronSchedule,
  saveCronSchedule,
  deleteCronSchedule
} from '../controller/reporting.controller.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

// Reports viewing & export (admin, sales_manager, finance)
router.get('/', requireStaffRole('admin', 'sales_manager', 'finance'), getReports);
router.get('/export', requireStaffRole('admin', 'sales_manager', 'finance'), exportReportData);

// Admin-Only: Governance Email Dispatch & Recurring Cron Scheduling
router.post('/send-now', requireStaffRole('admin'), sendReportNow);
router.get('/cron-schedule', requireStaffRole('admin'), getCronSchedule);
router.post('/cron-schedule', requireStaffRole('admin'), saveCronSchedule);
router.delete('/cron-schedule', requireStaffRole('admin'), deleteCronSchedule);

export default router;

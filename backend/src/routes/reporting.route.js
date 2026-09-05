import { Router } from 'express';
import { getReports, exportReportData } from '../controller/reporting.controller.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

router.get('/', requireStaffRole('admin', 'sales_manager', 'finance'), getReports);
router.get('/export', requireStaffRole('admin', 'sales_manager', 'finance'), exportReportData);

export default router;

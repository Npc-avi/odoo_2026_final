import { Router } from 'express';
import {
  listStaff,
  updateStaffRole,
  toggleStaffStatus,
  createStaffMember,
  listCustomersWithDetails,
  createCustomerMember
} from '../controller/governance.controller.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

// Staff management endpoints (admin & sales_manager view, admin can update/create)
router.get('/staff', requireStaffRole('admin', 'sales_manager', 'finance'), listStaff);
router.patch('/staff/:id/role', requireStaffRole('admin'), updateStaffRole);
router.patch('/staff/:id/status', requireStaffRole('admin'), toggleStaffStatus);
router.post('/staff', requireStaffRole('admin'), createStaffMember);

// Customer management endpoints
router.get('/customers', requireStaffRole('admin', 'sales_manager', 'finance'), listCustomersWithDetails);
router.post('/customers', requireStaffRole('admin', 'sales_manager'), createCustomerMember);

export default router;

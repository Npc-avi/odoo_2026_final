import { Router } from 'express';
import {
  generateBilling,
  listAllInvoices,
  getInvoice,
  recordPayment,
  listCustomerInvoices,
  getCustomerInvoice
} from '../controller/billing.controller.js';
import { validateRecordPayment } from '../validation/billing.validator.js';
import { verifyStaffToken, verifyPortalToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Customer Portal Invoice Endpoints
// ==========================================
router.get('/portal/invoices', verifyPortalToken, listCustomerInvoices);
router.get('/portal/invoices/:id', verifyPortalToken, getCustomerInvoice);

// ==========================================
// Staff Billing Endpoints
// ==========================================
router.use(verifyStaffToken);

// Generate hybrid billing from confirmed quotation
router.post('/quotations/:id/generate', generateBilling);

// Invoices
router.get('/invoices', listAllInvoices);
router.get('/invoices/:id', getInvoice);
router.post(
  '/invoices/:id/pay',
  requireStaffRole('admin', 'finance', 'sales_manager'),
  validateRecordPayment,
  recordPayment
);

export default router;

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
import {
  verifyStaffToken,
  verifyPortalToken,
  verifyStaffOrPortalToken,
  requireStaffRole
} from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Unified & Customer Portal Invoice Endpoints
// ==========================================
router.get('/portal/invoices', verifyPortalToken, listCustomerInvoices);
router.get('/portal/invoices/:id', verifyPortalToken, getCustomerInvoice);

// Unified endpoint for loading invoice detail (accessible by both staff and portal customers)
router.get('/invoices/:id', verifyStaffOrPortalToken, (req, res, next) => {
  if (req.actor.actorType === 'customer_portal') {
    return getCustomerInvoice(req, res, next);
  }
  return getInvoice(req, res, next);
});

// ==========================================
// Staff Billing Endpoints
// ==========================================
router.use(verifyStaffToken);

// Generate hybrid billing from confirmed quotation
router.post('/quotations/:id/generate', generateBilling);

// Invoices
router.get('/invoices', listAllInvoices);
router.post(
  '/invoices/:id/pay',
  requireStaffRole('admin', 'finance', 'sales_manager'),
  validateRecordPayment,
  recordPayment
);

export default router;

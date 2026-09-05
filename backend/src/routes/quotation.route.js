import { Router } from 'express';
import {
  listQuotations,
  getQuotation,
  createQuotation,
  addItem,
  editItem,
  removeItem,
  getUpsells,
  listCustomerQuotations,
  getCustomerQuotation,
  addPortalItem,
  editPortalItem,
  removePortalItem,
  listCustomers,
  sendQuotation,
  submitQuotationApproval
} from '../controller/quotation.controller.js';
import {
  validateCreateQuotation,
  validateAddQuotationItem,
  validateUpdateQuotationItem
} from '../validation/quotation.validator.js';
import { verifyPortalToken, verifyStaffToken } from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Customer Portal Quotation Endpoints
// ==========================================
router.get('/portal/my-quotations', verifyPortalToken, listCustomerQuotations);
router.get('/portal/:id', verifyPortalToken, getCustomerQuotation);
router.post('/portal/:id/items', verifyPortalToken, addPortalItem);
router.patch('/portal/items/:itemId', verifyPortalToken, editPortalItem);
router.delete('/portal/items/:itemId', verifyPortalToken, removePortalItem);

// ==========================================
// Staff Quotation Builder Endpoints
// ==========================================
router.use(verifyStaffToken);

router.get('/customers', listCustomers);
router.get('/', listQuotations);
router.get('/:id', getQuotation);
router.post('/', validateCreateQuotation, createQuotation);
router.post('/:id/items', validateAddQuotationItem, addItem);
router.patch('/items/:itemId', validateUpdateQuotationItem, editItem);
router.delete('/items/:itemId', removeItem);
router.get('/:id/upsells', getUpsells);
router.post('/:id/send', sendQuotation);
router.post('/:id/submit-approval', submitQuotationApproval);

export default router;

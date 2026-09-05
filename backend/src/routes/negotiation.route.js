import { Router } from 'express';
import {
  listNegotiationThread,
  submitPortalNegotiation,
  submitStaffNegotiation,
  confirmQuotationPortal
} from '../controller/negotiation.controller.js';
import { validateCreateNegotiation } from '../validation/negotiation.validator.js';
import { verifyPortalToken, verifyStaffToken } from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Customer Portal Negotiation Endpoints
// ==========================================
router.get('/portal/:id', verifyPortalToken, listNegotiationThread);
router.post('/portal/:id', verifyPortalToken, validateCreateNegotiation, submitPortalNegotiation);
router.post('/portal/:id/confirm', verifyPortalToken, confirmQuotationPortal);

// ==========================================
// Staff Operations Negotiation Endpoints
// ==========================================
router.get('/:id', verifyStaffToken, listNegotiationThread);
router.post('/:id', verifyStaffToken, validateCreateNegotiation, submitStaffNegotiation);

export default router;

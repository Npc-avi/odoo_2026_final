import { Router } from 'express';
import {
  submitRfqPortal,
  listCustomerRfqs,
  listStaffRfqs,
  getRfq,
  convertRfq,
  rejectRfq
} from '../controller/rfq.controller.js';
import {
  validateSubmitRfq,
  validateConvertRfq
} from '../validation/rfq.validator.js';
import { verifyPortalToken, verifyStaffToken } from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Customer Portal RFQ Endpoints
// ==========================================
router.post('/portal/submit', verifyPortalToken, validateSubmitRfq, submitRfqPortal);
router.get('/portal/my-requests', verifyPortalToken, listCustomerRfqs);

// ==========================================
// Staff Operations RFQ Endpoints
// ==========================================
router.get('/', verifyStaffToken, listStaffRfqs);
router.get('/:id', verifyStaffToken, getRfq);
router.post('/:id/convert', verifyStaffToken, validateConvertRfq, convertRfq);
router.post('/:id/decline', verifyStaffToken, rejectRfq);

export default router;

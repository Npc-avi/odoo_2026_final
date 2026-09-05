import { Router } from 'express';
import {
  listPlans,
  addPlan,
  listAllSubscriptions,
  getSubscription,
  adjustSeats,
  cancelSubscription,
  updateStatus,
  updateCustomerTierHandler
} from '../controller/billing.controller.js';
import {
  validateCreateSubscriptionPlan,
  validateAdjustSubscription
} from '../validation/billing.validator.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

// Plans
router.get('/plans', listPlans);
router.post('/plans', requireStaffRole('admin', 'sales_manager', 'finance'), validateCreateSubscriptionPlan, addPlan);

// Subscriptions
router.get('/', listAllSubscriptions);
router.get('/:id', getSubscription);
router.patch('/:id/adjust', validateAdjustSubscription, adjustSeats);
router.patch('/:id/status', updateStatus);
router.post('/:id/cancel', cancelSubscription);

// Customer Tier modification
router.patch('/customer/:customerId/tier', requireStaffRole('admin', 'sales_manager'), updateCustomerTierHandler);

export default router;

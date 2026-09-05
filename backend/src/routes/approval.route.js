import { Router } from 'express';
import {
  getAuditTrail,
  handleApprovalAction,
  listGovernanceRules,
  saveGovernanceRule,
  removeGovernanceRule,
  listApprovalChains,
  saveApprovalChain,
  removeApprovalChain
} from '../controller/approval.controller.js';
import {
  validateApprovalAction,
  validateDiscountGovernanceRule,
  validateApprovalChainRule
} from '../validation/approval.validator.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

// Audit Trail & Decision
router.get('/:id/audit', getAuditTrail);
router.post(
  '/:id/action',
  requireStaffRole('admin', 'sales_manager', 'finance'),
  validateApprovalAction,
  handleApprovalAction
);

// Discount Governance Setup
router.get('/governance/rules', listGovernanceRules);
router.post(
  '/governance/rules',
  requireStaffRole('admin', 'sales_manager'),
  validateDiscountGovernanceRule,
  saveGovernanceRule
);
router.delete('/governance/rules/:id', requireStaffRole('admin'), removeGovernanceRule);

// Approval Chains Setup
router.get('/governance/chains', listApprovalChains);
router.post(
  '/governance/chains',
  requireStaffRole('admin', 'sales_manager'),
  validateApprovalChainRule,
  saveApprovalChain
);
router.delete('/governance/chains/:id', requireStaffRole('admin'), removeApprovalChain);

export default router;

/**
 * Hand-written Validation Middlewares for Approval Actions and Governance Configuration
 */

export function validateApprovalAction(req, res, next) {
  const { action, justification } = req.body;

  const validActions = ['approved', 'rejected', 'returned_for_revision'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: 'Validation Error', message: `action must be one of: ${validActions.join(', ')}.` });
  }

  if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'Justification/comment is required for approval decisions.' });
  }

  next();
}

export function validateDiscountGovernanceRule(req, res, next) {
  const { tier, categoryId, maxDiscountPct } = req.body;

  const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  if (!tier || !validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Validation Error', message: `tier must be one of: ${validTiers.join(', ')}.` });
  }

  if (!categoryId || typeof categoryId !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'categoryId UUID is required.' });
  }

  const maxDiscount = Number(maxDiscountPct);
  if (isNaN(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) {
    return res.status(400).json({ error: 'Validation Error', message: 'maxDiscountPct must be between 0 and 100.' });
  }

  next();
}

export function validateApprovalChainRule(req, res, next) {
  const { tier, minDiscountPct, maxDiscountPct, requiresSalesManager, requiresFinance } = req.body;

  const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  if (!tier || !validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Validation Error', message: `tier must be one of: ${validTiers.join(', ')}.` });
  }

  const minD = Number(minDiscountPct);
  const maxD = Number(maxDiscountPct);

  if (isNaN(minD) || minD < 0 || isNaN(maxD) || maxD <= minD) {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid non-negative discount range with minDiscountPct < maxDiscountPct is required.' });
  }

  next();
}

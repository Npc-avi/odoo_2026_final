/**
 * Hand-written Validation Middlewares for Subscriptions and Invoicing
 */

export function validateCreateSubscriptionPlan(req, res, next) {
  const { name, cadence, billingIntervalDays, allowsProration } = req.body;

  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'Plan name is required.' });

  const validCadences = ['monthly', 'quarterly', 'yearly'];
  if (!cadence || !validCadences.includes(cadence)) {
    return res.status(400).json({ error: 'Validation Error', message: `cadence must be one of: ${validCadences.join(', ')}.` });
  }

  if (billingIntervalDays !== undefined && (isNaN(Number(billingIntervalDays)) || Number(billingIntervalDays) <= 0)) {
    return res.status(400).json({ error: 'Validation Error', message: 'billingIntervalDays must be a positive integer.' });
  }

  next();
}

export function validateAdjustSubscription(req, res, next) {
  const { newQuantity } = req.body;

  const qty = Number(newQuantity);
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    return res.status(400).json({ error: 'Validation Error', message: 'newQuantity must be a positive integer.' });
  }

  next();
}

export function validateRecordPayment(req, res, next) {
  const { paidAt } = req.body;

  if (paidAt && isNaN(Date.parse(paidAt))) {
    return res.status(400).json({ error: 'Validation Error', message: 'paidAt must be a valid date string.' });
  }

  next();
}

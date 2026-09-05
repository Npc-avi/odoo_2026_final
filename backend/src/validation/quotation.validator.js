/**
 * Hand-written Validation Middlewares for Quotations and Line Items
 */

export function validateCreateQuotation(req, res, next) {
  const { customerId, promisedDeliveryDate } = req.body;

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid customerId UUID is required.' });
  }

  if (promisedDeliveryDate && isNaN(Date.parse(promisedDeliveryDate))) {
    return res.status(400).json({ error: 'Validation Error', message: 'promisedDeliveryDate must be a valid date string.' });
  }

  next();
}

export function validateAddQuotationItem(req, res, next) {
  const { productId, variantId, lineType, quantity, appliedDiscountPct, lineNotes } = req.body;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'productId UUID is required.' });
  }

  const validTypes = ['hardware', 'service', 'subscription'];
  if (!lineType || !validTypes.includes(lineType)) {
    return res.status(400).json({ error: 'Validation Error', message: `lineType must be one of: ${validTypes.join(', ')}.` });
  }

  const qty = Number(quantity);
  if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    return res.status(400).json({ error: 'Validation Error', message: 'quantity must be a positive integer.' });
  }

  if (appliedDiscountPct !== undefined) {
    const disc = Number(appliedDiscountPct);
    if (isNaN(disc) || disc < 0 || disc > 100) {
      return res.status(400).json({ error: 'Validation Error', message: 'appliedDiscountPct must be between 0 and 100.' });
    }
  }

  next();
}

export function validateUpdateQuotationItem(req, res, next) {
  const { quantity, appliedDiscountPct } = req.body;

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Validation Error', message: 'quantity must be a positive integer.' });
    }
  }

  if (appliedDiscountPct !== undefined) {
    const disc = Number(appliedDiscountPct);
    if (isNaN(disc) || disc < 0 || disc > 100) {
      return res.status(400).json({ error: 'Validation Error', message: 'appliedDiscountPct must be between 0 and 100.' });
    }
  }

  next();
}

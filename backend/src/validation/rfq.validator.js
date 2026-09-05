/**
 * Hand-written Validation Middlewares for Customer Quotation Requests (RFQ)
 */

export function validateSubmitRfq(req, res, next) {
  const { items, requestedDeliveryDate, customerNotes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'At least one item is required in the quotation request.' });
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.productId || typeof it.productId !== 'string') {
      return res.status(400).json({ error: 'Validation Error', message: `Item at index ${i} requires a valid productId.` });
    }
    const qty = Number(it.requestedQty);
    if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Validation Error', message: `Item at index ${i} requires a positive integer requestedQty.` });
    }
  }

  if (requestedDeliveryDate && isNaN(Date.parse(requestedDeliveryDate))) {
    return res.status(400).json({ error: 'Validation Error', message: 'requestedDeliveryDate must be a valid date string.' });
  }

  next();
}

export function validateConvertRfq(req, res, next) {
  const { assignedRepId } = req.body;
  // If rep not provided in body, rep will fallback to req.actor.userId or customer account owner
  next();
}

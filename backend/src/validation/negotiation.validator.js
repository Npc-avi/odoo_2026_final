/**
 * Hand-written Validation Middlewares for Quotation Negotiations
 */

export function validateCreateNegotiation(req, res, next) {
  const { quotationItemId, proposedDiscountPct, comments } = req.body;

  if (!comments || typeof comments !== 'string' || comments.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'Comment text is required for negotiation entries.' });
  }

  if (proposedDiscountPct !== undefined && proposedDiscountPct !== null) {
    const disc = Number(proposedDiscountPct);
    if (isNaN(disc) || disc < 0 || disc > 100) {
      return res.status(400).json({ error: 'Validation Error', message: 'proposedDiscountPct must be between 0 and 100.' });
    }
  }

  next();
}

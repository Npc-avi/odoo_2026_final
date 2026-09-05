/**
 * Hand-written Validation Middlewares for Product Catalog, Categories, and Price Lists
 */

export function validateCreateCategory(req, res, next) {
  const { name, defaultDiscountCeilingPct } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'Category name is required.' });
  }
  if (defaultDiscountCeilingPct !== undefined) {
    const ceiling = Number(defaultDiscountCeilingPct);
    if (isNaN(ceiling) || ceiling < 0 || ceiling > 100) {
      return res.status(400).json({ error: 'Validation Error', message: 'Default discount ceiling must be between 0 and 100.' });
    }
  }

  next();
}

export function validateCreateProduct(req, res, next) {
  const { categoryId, sku, name, itemType, basePrice, unitCost, taxRate } = req.body;

  if (!categoryId) return res.status(400).json({ error: 'Validation Error', message: 'categoryId is required.' });
  if (!sku || typeof sku !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'sku is required.' });
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'Product name is required.' });
  
  const validTypes = ['hardware', 'service', 'subscription'];
  if (!itemType || !validTypes.includes(itemType)) {
    return res.status(400).json({ error: 'Validation Error', message: `itemType must be one of: ${validTypes.join(', ')}.` });
  }

  if (basePrice === undefined || isNaN(Number(basePrice)) || Number(basePrice) < 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'basePrice must be a non-negative number.' });
  }

  if (unitCost !== undefined && (isNaN(Number(unitCost)) || Number(unitCost) < 0)) {
    return res.status(400).json({ error: 'Validation Error', message: 'unitCost must be a non-negative number.' });
  }

  if (taxRate !== undefined && (isNaN(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 100)) {
    return res.status(400).json({ error: 'Validation Error', message: 'taxRate must be between 0 and 100.' });
  }

  next();
}

export function validateCreateVariant(req, res, next) {
  const { variantSku, attributeName, attributeValue, extraPrice } = req.body;

  if (!variantSku || typeof variantSku !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'variantSku is required.' });
  if (!attributeName || typeof attributeName !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'attributeName is required.' });
  if (!attributeValue || typeof attributeValue !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'attributeValue is required.' });

  if (extraPrice !== undefined && isNaN(Number(extraPrice))) {
    return res.status(400).json({ error: 'Validation Error', message: 'extraPrice must be a valid number.' });
  }

  next();
}

export function validateUpsellRule(req, res, next) {
  const { triggerProductId, suggestedProductId, priority, minMarginThresholdPct } = req.body;

  if (!triggerProductId || !suggestedProductId) {
    return res.status(400).json({ error: 'Validation Error', message: 'triggerProductId and suggestedProductId are required.' });
  }
  if (triggerProductId === suggestedProductId) {
    return res.status(400).json({ error: 'Validation Error', message: 'Trigger product and suggested product cannot be the same.' });
  }

  next();
}

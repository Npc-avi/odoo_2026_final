/**
 * Hand-written Validation Middlewares for Warehouses and Fulfillment
 */

export function validateCreateWarehouse(req, res, next) {
  const { name, code, location, shippingCostWeight } = req.body;

  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'Warehouse name is required.' });
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'Warehouse code is required.' });
  if (!location || typeof location !== 'string') return res.status(400).json({ error: 'Validation Error', message: 'Warehouse location is required.' });

  if (shippingCostWeight !== undefined && (isNaN(Number(shippingCostWeight)) || Number(shippingCostWeight) <= 0)) {
    return res.status(400).json({ error: 'Validation Error', message: 'shippingCostWeight must be a positive number.' });
  }

  next();
}

export function validateUpdateInventory(req, res, next) {
  const { warehouseId, productId, qtyOnHand } = req.body;

  if (!warehouseId || !productId) {
    return res.status(400).json({ error: 'Validation Error', message: 'warehouseId and productId are required.' });
  }

  const qty = Number(qtyOnHand);
  if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
    return res.status(400).json({ error: 'Validation Error', message: 'qtyOnHand must be a non-negative integer.' });
  }

  next();
}

export function validateManualSplitPayload(req, res, next) {
  const { splits } = req.body;

  if (!Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'At least one warehouse split allocation is required.' });
  }

  for (const s of splits) {
    if (!s.warehouseId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Each split requires warehouseId.' });
    }
    if (!Array.isArray(s.items) || s.items.length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'Each split must fulfill at least one item.' });
    }
  }

  next();
}

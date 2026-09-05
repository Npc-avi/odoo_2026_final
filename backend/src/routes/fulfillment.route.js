import { Router } from 'express';
import {
  listAllWarehouses,
  addWarehouse,
  listStock,
  updateStock,
  suggestSplit,
  confirmSplit,
  listShipments,
  consolidateBackorders
} from '../controller/fulfillment.controller.js';
import {
  validateCreateWarehouse,
  validateUpdateInventory,
  validateManualSplitPayload
} from '../validation/fulfillment.validator.js';
import { verifyStaffToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyStaffToken);

// Warehouses
router.get('/warehouses', listAllWarehouses);
router.post('/warehouses', requireStaffRole('admin', 'sales_manager', 'finance'), validateCreateWarehouse, addWarehouse);

// Inventory
router.get('/inventory', listStock);
router.patch('/inventory', requireStaffRole('admin', 'finance', 'sales_manager', 'sales_rep'), validateUpdateInventory, updateStock);

// Quotation Fulfillment Splits
router.get('/quotations/:id/suggest-split', suggestSplit);
router.post('/quotations/:id/confirm-split', validateManualSplitPayload, confirmSplit);
router.get('/quotations/:id/shipments', listShipments);
router.post('/quotations/:id/consolidate-backorders', consolidateBackorders);

export default router;

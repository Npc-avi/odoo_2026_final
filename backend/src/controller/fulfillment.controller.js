import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import { emitQuotationUpdated, emitInvoiceCreated } from '../service/socket.service.js';
import {
  getWarehouses,
  createWarehouse,
  getInventory,
  setInventoryStock,
  getSuggestedFulfillmentSplit,
  commitFulfillmentSplit,
  getShipmentsForQuotation,
  consolidateBackordersForQuote
} from '../repository/fulfillment.repository.js';

export async function listAllWarehouses(req, res, next) {
  try {
    const warehouses = await withTenantContext(req.actor, async (client) => {
      return getWarehouses(client);
    });
    return res.status(200).json({ warehouses });
  } catch (err) {
    next(err);
  }
}

export async function addWarehouse(req, res, next) {
  try {
    const warehouse = await withTenantContext(req.actor, async (client) => {
      return createWarehouse(client, req.actor.tenantId, req.body);
    });
    return res.status(201).json({ warehouse });
  } catch (err) {
    next(err);
  }
}

export async function listStock(req, res, next) {
  try {
    const inventory = await withTenantContext(req.actor, async (client) => {
      return getInventory(client);
    });
    return res.status(200).json({ inventory });
  } catch (err) {
    next(err);
  }
}

export async function updateStock(req, res, next) {
  try {
    const record = await withTenantContext(req.actor, async (client) => {
      return setInventoryStock(client, req.actor.tenantId, req.body);
    });
    return res.status(200).json({ message: 'Stock level updated.', inventory: record });
  } catch (err) {
    next(err);
  }
}

/**
 * Calculate and preview optimal warehouse fulfillment split
 */
export async function suggestSplit(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const plan = await withTenantContext(req.actor, async (client) => {
      const qCheck = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
      if (qCheck.rows.length === 0) {
        const err = new Error('Quotation not found.');
        err.status = 404;
        throw err;
      }
      const status = qCheck.rows[0].status;
      if (status === 'in_fulfillment' || status === 'fulfillment') {
        const err = new Error('Quotation is in fulfillment and cannot be opened.');
        err.status = 400;
        throw err;
      }
      return getSuggestedFulfillmentSplit(client, id);
    });
    return res.status(200).json({ fulfillmentPlan: plan });
  } catch (err) {
    next(err);
  }
}

/**
 * Confirm and commit shipment order splits to database
 */
export async function confirmSplit(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const { splits, isManualOverride } = req.body;

    const shipments = await withTenantContext(req.actor, async (client) => {
      const qCheck = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
      if (qCheck.rows.length === 0) {
        const err = new Error('Quotation not found.');
        err.status = 404;
        throw err;
      }
      const status = qCheck.rows[0].status;
      if (status === 'in_fulfillment' || status === 'fulfillment') {
        const err = new Error('Quotation is already in fulfillment.');
        err.status = 400;
        throw err;
      }

      return commitFulfillmentSplit(client, req.actor.tenantId, id, {
        splits,
        isManualOverride: Boolean(isManualOverride)
      });
    });

    emitQuotationUpdated(req.actor.tenantId, id, { status: 'in_fulfillment' });
    emitInvoiceCreated(req.actor.tenantId, { quotationId: id, status: 'issued' });

    return res.status(201).json({
      message: 'Fulfillment plan confirmed and quotation pushed to fulfillment. Unpaid invoice generated.',
      shipments
    });
  } catch (err) {
    next(err);
  }
}

/**
 * View all shipments and backorders for a quotation
 */
export async function listShipments(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const data = await withTenantContext(req.actor, async (client) => {
      return getShipmentsForQuotation(client, id);
    });
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * Consolidate remaining backorders if new inventory has arrived
 */
export async function consolidateBackorders(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const result = await withTenantContext(req.actor, async (client) => {
      return consolidateBackordersForQuote(client, req.actor.tenantId, id);
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

import {
  LIST_WAREHOUSES,
  CREATE_WAREHOUSE,
  LIST_WAREHOUSE_INVENTORY,
  GET_ALL_INVENTORY_FOR_PRODUCTS,
  UPSERT_INVENTORY,
  RESERVE_INVENTORY,
  CREATE_SHIPMENT_ORDER,
  CREATE_SHIPMENT_ITEM,
  LIST_SHIPMENTS_BY_QUOTATION,
  LIST_SHIPMENT_ITEMS_BY_ORDER,
  GET_PENDING_BACKORDERS
} from '../queries/fulfillment.query.js';
import { LIST_QUOTATION_ITEMS_STAFF } from '../queries/quotation.query.js';
import {
  calculateOptimalWarehouseSplit,
  validateManualSplit
} from '../service/warehouse-split.service.js';

export async function getWarehouses(client) {
  const result = await client.query(LIST_WAREHOUSES);
  return result.rows;
}

export async function createWarehouse(client, tenantId, data) {
  const result = await client.query(CREATE_WAREHOUSE, [
    tenantId,
    data.name,
    data.code,
    data.location,
    data.shippingCostWeight
  ]);
  return result.rows[0];
}

export async function getInventory(client) {
  const result = await client.query(LIST_WAREHOUSE_INVENTORY);
  return result.rows;
}

export async function setInventoryStock(client, tenantId, { warehouseId, productId, qtyOnHand }) {
  const result = await client.query(UPSERT_INVENTORY, [
    tenantId,
    warehouseId,
    productId,
    qtyOnHand
  ]);
  return result.rows[0];
}

/**
 * Loads quotation items and warehouse stock, then calls pure algorithm to generate suggested split
 */
export async function getSuggestedFulfillmentSplit(client, quotationId) {
  // 1. Fetch physical lines
  const itemsRes = await client.query(LIST_QUOTATION_ITEMS_STAFF, [quotationId]);
  const requestedItems = itemsRes.rows.map(r => ({
    quotationItemId: r.id,
    productId: r.product_id,
    productName: r.product_name,
    quantity: r.quantity,
    lineType: r.line_type
  }));

  // 2. Fetch warehouses with inventory
  const whRes = await client.query(LIST_WAREHOUSES);
  const invRes = await client.query(GET_ALL_INVENTORY_FOR_PRODUCTS);

  const warehouseMap = {};
  for (const wh of whRes.rows) {
    warehouseMap[wh.id] = {
      id: wh.id,
      name: wh.name,
      code: wh.code,
      shippingCostWeight: Number(wh.shipping_cost_weight),
      inventory: {}
    };
  }

  for (const inv of invRes.rows) {
    if (inv.warehouse_id && warehouseMap[inv.warehouse_id] && inv.product_id) {
      warehouseMap[inv.warehouse_id].inventory[inv.product_id] = Number(inv.qty_available || 0);
    }
  }

  const warehouses = Object.values(warehouseMap);

  // 3. Compute optimal allocation
  const allocation = calculateOptimalWarehouseSplit(requestedItems, warehouses);

  return {
    quotationId,
    requestedItems,
    warehouses,
    suggestedSplits: allocation.splits,
    backorders: allocation.backorders,
    totalShipments: allocation.totalShipments,
    totalShippingCost: allocation.totalShippingCost
  };
}

/**
 * Commits a fulfillment split (either suggested or manual override) to the database,
 * creating shipment orders, shipment items, and reserving inventory.
 */
export async function commitFulfillmentSplit(client, tenantId, quotationId, { splits, isManualOverride }) {
  // 1. Validate if manual override
  if (isManualOverride) {
    const itemsRes = await client.query(LIST_QUOTATION_ITEMS_STAFF, [quotationId]);
    const requestedItems = itemsRes.rows.map(r => ({
      quotationItemId: r.id,
      productId: r.product_id,
      quantity: r.quantity,
      lineType: r.line_type
    }));

    const invRes = await client.query(GET_ALL_INVENTORY_FOR_PRODUCTS);
    const whRes = await client.query(LIST_WAREHOUSES);
    const whMap = {};
    for (const wh of whRes.rows) {
      whMap[wh.id] = {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        shippingCostWeight: Number(wh.shipping_cost_weight),
        inventory: {}
      };
    }
    for (const inv of invRes.rows) {
      if (inv.warehouse_id && whMap[inv.warehouse_id] && inv.product_id) {
        whMap[inv.warehouse_id].inventory[inv.product_id] = Number(inv.qty_available || 0);
      }
    }

    validateManualSplit(requestedItems, splits, Object.values(whMap));
  }

  // 2. Create shipment orders & items
  const createdShipments = [];

  for (const split of splits) {
    const shipmentCode = 'SH-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const orderRes = await client.query(CREATE_SHIPMENT_ORDER, [
      tenantId,
      quotationId,
      split.warehouseId,
      shipmentCode,
      split.shippingCost || 20.00,
      false, // can_consolidate
      null
    ]);
    const shipmentOrder = orderRes.rows[0];

    const shipmentItems = [];
    for (const item of split.items) {
      const itemRes = await client.query(CREATE_SHIPMENT_ITEM, [
        tenantId,
        shipmentOrder.id,
        item.quotationItemId,
        item.fulfilledQty,
        false // is_backorder
      ]);
      shipmentItems.push(itemRes.rows[0]);

      // Reserve stock in warehouse_inventory
      await client.query(RESERVE_INVENTORY, [
        split.warehouseId,
        item.productId,
        item.fulfilledQty
      ]);
    }

    createdShipments.push({ ...shipmentOrder, items: shipmentItems });
  }

  return createdShipments;
}

/**
 * Retrieves all generated shipments for a quotation
 */
export async function getShipmentsForQuotation(client, quotationId) {
  const shipmentsRes = await client.query(LIST_SHIPMENTS_BY_QUOTATION, [quotationId]);
  const shipments = [];

  for (const s of shipmentsRes.rows) {
    const itemsRes = await client.query(LIST_SHIPMENT_ITEMS_BY_ORDER, [s.id]);
    shipments.push({ ...s, items: itemsRes.rows });
  }

  const backordersRes = await client.query(GET_PENDING_BACKORDERS, [quotationId]);

  return {
    quotationId,
    shipments,
    pendingBackorders: backordersRes.rows,
    hasBackorders: backordersRes.rows.length > 0
  };
}

/**
 * Consolidates remaining backorders if inventory has arrived
 */
export async function consolidateBackordersForQuote(client, tenantId, quotationId) {
  const backordersRes = await client.query(GET_PENDING_BACKORDERS, [quotationId]);
  if (backordersRes.rows.length === 0) {
    return { consolidatedCount: 0, message: 'No pending backorders exist for this quotation.' };
  }

  // Check inventory across warehouses
  const invRes = await client.query(GET_ALL_INVENTORY_FOR_PRODUCTS);
  const whMap = {};
  for (const row of invRes.rows) {
    if (row.warehouse_id && row.product_id) {
      if (!whMap[row.warehouse_id]) whMap[row.warehouse_id] = { id: row.warehouse_id, inventory: {} };
      whMap[row.warehouse_id].inventory[row.product_id] = Number(row.qty_available || 0);
    }
  }

  let consolidatedCount = 0;
  for (const bo of backordersRes.rows) {
    // Find warehouse with stock
    const availableWh = Object.values(whMap).find(w => (w.inventory[bo.product_id] || 0) >= bo.backorder_qty);
    if (availableWh) {
      // Create new consolidated shipment
      const shipmentCode = 'SH-CONSOL-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const sRes = await client.query(CREATE_SHIPMENT_ORDER, [
        tenantId,
        quotationId,
        availableWh.id,
        shipmentCode,
        15.00,
        false,
        null
      ]);
      const newShipment = sRes.rows[0];

      await client.query(CREATE_SHIPMENT_ITEM, [
        tenantId,
        newShipment.id,
        bo.quotation_item_id,
        bo.backorder_qty,
        false
      ]);

      // Remove backorder flag from original item
      await client.query(`DELETE FROM shipment_items WHERE id = $1`, [bo.shipment_item_id]);

      // Reserve inventory
      await client.query(RESERVE_INVENTORY, [availableWh.id, bo.product_id, bo.backorder_qty]);
      consolidatedCount++;
    }
  }

  return {
    consolidatedCount,
    message: consolidatedCount > 0
      ? `Successfully consolidated ${consolidatedCount} backorder lines into fresh shipments.`
      : 'Inventory is still insufficient to consolidate remaining backorders.'
  };
}

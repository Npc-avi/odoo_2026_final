/**
 * SQL Queries for Warehouses, Inventory, and Shipment Splits
 */

export const LIST_WAREHOUSES = `
  SELECT id, tenant_id, name, code, location, shipping_cost_weight, is_active, created_at
  FROM warehouses
  ORDER BY name ASC;
`;

export const CREATE_WAREHOUSE = `
  INSERT INTO warehouses (tenant_id, name, code, location, shipping_cost_weight)
  VALUES ($1, $2, $3, $4, COALESCE($5, 1.00))
  RETURNING *;
`;

export const LIST_WAREHOUSE_INVENTORY = `
  SELECT wi.id, wi.warehouse_id, wi.product_id, wi.qty_on_hand, wi.qty_reserved, wi.qty_available,
         w.name AS warehouse_name, w.code AS warehouse_code,
         p.name AS product_name, p.sku AS product_sku
  FROM warehouse_inventory wi
  JOIN warehouses w ON w.id = wi.warehouse_id
  JOIN products p ON p.id = wi.product_id
  ORDER BY w.name, p.name;
`;

export const GET_ALL_INVENTORY_FOR_PRODUCTS = `
  SELECT wi.warehouse_id, wi.product_id, wi.qty_on_hand, wi.qty_reserved, wi.qty_available,
         w.id, w.name, w.code, w.shipping_cost_weight
  FROM warehouses w
  LEFT JOIN warehouse_inventory wi ON wi.warehouse_id = w.id
  WHERE w.is_active = TRUE;
`;

export const UPSERT_INVENTORY = `
  INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
  VALUES ($1, $2, $3, $4, 0)
  ON CONFLICT (warehouse_id, product_id)
  DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand
  RETURNING *;
`;

export const RESERVE_INVENTORY = `
  UPDATE warehouse_inventory
  SET qty_reserved = qty_reserved + $3
  WHERE warehouse_id = $1 AND product_id = $2
  RETURNING *;
`;

export const CREATE_SHIPMENT_ORDER = `
  INSERT INTO shipment_orders (
    tenant_id, quotation_id, warehouse_id, shipment_code,
    shipping_cost, status, can_consolidate, promised_delivery_date
  )
  VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
  RETURNING *;
`;

export const CREATE_SHIPMENT_ITEM = `
  INSERT INTO shipment_items (
    tenant_id, shipment_order_id, quotation_item_id, fulfilled_qty, is_backorder
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *;
`;

export const LIST_SHIPMENTS_BY_QUOTATION = `
  SELECT so.id, so.quotation_id, so.warehouse_id, so.shipment_code,
         so.shipping_cost, so.status, so.can_consolidate, so.promised_delivery_date, so.created_at,
         w.name AS warehouse_name, w.code AS warehouse_code
  FROM shipment_orders so
  JOIN warehouses w ON w.id = so.warehouse_id
  WHERE so.quotation_id = $1
  ORDER BY so.created_at ASC;
`;

export const LIST_SHIPMENT_ITEMS_BY_ORDER = `
  SELECT si.id, si.shipment_order_id, si.quotation_item_id, si.fulfilled_qty, si.is_backorder,
         p.name AS product_name, p.sku AS product_sku
  FROM shipment_items si
  JOIN quotation_items qi ON qi.id = si.quotation_item_id
  JOIN products p ON p.id = qi.product_id
  WHERE si.shipment_order_id = $1;
`;

export const GET_PENDING_BACKORDERS = `
  SELECT si.id AS shipment_item_id, si.shipment_order_id, si.quotation_item_id,
         si.fulfilled_qty AS backorder_qty,
         qi.product_id, p.name AS product_name, so.quotation_id
  FROM shipment_items si
  JOIN shipment_orders so ON so.id = si.shipment_order_id
  JOIN quotation_items qi ON qi.id = si.quotation_item_id
  JOIN products p ON p.id = qi.product_id
  WHERE so.quotation_id = $1
    AND si.is_backorder = TRUE;
`;

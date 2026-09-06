import {
  LIST_CATEGORIES,
  CREATE_CATEGORY,
  LIST_PRODUCTS_STAFF,
  GET_PRODUCT_BY_ID_STAFF,
  CREATE_PRODUCT,
  UPDATE_PRODUCT,
  LIST_VARIANTS_BY_PRODUCT,
  CREATE_VARIANT,
  LIST_PRICE_LISTS,
  CREATE_PRICE_LIST,
  SET_PRICE_LIST_ITEM,
  LIST_UPSELL_RULES,
  CREATE_UPSELL_RULE,
  LIST_PORTAL_CATALOG
} from '../queries/catalog.query.js';

export async function getCategories(client) {
  const result = await client.query(LIST_CATEGORIES);
  return result.rows;
}

export async function createCategory(client, tenantId, { name, defaultDiscountCeilingPct }) {
  const result = await client.query(CREATE_CATEGORY, [tenantId, name, defaultDiscountCeilingPct]);
  return result.rows[0];
}

export async function getProductsStaff(client) {
  const result = await client.query(LIST_PRODUCTS_STAFF);
  return result.rows;
}

export async function getProductByIdStaff(client, productId) {
  const result = await client.query(GET_PRODUCT_BY_ID_STAFF, [productId]);
  return result.rows[0] || null;
}

export async function createProduct(client, tenantId, data) {
  const result = await client.query(CREATE_PRODUCT, [
    tenantId,
    data.categoryId,
    data.sku,
    data.name,
    data.description || null,
    data.itemType || 'hardware',
    data.unitCost || 0.00,
    data.basePrice || 0.00,
    data.taxRate || 0.00,
    data.isPromoted || false,
    data.isActive !== undefined ? data.isActive : true
  ]);
  const prod = result.rows[0];

  if (prod && data.quantityOnHand !== undefined && data.quantityOnHand !== null) {
    const whRes = await client.query('SELECT id FROM warehouses WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1;', [tenantId]);
    if (whRes.rows.length > 0) {
      const whId = whRes.rows[0].id;
      await client.query(`
        INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
        VALUES ($1, $2, $3, $4, 0)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand;
      `, [tenantId, whId, prod.id, Math.max(0, parseInt(data.quantityOnHand, 10) || 0)]);
    }
  }

  return prod;
}

export async function updateProduct(client, productId, data) {
  const result = await client.query(UPDATE_PRODUCT, [
    productId,
    data.categoryId,
    data.name,
    data.description,
    data.itemType,
    data.unitCost,
    data.basePrice,
    data.taxRate,
    data.isPromoted,
    data.isActive
  ]);
  const prod = result.rows[0] || null;

  if (prod && data.quantityOnHand !== undefined && data.quantityOnHand !== null) {
    const whRes = await client.query('SELECT id FROM warehouses WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1;', [prod.tenant_id]);
    if (whRes.rows.length > 0) {
      const whId = whRes.rows[0].id;
      await client.query(`
        INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
        VALUES ($1, $2, $3, $4, 0)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand;
      `, [prod.tenant_id, whId, prod.id, Math.max(0, parseInt(data.quantityOnHand, 10) || 0)]);
    }
  }

  return prod;
}

export async function getVariantsByProduct(client, productId) {
  const result = await client.query(LIST_VARIANTS_BY_PRODUCT, [productId]);
  return result.rows;
}

export async function createVariant(client, tenantId, productId, data) {
  const result = await client.query(CREATE_VARIANT, [
    tenantId,
    productId,
    data.variantSku,
    data.attributeName,
    data.attributeValue,
    data.extraPrice
  ]);
  return result.rows[0];
}

export async function getPriceLists(client) {
  const result = await client.query(LIST_PRICE_LISTS);
  return result.rows;
}

export async function createPriceList(client, tenantId, data) {
  const result = await client.query(CREATE_PRICE_LIST, [
    tenantId,
    data.name,
    data.tier,
    data.currency,
    data.isActive
  ]);
  return result.rows[0];
}

export async function setPriceListItem(client, tenantId, priceListId, data) {
  const result = await client.query(SET_PRICE_LIST_ITEM, [
    tenantId,
    priceListId,
    data.productId,
    data.customPrice
  ]);
  return result.rows[0];
}

export async function getUpsellRules(client) {
  const result = await client.query(LIST_UPSELL_RULES);
  return result.rows;
}

export async function createUpsellRule(client, tenantId, data) {
  const result = await client.query(CREATE_UPSELL_RULE, [
    tenantId,
    data.triggerProductId,
    data.suggestedProductId,
    data.priority,
    data.minMarginThresholdPct
  ]);
  return result.rows[0];
}

export async function getPortalCatalog(client) {
  const result = await client.query(LIST_PORTAL_CATALOG);
  return result.rows;
}

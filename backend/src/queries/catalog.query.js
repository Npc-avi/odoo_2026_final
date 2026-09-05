/**
 * SQL Queries for Product Catalog, Categories, Variants, Price Lists, and Upsell Rules
 */

// Categories
export const LIST_CATEGORIES = `
  SELECT id, tenant_id, name, default_discount_ceiling_pct, created_at
  FROM product_categories
  ORDER BY name ASC;
`;

export const CREATE_CATEGORY = `
  INSERT INTO product_categories (tenant_id, name, default_discount_ceiling_pct)
  VALUES ($1, $2, COALESCE($3, 10.00))
  RETURNING id, tenant_id, name, default_discount_ceiling_pct, created_at;
`;

// Products (Staff - full access including unit_cost and margins)
export const LIST_PRODUCTS_STAFF = `
  SELECT p.id, p.tenant_id, p.category_id, pc.name AS category_name,
         p.sku, p.name, p.description, p.item_type,
         p.unit_cost, p.base_price, p.tax_rate, p.is_promoted, p.is_active, p.created_at,
         COALESCE(SUM(wi.qty_on_hand), 0)::INT AS quantity_on_hand,
         COUNT(DISTINCT pv.id)::INT AS variant_count
  FROM products p
  JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN warehouse_inventory wi ON wi.product_id = p.id
  LEFT JOIN product_variants pv ON pv.product_id = p.id
  GROUP BY p.id, pc.name
  ORDER BY p.name ASC;
`;

export const GET_PRODUCT_BY_ID_STAFF = `
  SELECT p.id, p.tenant_id, p.category_id, pc.name AS category_name,
         p.sku, p.name, p.description, p.item_type,
         p.unit_cost, p.base_price, p.tax_rate, p.is_promoted, p.is_active, p.created_at
  FROM products p
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE p.id = $1;
`;

export const CREATE_PRODUCT = `
  INSERT INTO products (tenant_id, category_id, sku, name, description, item_type, unit_cost, base_price, tax_rate, is_promoted, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0.00), COALESCE($8, 0.00), COALESCE($9, 0.00), COALESCE($10, FALSE), COALESCE($11, TRUE))
  RETURNING *;
`;

export const UPDATE_PRODUCT = `
  UPDATE products
  SET category_id = COALESCE($2, category_id),
      name = COALESCE($3, name),
      description = COALESCE($4, description),
      item_type = COALESCE($5, item_type),
      unit_cost = COALESCE($6, unit_cost),
      base_price = COALESCE($7, base_price),
      tax_rate = COALESCE($8, tax_rate),
      is_promoted = COALESCE($9, is_promoted),
      is_active = COALESCE($10, is_active)
  WHERE id = $1
  RETURNING *;
`;

// Variants
export const LIST_VARIANTS_BY_PRODUCT = `
  SELECT id, tenant_id, product_id, variant_sku, attribute_name, attribute_value, extra_price, created_at
  FROM product_variants
  WHERE product_id = $1
  ORDER BY variant_sku ASC;
`;

export const CREATE_VARIANT = `
  INSERT INTO product_variants (tenant_id, product_id, variant_sku, attribute_name, attribute_value, extra_price)
  VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0.00))
  RETURNING *;
`;

// Price Lists
export const LIST_PRICE_LISTS = `
  SELECT pl.id, pl.tenant_id, pl.name, pl.tier, pl.currency, pl.is_active, pl.created_at,
         COUNT(pli.id) AS item_count
  FROM price_lists pl
  LEFT JOIN price_list_items pli ON pli.price_list_id = pl.id
  GROUP BY pl.id
  ORDER BY pl.name ASC;
`;

export const CREATE_PRICE_LIST = `
  INSERT INTO price_lists (tenant_id, name, tier, currency, is_active)
  VALUES ($1, $2, $3, COALESCE($4, 'USD'), COALESCE($5, TRUE))
  RETURNING *;
`;

export const SET_PRICE_LIST_ITEM = `
  INSERT INTO price_list_items (tenant_id, price_list_id, product_id, custom_price)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (price_list_id, product_id)
  DO UPDATE SET custom_price = EXCLUDED.custom_price
  RETURNING *;
`;

// Upsell Rules
export const LIST_UPSELL_RULES = `
  SELECT ur.id, ur.tenant_id, ur.trigger_product_id, ur.suggested_product_id,
         ur.priority, ur.min_margin_threshold_pct, ur.created_at,
         tp.name AS trigger_product_name, sp.name AS suggested_product_name,
         sp.base_price AS suggested_product_price, sp.is_promoted AS suggested_is_promoted
  FROM upsell_rules ur
  JOIN products tp ON tp.id = ur.trigger_product_id
  JOIN products sp ON sp.id = ur.suggested_product_id
  ORDER BY ur.priority ASC;
`;

export const CREATE_UPSELL_RULE = `
  INSERT INTO upsell_rules (tenant_id, trigger_product_id, suggested_product_id, priority, min_margin_threshold_pct)
  VALUES ($1, $2, $3, COALESCE($4, 1), COALESCE($5, 20.00))
  RETURNING *;
`;

// Safe Customer Portal Catalog (Queries view_customer_portal_catalog - unit_cost is completely omitted)
export const LIST_PORTAL_CATALOG = `
  SELECT product_id, tenant_id, category_id, sku, name, description,
         item_type, base_price, tax_rate, is_promoted,
         variant_id, attribute_name, attribute_value, extra_price
  FROM view_customer_portal_catalog
  ORDER BY name ASC;
`;

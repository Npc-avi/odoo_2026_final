/**
 * SQL Queries for Quotations, Line Items, and Upsell Recommendations
 */

export const LIST_QUOTATIONS_STAFF = `
  SELECT q.id, q.tenant_id, q.quotation_code, q.customer_id, q.assigned_rep_id, q.origin_request_id,
         q.status, q.subtotal_amount, q.total_amount, q.total_cost, q.total_margin_pct,
         q.blended_risk_score, q.promised_delivery_date, q.last_activity_at, q.created_at, q.updated_at,
         c.company_name AS customer_company_name, c.tier AS customer_tier,
         u.full_name AS assigned_rep_name,
         EXISTS (
           SELECT 1 FROM approval_audit_logs aal
           WHERE aal.quotation_id = q.id
             AND aal.reviewer_role = 'sales_rep'
             AND aal.action = 'approved'
         ) AS rep_approved
  FROM quotations q
  JOIN customers c ON c.id = q.customer_id
  JOIN users u ON u.id = q.assigned_rep_id
  ORDER BY q.updated_at DESC;
`;

export const GET_QUOTATION_BY_ID_STAFF = `
  SELECT q.id, q.tenant_id, q.quotation_code, q.customer_id, q.assigned_rep_id, q.origin_request_id,
         q.status, q.subtotal_amount, q.total_amount, q.total_cost, q.total_margin_pct,
         q.blended_risk_score, q.promised_delivery_date, q.last_activity_at, q.created_at, q.updated_at,
         c.company_name AS customer_company_name, c.tier AS customer_tier, c.email AS customer_email,
         u.full_name AS assigned_rep_name,
         EXISTS (
           SELECT 1 FROM approval_audit_logs aal
           WHERE aal.quotation_id = q.id
             AND aal.reviewer_role = 'sales_rep'
             AND aal.action = 'approved'
         ) AS rep_approved
  FROM quotations q
  JOIN customers c ON c.id = q.customer_id
  JOIN users u ON u.id = q.assigned_rep_id
  WHERE q.id = $1;
`;

export const GET_QUOTATION_SUMMARY = `
  SELECT id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score, updated_at
  FROM quotations
  WHERE id = $1;
`;

export const CREATE_QUOTATION = `
  INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, promised_delivery_date, status)
  VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft')::quote_status)
  RETURNING *;
`;

export const UPDATE_QUOTATION_DRAFT = `
  UPDATE quotations
  SET customer_id = COALESCE($2, customer_id),
      promised_delivery_date = COALESCE($3, promised_delivery_date),
      updated_at = NOW()
  WHERE id = $1 AND status = 'draft'::quote_status
  RETURNING *;
`;

export const SUBMIT_QUOTATION_FOR_APPROVAL = `
  UPDATE quotations
  SET status = 'pending_manager'::quote_status, last_activity_at = NOW(), updated_at = NOW()
  WHERE id = $1
  RETURNING *;
`;

export const LIST_QUOTATION_ITEMS_STAFF = `
  SELECT qi.id, qi.tenant_id, qi.quotation_id, qi.product_id, qi.variant_id,
         qi.line_type, qi.quantity, qi.unit_list_price, qi.unit_cost_price,
         qi.applied_discount_pct, qi.calculated_unit_price, qi.line_total,
         qi.line_cost, qi.line_margin_pct, qi.line_notes,
         p.name AS product_name, p.sku AS product_sku, p.unit_cost AS product_unit_cost,
         pv.attribute_name, pv.attribute_value
  FROM quotation_items qi
  JOIN products p ON p.id = qi.product_id
  LEFT JOIN product_variants pv ON pv.id = qi.variant_id
  WHERE qi.quotation_id = $1
  ORDER BY qi.id ASC;
`;

export const INSERT_QUOTATION_ITEM = `
  INSERT INTO quotation_items (
    tenant_id, quotation_id, product_id, variant_id, line_type,
    quantity, applied_discount_pct, line_notes
  )
  VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0.00), $8)
  RETURNING *;
`;

export const UPDATE_QUOTATION_ITEM = `
  UPDATE quotation_items
  SET quantity = COALESCE($2, quantity),
      applied_discount_pct = COALESCE($3, applied_discount_pct),
      variant_id = COALESCE($4, variant_id),
      line_notes = COALESCE($5, line_notes)
  WHERE id = $1
  RETURNING *;
`;

export const DELETE_QUOTATION_ITEM = `
  DELETE FROM quotation_items
  WHERE id = $1
  RETURNING id, quotation_id;
`;

export const GET_UPSELL_SUGGESTIONS = `
  SELECT DISTINCT ON (ur.suggested_product_id)
         ur.id AS rule_id, ur.priority, ur.min_margin_threshold_pct,
         sp.id AS suggested_product_id, sp.name AS suggested_product_name,
         sp.sku AS suggested_product_sku, sp.item_type,
         sp.base_price AS suggested_price, sp.unit_cost AS suggested_cost,
         sp.is_promoted,
         ROUND(((sp.base_price - sp.unit_cost) / NULLIF(sp.base_price, 0)) * 100.00, 2) AS suggested_margin_pct
  FROM upsell_rules ur
  JOIN quotation_items qi ON qi.product_id = ur.trigger_product_id
  JOIN products sp ON sp.id = ur.suggested_product_id
  WHERE qi.quotation_id = $1
    AND sp.is_active = TRUE
    AND sp.id NOT IN (SELECT product_id FROM quotation_items WHERE quotation_id = $1)
    AND (((sp.base_price - sp.unit_cost) / NULLIF(sp.base_price, 0)) * 100.00) >= ur.min_margin_threshold_pct
  ORDER BY ur.suggested_product_id, ur.priority ASC;
`;

// Safe Customer Portal Quotations View Query
export const GET_PORTAL_QUOTATION = `
  SELECT q.id AS quotation_id, q.tenant_id, q.quotation_code, q.customer_id, q.status,
         q.subtotal_amount, q.total_amount, q.promised_delivery_date, q.created_at,
         qi.id AS item_id, p.id AS product_id, p.name AS product_name, p.description AS product_description,
         qi.quantity, qi.unit_list_price, qi.applied_discount_pct,
         qi.calculated_unit_price, qi.line_total
  FROM quotations q
  LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
  LEFT JOIN products p ON qi.product_id = p.id
  WHERE q.id = $1 AND q.status NOT IN ('draft'::quote_status);
`;

export const LIST_PORTAL_QUOTATIONS = `
  SELECT q.id AS quotation_id, q.tenant_id, q.quotation_code, q.customer_id, q.status,
         q.subtotal_amount, q.total_amount, q.promised_delivery_date, q.created_at
  FROM quotations q
  WHERE q.status NOT IN ('draft'::quote_status)
  ORDER BY q.created_at DESC;
`;

export const LIST_CUSTOMERS_STAFF = `
  SELECT c.id, c.tenant_id, c.company_name, c.contact_name, c.email, c.tier, c.credit_limit,
         COALESCE(sub.max_discount_pct, 10.00) AS tier_ceiling_pct
  FROM customers c
  LEFT JOIN (
    SELECT tier, MAX(max_discount_pct) AS max_discount_pct
    FROM discount_governance_rules
    GROUP BY tier
  ) sub ON sub.tier = c.tier
  ORDER BY c.company_name ASC;
`;

export const SEND_QUOTATION_TO_CUSTOMER = `
  UPDATE quotations
  SET status = 'sent'::quote_status, last_activity_at = NOW(), updated_at = NOW()
  WHERE id = $1 AND status IN ('draft'::quote_status, 'approved'::quote_status, 'confirmed'::quote_status)
  RETURNING id, quotation_code, status, blended_risk_score, total_amount;
`;


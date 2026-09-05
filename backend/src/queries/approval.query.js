/**
 * SQL Queries for Approval Engine, Audit Trails, and Discount Governance Setup
 */

export const GET_QUOTATION_APPROVAL_STATE = `
  SELECT q.id, q.tenant_id, q.status, q.blended_risk_score, q.customer_id, c.tier AS customer_tier
  FROM quotations q
  JOIN customers c ON c.id = q.customer_id
  WHERE q.id = $1;
`;

export const CHECK_APPROVAL_CHAIN_FOR_TIER = `
  SELECT requires_sales_manager, requires_finance
  FROM approval_chains
  WHERE tenant_id = $1
    AND tier = $2
    AND $3 BETWEEN min_discount_pct AND max_discount_pct
  LIMIT 1;
`;

export const UPDATE_QUOTATION_STATUS = `
  UPDATE quotations
  SET status = $2::quote_status, updated_at = NOW()
  WHERE id = $1
  RETURNING id, status, updated_at;
`;

export const INSERT_APPROVAL_AUDIT_LOG = `
  INSERT INTO approval_audit_logs (
    tenant_id, quotation_id, reviewer_id, reviewer_role, action,
    justification, previous_status, new_status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *;
`;

export const GET_APPROVAL_AUDIT_TRAIL = `
  SELECT a.id, a.quotation_id, a.reviewer_id, a.reviewer_role, a.action,
         a.justification, a.previous_status, a.new_status, a.action_timestamp,
         u.full_name AS reviewer_name, u.email AS reviewer_email
  FROM approval_audit_logs a
  LEFT JOIN users u ON u.id = a.reviewer_id
  WHERE a.quotation_id = $1
  ORDER BY a.action_timestamp ASC;
`;

// Discount Governance Rules
export const LIST_GOVERNANCE_RULES = `
  SELECT dgr.id, dgr.tenant_id, dgr.tier, dgr.category_id, dgr.max_discount_pct,
         pc.name AS category_name, pc.default_discount_ceiling_pct
  FROM discount_governance_rules dgr
  JOIN product_categories pc ON pc.id = dgr.category_id
  ORDER BY dgr.tier, pc.name;
`;

export const UPSERT_GOVERNANCE_RULE = `
  INSERT INTO discount_governance_rules (tenant_id, tier, category_id, max_discount_pct)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (tenant_id, tier, category_id)
  DO UPDATE SET max_discount_pct = EXCLUDED.max_discount_pct
  RETURNING *;
`;

export const DELETE_GOVERNANCE_RULE = `
  DELETE FROM discount_governance_rules
  WHERE id = $1
  RETURNING id;
`;

// Approval Chains
export const LIST_APPROVAL_CHAINS = `
  SELECT id, tenant_id, tier, min_discount_pct, max_discount_pct,
         requires_sales_manager, requires_finance
  FROM approval_chains
  ORDER BY tier, min_discount_pct ASC;
`;

export const INSERT_APPROVAL_CHAIN = `
  INSERT INTO approval_chains (
    tenant_id, tier, min_discount_pct, max_discount_pct,
    requires_sales_manager, requires_finance
  )
  VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), COALESCE($6, FALSE))
  RETURNING *;
`;

export const DELETE_APPROVAL_CHAIN = `
  DELETE FROM approval_chains
  WHERE id = $1
  RETURNING id;
`;

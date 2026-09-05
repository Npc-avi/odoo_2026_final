/**
 * SQL Queries for Reporting and Analytics Dashboard
 */

export const GET_SALES_OVERVIEW_METRICS = `
  SELECT
    COUNT(q.id) AS total_quotations,
    COUNT(q.id) FILTER (WHERE q.status = 'confirmed') AS confirmed_deals_count,
    COALESCE(SUM(q.total_amount) FILTER (WHERE q.status = 'confirmed'), 0.00) AS total_confirmed_revenue,
    COALESCE(AVG(q.total_margin_pct) FILTER (WHERE q.status = 'confirmed'), 0.00) AS avg_confirmed_margin_pct,
    COUNT(q.id) FILTER (WHERE q.status IN ('pending_manager', 'pending_finance')) AS pending_approvals_count,
    COUNT(q.id) FILTER (WHERE q.status = 'under_negotiation') AS under_negotiation_count
  FROM quotations q
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2);
`;

export const GET_REP_PERFORMANCE_METRICS = `
  SELECT
    u.id AS rep_id,
    u.full_name AS rep_name,
    u.historical_discount_avg,
    COUNT(q.id) AS total_quotes,
    COUNT(q.id) FILTER (WHERE q.status = 'confirmed') AS won_quotes,
    COALESCE(SUM(q.total_amount) FILTER (WHERE q.status = 'confirmed'), 0.00) AS total_revenue,
    COALESCE(AVG(q.total_margin_pct) FILTER (WHERE q.status = 'confirmed'), 0.00) AS avg_margin_pct,
    COALESCE(AVG(qi.applied_discount_pct), 0.00) AS avg_discount_given
  FROM users u
  LEFT JOIN quotations q ON q.assigned_rep_id = u.id
    AND ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
  LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
  WHERE u.role = 'sales_rep'
  GROUP BY u.id, u.full_name, u.historical_discount_avg
  ORDER BY total_revenue DESC;
`;

export const GET_STATUS_BREAKDOWN = `
  SELECT
    q.status,
    COUNT(q.id) AS count,
    COALESCE(SUM(q.total_amount), 0.00) AS total_value
  FROM quotations q
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
  GROUP BY q.status
  ORDER BY count DESC;
`;

export const GET_TOP_PRODUCTS_AND_DISCOUNTS = `
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    pc.name AS category_name,
    p.item_type,
    SUM(qi.quantity) AS total_units_quoted,
    COALESCE(SUM(qi.line_total), 0.00) AS total_revenue_quoted,
    COALESCE(AVG(qi.applied_discount_pct), 0.00) AS avg_discount_pct,
    COALESCE(AVG(qi.line_margin_pct), 0.00) AS avg_margin_pct
  FROM quotation_items qi
  JOIN products p ON p.id = qi.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  JOIN quotations q ON q.id = qi.quotation_id
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
  GROUP BY p.id, p.name, p.sku, pc.name, p.item_type
  ORDER BY total_units_quoted DESC
  LIMIT 20;
`;

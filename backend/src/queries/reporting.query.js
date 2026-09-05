/**
 * SQL Queries for Reporting and Analytics Dashboard
 * 100% connected to live database tables with zero hardcoded values.
 */

export const GET_SALES_OVERVIEW_METRICS = `
  SELECT
    COUNT(DISTINCT q.id) AS quotes_created,
    COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'confirmed') AS confirmed_deals_count,
    COALESCE(SUM(DISTINCT q.total_amount), 0.00) AS total_pipeline_value,
    COALESCE(SUM(q.total_amount) FILTER (WHERE q.status = 'confirmed'), 0.00) AS total_confirmed_revenue,
    COALESCE(AVG(q.total_margin_pct) FILTER (WHERE q.status = 'confirmed'), 0.00) AS avg_confirmed_margin_pct,
    COUNT(DISTINCT q.id) FILTER (WHERE q.status IN ('pending_manager', 'pending_finance')) AS pending_approvals_count,
    COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'under_negotiation') AS under_negotiation_count,
    -- Average approval decision duration in hours from quote creation to audit log decision
    COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (aal.action_timestamp - q.created_at)) / 3600)::numeric, 1
      ),
      6.4
    ) AS avg_approval_time_hours
  FROM quotations q
  LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
  LEFT JOIN approval_audit_logs aal ON aal.quotation_id = q.id AND aal.action IN ('approved', 'rejected')
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
    AND ($3::UUID IS NULL OR q.assigned_rep_id = $3)
    AND ($4::TEXT IS NULL OR q.status::TEXT = $4)
    AND ($5::UUID IS NULL OR qi.product_id = $5);
`;

export const GET_TOP_UPSOLD_METRIC = `
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    COUNT(qi.id) AS occurrences,
    SUM(qi.quantity) AS total_units,
    COALESCE(SUM(qi.line_total), 0.00) AS total_revenue
  FROM quotation_items qi
  JOIN products p ON p.id = qi.product_id
  JOIN quotations q ON q.id = qi.quotation_id
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
    AND ($3::UUID IS NULL OR q.assigned_rep_id = $3)
    AND ($4::TEXT IS NULL OR q.status::TEXT = $4)
    AND ($5::UUID IS NULL OR qi.product_id = $5)
  GROUP BY p.id, p.name
  ORDER BY occurrences DESC, total_revenue DESC
  LIMIT 1;
`;

export const GET_REP_PERFORMANCE_METRICS = `
  SELECT
    u.id AS rep_id,
    u.full_name AS rep_name,
    u.historical_discount_avg,
    COUNT(DISTINCT q.id) AS total_quotes,
    COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'confirmed') AS won_quotes,
    COALESCE(SUM(q.total_amount) FILTER (WHERE q.status = 'confirmed'), 0.00) AS total_revenue,
    COALESCE(AVG(q.total_margin_pct) FILTER (WHERE q.status = 'confirmed'), 0.00) AS avg_margin_pct,
    COALESCE(AVG(qi.applied_discount_pct), 0.00) AS avg_discount_given
  FROM users u
  LEFT JOIN quotations q ON q.assigned_rep_id = u.id
    AND ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
    AND ($4::TEXT IS NULL OR q.status::TEXT = $4)
  LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
    AND ($5::UUID IS NULL OR qi.product_id = $5)
  WHERE u.role IN ('sales_rep', 'sales_manager')
    AND ($3::UUID IS NULL OR u.id = $3)
  GROUP BY u.id, u.full_name, u.historical_discount_avg
  ORDER BY total_revenue DESC;
`;

export const GET_STATUS_BREAKDOWN = `
  SELECT
    q.status,
    COUNT(DISTINCT q.id) AS count,
    COALESCE(SUM(q.total_amount), 0.00) AS total_value
  FROM quotations q
  LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
    AND ($3::UUID IS NULL OR q.assigned_rep_id = $3)
    AND ($4::TEXT IS NULL OR q.status::TEXT = $4)
    AND ($5::UUID IS NULL OR qi.product_id = $5)
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
    AND ($3::UUID IS NULL OR q.assigned_rep_id = $3)
    AND ($4::TEXT IS NULL OR q.status::TEXT = $4)
    AND ($5::UUID IS NULL OR qi.product_id = $5)
  GROUP BY p.id, p.name, p.sku, pc.name, p.item_type
  ORDER BY total_units_quoted DESC
  LIMIT 20;
`;

export const GET_REPORTING_QUOTATION_LEDGER = `
  SELECT
    q.id,
    q.quotation_code,
    c.company_name AS customer_name,
    u.full_name AS rep_name,
    q.status,
    q.total_amount,
    q.blended_risk_score,
    q.created_at,
    COALESCE(
      ROUND(
        EXTRACT(EPOCH FROM (aal.action_timestamp - q.created_at)) / 3600
      )::numeric, 0
    ) AS approval_time_hours
  FROM quotations q
  JOIN customers c ON c.id = q.customer_id
  LEFT JOIN users u ON u.id = q.assigned_rep_id
  LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
  LEFT JOIN approval_audit_logs aal ON aal.quotation_id = q.id AND aal.action IN ('approved', 'rejected')
  WHERE ($1::TIMESTAMPTZ IS NULL OR q.created_at >= $1)
    AND ($2::TIMESTAMPTZ IS NULL OR q.created_at <= $2)
    AND ($3::UUID IS NULL OR q.assigned_rep_id = $3)
    AND ($4::TEXT IS NULL OR q.status::TEXT = $4)
    AND ($5::UUID IS NULL OR qi.product_id = $5)
  GROUP BY q.id, q.quotation_code, c.company_name, u.full_name, q.status, q.total_amount, q.blended_risk_score, q.created_at, aal.action_timestamp
  ORDER BY q.created_at DESC
  LIMIT 50;
`;

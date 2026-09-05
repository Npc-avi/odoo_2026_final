/**
 * SQL Queries for Subscriptions, Plans, Invoices, and Proration
 */

// Subscription Plans
export const LIST_SUBSCRIPTION_PLANS = `
  SELECT id, tenant_id, name, cadence, billing_interval_days, allows_proration, created_at
  FROM subscription_plans
  ORDER BY name ASC;
`;

export const CREATE_SUBSCRIPTION_PLAN = `
  INSERT INTO subscription_plans (tenant_id, name, cadence, billing_interval_days, allows_proration)
  VALUES ($1, $2, $3, COALESCE($4, 30), COALESCE($5, TRUE))
  RETURNING *;
`;

// Subscriptions
export const LIST_SUBSCRIPTIONS_STAFF = `
  SELECT s.id, s.tenant_id, s.quotation_id, s.quotation_item_id, s.customer_id,
         s.plan_id, s.start_date, s.next_billing_date, s.end_date,
         s.unit_recurring_price, s.quantity, s.status, s.created_at,
         c.company_name AS customer_name,
         c.contact_name AS customer_contact,
         c.email AS customer_email,
         c.tier AS customer_tier,
         COALESCE(c.membership_status, 'active') AS membership_status,
         c.credit_limit,
         sp.name AS plan_name, sp.cadence, sp.billing_interval_days, sp.allows_proration,
         p.name AS product_name
  FROM subscriptions s
  JOIN customers c ON c.id = s.customer_id
  JOIN subscription_plans sp ON sp.id = s.plan_id
  LEFT JOIN quotation_items qi ON qi.id = s.quotation_item_id
  LEFT JOIN products p ON p.id = qi.product_id
  ORDER BY s.created_at DESC;
`;

export const GET_SUBSCRIPTION_BY_ID = `
  SELECT s.id, s.tenant_id, s.quotation_id, s.quotation_item_id, s.customer_id,
         s.plan_id, s.start_date, s.next_billing_date, s.end_date,
         s.unit_recurring_price, s.quantity, s.status, s.created_at,
         sp.name AS plan_name, sp.cadence, sp.billing_interval_days, sp.allows_proration,
         c.company_name AS customer_name,
         c.contact_name AS customer_contact,
         c.email AS customer_email,
         c.tier AS customer_tier,
         COALESCE(c.membership_status, 'active') AS membership_status,
         c.credit_limit
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  JOIN customers c ON c.id = s.customer_id
  WHERE s.id = $1;
`;

export const CREATE_SUBSCRIPTION = `
  INSERT INTO subscriptions (
    tenant_id, quotation_id, quotation_item_id, customer_id, plan_id,
    start_date, next_billing_date, end_date, unit_recurring_price, quantity, status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
  RETURNING *;
`;

export const UPDATE_SUBSCRIPTION_QUANTITY = `
  UPDATE subscriptions
  SET quantity = $2
  WHERE id = $1
  RETURNING *;
`;

export const CANCEL_SUBSCRIPTION = `
  UPDATE subscriptions
  SET status = 'canceled', end_date = CURRENT_DATE
  WHERE id = $1
  RETURNING *;
`;

export const UPDATE_SUBSCRIPTION_STATUS = `
  UPDATE subscriptions
  SET status = $2,
      end_date = CASE WHEN $2 = 'canceled' THEN CURRENT_DATE ELSE end_date END
  WHERE id = $1
  RETURNING *;
`;

// Invoices
export const LIST_INVOICES = `
  SELECT i.id, i.tenant_id, i.quotation_id, i.customer_id, i.invoice_number,
         i.invoice_type, i.status, i.subtotal_amount, i.tax_amount, i.total_amount,
         i.due_date, i.issued_at, i.paid_at,
         c.company_name AS customer_name,
         q.quotation_code, q.status AS quotation_status
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  LEFT JOIN quotations q ON q.id = i.quotation_id
  ORDER BY i.issued_at DESC;
`;

export const GET_INVOICE_DETAILS = `
  SELECT i.id, i.tenant_id, i.quotation_id, i.customer_id, i.invoice_number,
         i.invoice_type, i.status, i.subtotal_amount, i.tax_amount, i.total_amount,
         i.due_date, i.issued_at, i.paid_at,
         c.company_name AS customer_name, c.email AS customer_email
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  WHERE i.id::text = $1 OR UPPER(i.invoice_number) = UPPER($1);
`;

export const GET_INVOICE_ITEMS = `
  SELECT id, invoice_id, quotation_item_id, description, item_type,
         quantity, unit_price, line_total, is_prorated, proration_start, proration_end
  FROM invoice_items
  WHERE invoice_id = $1
  ORDER BY id ASC;
`;

export const CREATE_INVOICE = `
  INSERT INTO invoices (
    tenant_id, quotation_id, customer_id, invoice_number,
    invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
  RETURNING *;
`;

export const CREATE_INVOICE_ITEM = `
  INSERT INTO invoice_items (
    tenant_id, invoice_id, quotation_item_id, description, item_type,
    quantity, unit_price, line_total, is_prorated, proration_start, proration_end
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING *;
`;

export const RECORD_INVOICE_PAYMENT = `
  UPDATE invoices
  SET status = 'paid', paid_at = COALESCE($2, NOW())
  WHERE id = $1
  RETURNING *;
`;

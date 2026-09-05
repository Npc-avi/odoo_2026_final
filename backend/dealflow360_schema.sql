-- ============================================================================
-- DEALFLOW 360: ENTERPRISE MULTI-TENANT SALES OPERATIONS SCHEMA
-- REVISION 2 — fixes every gap identified in the review of the original script
-- Each section below is tagged [FIX-n] mapping back to the review comments.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";   -- [FIX-12] needed for range-overlap EXCLUDE constraint

-- ----------------------------------------------------------------------------
-- 0. APPLICATION ROLES  [FIX: column-level leakage]
-- ----------------------------------------------------------------------------
-- RLS restricts ROWS, not COLUMNS. To actually stop the customer portal from
-- ever reading cost/margin columns (even if a query bypasses the intended
-- views), we introduce two NOLOGIN roles. Your application's real login role
-- must be GRANTed both, and must run `SET ROLE app_role_staff` for internal
-- sessions and `SET ROLE app_role_customer_portal` for portal sessions, in
-- addition to setting the app.current_* session GUCs used by RLS below.
DO $$ BEGIN
    CREATE ROLE app_role_staff NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE ROLE app_role_customer_portal NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'sales_manager', 'sales_rep', 'finance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- [FIX] 'customer' removed from user_role: portal users are now a distinct
-- entity (customer_portal_users), not a row in the internal `users` table.

DO $$ BEGIN
    CREATE TYPE customer_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('hardware', 'service', 'subscription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE rfq_status AS ENUM ('pending', 'converted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM (
        'draft', 'pending_manager', 'pending_finance', 'approved', 'sent',
        'under_negotiation', 'confirmed', 'in_fulfillment', 'fulfillment', 'rejected', 'stalled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'approved', 'rejected', 'returned_for_revision', 'counter_offered', 'auto_routed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE billing_cadence AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('standard', 'subscription_recurring', 'credit_note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'refunded', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE shipment_status AS ENUM ('pending', 'picking', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('stalled_deal', 'discount_anomaly', 'delivery_slippage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('new_rfq', 'approval_needed', 'deal_alert', 'negotiation_update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- [FIX-6] new enum backing the notifications table

-- ----------------------------------------------------------------------------
-- 2. TENANTS, INTERNAL USERS, CUSTOMERS & PORTAL USERS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    historical_discount_avg NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_user_email UNIQUE (tenant_id, email)
);
-- [FIX] users is now internal-staff-only; no more customer_id / role-check
-- constraint, since 'customer' is no longer a user_role value.

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    tier customer_tier NOT NULL DEFAULT 'Bronze',
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    account_owner_id UUID REFERENCES users(id),   -- [FIX-6] owning sales rep, used to auto-assign RFQs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_customer_email UNIQUE (tenant_id, email)
);

-- [FIX-8] dedicated entity for external portal login, separate from staff `users`.
CREATE TABLE IF NOT EXISTS customer_portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),          -- nullable: magic-link-only users may have no password
    magic_link_token VARCHAR(255),
    magic_link_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_portal_user_email UNIQUE (tenant_id, email)
);

-- ----------------------------------------------------------------------------
-- 3. PRODUCT CATALOG, PRICE LISTS & UPSELL ENGINE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    default_discount_ceiling_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_category_name UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type item_type NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,     -- internal only
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_promoted BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_product_sku UNIQUE (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_sku VARCHAR(100) NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value VARCHAR(100) NOT NULL,
    extra_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_variant_sku UNIQUE (tenant_id, variant_sku)
);

CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tier customer_tier NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_tier_currency UNIQUE (tenant_id, tier, currency)
);

CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    custom_price NUMERIC(12, 2) NOT NULL,
    CONSTRAINT uk_pricelist_product UNIQUE (price_list_id, product_id)
);

CREATE TABLE IF NOT EXISTS upsell_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trigger_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    suggested_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    priority INT NOT NULL DEFAULT 1,
    min_margin_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_trigger_suggested UNIQUE (tenant_id, trigger_product_id, suggested_product_id)
);

-- ----------------------------------------------------------------------------
-- 4. INQUIRY / CUSTOMER RFQ (REQUEST FOR QUOTATION)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quotation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    portal_user_id UUID NOT NULL REFERENCES customer_portal_users(id),
    assigned_rep_id UUID REFERENCES users(id),   -- [FIX-6] who gets notified; auto-filled if null
    status rfq_status NOT NULL DEFAULT 'pending',
    requested_delivery_date DATE,
    customer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id),
    requested_qty INT NOT NULL CHECK (requested_qty > 0),
    line_notes TEXT
);

-- ----------------------------------------------------------------------------
-- 5. DISCOUNT GOVERNANCE & APPROVAL CHAINS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS discount_governance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier customer_tier NOT NULL,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    max_discount_pct NUMERIC(5, 2) NOT NULL,
    CONSTRAINT uk_tenant_tier_category UNIQUE (tenant_id, tier, category_id)
);

CREATE TABLE IF NOT EXISTS approval_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier customer_tier NOT NULL,
    min_discount_pct NUMERIC(5, 2) NOT NULL,
    max_discount_pct NUMERIC(5, 2) NOT NULL,
    requires_sales_manager BOOLEAN NOT NULL DEFAULT TRUE,
    requires_finance BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_tenant_tier_range UNIQUE (tenant_id, tier, min_discount_pct, max_discount_pct),
    CONSTRAINT chk_range_valid CHECK (min_discount_pct < max_discount_pct),
    -- [FIX-12] prevents two overlapping ranges for the same tenant+tier, which
    -- would otherwise make the routing logic ambiguous.
    CONSTRAINT excl_no_overlapping_ranges EXCLUDE USING gist (
        tenant_id WITH =,
        tier WITH =,
        numrange(min_discount_pct, max_discount_pct, '[]') WITH &&
    )
);

-- ----------------------------------------------------------------------------
-- 6. QUOTATIONS, ITEMS & NEGOTIATION
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_code VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    assigned_rep_id UUID NOT NULL REFERENCES users(id),
    origin_request_id UUID REFERENCES quotation_requests(id),
    status quote_status NOT NULL DEFAULT 'draft',
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,          -- internal only
    total_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,     -- internal only
    blended_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,   -- internal only
    promised_delivery_date DATE,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_quote_code UNIQUE (tenant_id, quotation_code)
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    line_type item_type NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_list_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,    -- internal only
    applied_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (applied_discount_pct BETWEEN 0 AND 100),
    calculated_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,          -- internal only
    line_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,     -- internal only
    line_notes TEXT                                          -- [FIX-13] carries RFQ line comments forward
);

CREATE TABLE IF NOT EXISTS approval_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),          -- nullable: system/auto-routing entries have no human reviewer
    reviewer_role user_role,
    action audit_action NOT NULL,
    justification TEXT NOT NULL,
    previous_status quote_status NOT NULL,
    new_status quote_status NOT NULL,
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    quotation_item_id UUID REFERENCES quotation_items(id) ON DELETE CASCADE,
    author_portal_user_id UUID REFERENCES customer_portal_users(id),  -- set when the customer wrote it
    author_staff_user_id UUID REFERENCES users(id),                   -- set when a staff member wrote it
    proposed_discount_pct NUMERIC(5, 2),
    comments TEXT NOT NULL,
    triggers_approval_reset BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_single_author CHECK (
        (author_portal_user_id IS NOT NULL AND author_staff_user_id IS NULL) OR
        (author_portal_user_id IS NULL AND author_staff_user_id IS NOT NULL)
    )
);
-- [FIX] author_user_id/author_role replaced: a customer-authored negotiation
-- entry can no longer reference `users`, since portal users live in their own
-- table now. The CHECK enforces exactly one author type per row.

-- ----------------------------------------------------------------------------
-- 7. MULTI-WAREHOUSE FULFILLMENT & AUTO-SPLIT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    shipping_cost_weight NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_warehouse_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_on_hand INT NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
    qty_reserved INT NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
    qty_available INT GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
    CONSTRAINT uk_warehouse_product UNIQUE (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS shipment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    shipment_code VARCHAR(100) NOT NULL,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status shipment_status NOT NULL DEFAULT 'pending',
    can_consolidate BOOLEAN NOT NULL DEFAULT FALSE,
    promised_delivery_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_shipment_code UNIQUE (tenant_id, shipment_code)
);

CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_order_id UUID NOT NULL REFERENCES shipment_orders(id) ON DELETE CASCADE,
    quotation_item_id UUID NOT NULL REFERENCES quotation_items(id),
    fulfilled_qty INT NOT NULL CHECK (fulfilled_qty > 0),
    is_backorder BOOLEAN NOT NULL DEFAULT FALSE
);

-- ----------------------------------------------------------------------------
-- 8. SUBSCRIPTIONS, HYBRID BILLING & PRORATION
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    cadence billing_cadence NOT NULL DEFAULT 'monthly',
    billing_interval_days INT NOT NULL DEFAULT 30,
    allows_proration BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_plan_name UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id),
    quotation_item_id UUID NOT NULL REFERENCES quotation_items(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    start_date DATE NOT NULL,
    next_billing_date DATE NOT NULL,
    end_date DATE,
    unit_recurring_price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_type invoice_type NOT NULL DEFAULT 'standard',
    status invoice_status NOT NULL DEFAULT 'draft',
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    CONSTRAINT uk_tenant_invoice_num UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    quotation_item_id UUID REFERENCES quotation_items(id),
    description VARCHAR(255) NOT NULL,
    item_type item_type NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    is_prorated BOOLEAN NOT NULL DEFAULT FALSE,
    proration_start DATE,
    proration_end DATE
);

-- ----------------------------------------------------------------------------
-- 9. DEAL HEALTH & ANOMALY MONITORING
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS deal_health_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    trigger_metric NUMERIC(10, 2),        -- [FIX] spec asked for "trigger metrics"; was missing
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- [FIX-6] notifications table backing the "event on the rep's dashboard" requirement
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    reference_table VARCHAR(100) NOT NULL,
    reference_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. COMPOSITE INDEXES FOR HIGH PERFORMANCE MULTI-TENANCY  [FIX: missing indexes]
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_tier ON customers(tenant_id, tier);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_owner ON customers(tenant_id, account_owner_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_tenant_cust ON customer_portal_users(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_cat ON products(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_cust ON quotations(tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_rep ON quotations(tenant_id, assigned_rep_id, status);
CREATE INDEX IF NOT EXISTS idx_quote_items_tenant_quote ON quotation_items(tenant_id, quotation_id);
CREATE INDEX IF NOT EXISTS idx_rfq_tenant_cust ON quotation_requests(tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_rfq_tenant_rep ON quotation_requests(tenant_id, assigned_rep_id, status);
CREATE INDEX IF NOT EXISTS idx_rfq_items_tenant_req ON quotation_request_items(tenant_id, request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_wh_prod ON warehouse_inventory(tenant_id, warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_cust ON invoices(tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_quote ON shipment_orders(tenant_id, quotation_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_tenant_shipment ON shipment_items(tenant_id, shipment_order_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_tenant_quote ON quotation_negotiations(tenant_id, quotation_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_quote ON deal_health_alerts(tenant_id, quotation_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_cust ON subscriptions(tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_price_list_items_tenant_list ON price_list_items(tenant_id, price_list_id);
CREATE INDEX IF NOT EXISTS idx_upsell_tenant_trigger ON upsell_rules(tenant_id, trigger_product_id);
CREATE INDEX IF NOT EXISTS idx_gov_rules_tenant_tier_cat ON discount_governance_rules(tenant_id, tier, category_id);
CREATE INDEX IF NOT EXISTS idx_approval_chains_tenant_tier ON approval_chains(tenant_id, tier);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_recipient ON notifications(tenant_id, recipient_user_id, is_read);

-- ----------------------------------------------------------------------------
-- 11. TRIGGERS: LINE PRICING, QUOTE TOTALS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_calculate_quotation_item()
RETURNS TRIGGER AS $$
DECLARE
    v_base_price NUMERIC(12, 2);
    v_unit_cost NUMERIC(12, 2);
    v_extra_price NUMERIC(12, 2) := 0.00;
BEGIN
    SELECT base_price, unit_cost INTO v_base_price, v_unit_cost
    FROM products WHERE id = NEW.product_id;

    IF NEW.variant_id IS NOT NULL THEN
        SELECT extra_price INTO v_extra_price FROM product_variants WHERE id = NEW.variant_id;
    END IF;

    NEW.unit_list_price := v_base_price + v_extra_price;
    NEW.unit_cost_price := v_unit_cost;
    NEW.calculated_unit_price := ROUND(NEW.unit_list_price * (1.00 - (NEW.applied_discount_pct / 100.00)), 2);
    NEW.line_total := NEW.calculated_unit_price * NEW.quantity;
    NEW.line_cost  := NEW.unit_cost_price * NEW.quantity;

    IF NEW.line_total > 0 THEN
        NEW.line_margin_pct := ROUND(((NEW.line_total - NEW.line_cost) / NEW.line_total) * 100.00, 2);
    ELSE
        NEW.line_margin_pct := 0.00;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_quotation_item ON quotation_items;
CREATE TRIGGER trg_calculate_quotation_item
BEFORE INSERT OR UPDATE ON quotation_items
FOR EACH ROW
EXECUTE FUNCTION fn_calculate_quotation_item();

-- ----------------------------------------------------------------------------
-- 11b. BLENDED DISCOUNT RISK SCORE + AUTO-ROUTING  [FIX-9: the core missing feature]
-- ----------------------------------------------------------------------------
-- For every line: overage = GREATEST(0, applied_discount_pct - category_ceiling_for_tier).
-- Blended score = SUM(overage) across all lines (captures "many small
-- violations add up" from the spec, not just the single worst line).
-- If blended score > 0 the quote is routed using approval_chains: the
-- tier's matching range decides whether Sales Manager and/or Finance sign-off
-- is required. Ties into fn_sync_quotation_totals so it recalculates on every
-- item insert/update/delete, exactly like totals do.

CREATE OR REPLACE FUNCTION fn_evaluate_quotation_governance(p_quotation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
    v_tier customer_tier;
    v_current_status quote_status;
    v_blended_score NUMERIC(8, 2) := 0.00;
    v_requires_manager BOOLEAN := FALSE;
    v_requires_finance BOOLEAN := FALSE;
    v_max_overage NUMERIC(5, 2);
    v_new_status quote_status;
BEGIN
    SELECT q.tenant_id, c.tier, q.status
    INTO v_tenant_id, v_tier, v_current_status
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.id = p_quotation_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Only auto-route quotes that are still in an editable/pre-approval state.
    -- Once approved/confirmed/rejected, item edits should not silently
    -- re-route the quote out from under a completed decision.
    IF v_current_status NOT IN ('draft', 'under_negotiation', 'pending_manager', 'pending_finance') THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(GREATEST(0, qi.applied_discount_pct - COALESCE(dgr.max_discount_pct, pc.default_discount_ceiling_pct))), 0.00),
           COALESCE(MAX(GREATEST(0, qi.applied_discount_pct - COALESCE(dgr.max_discount_pct, pc.default_discount_ceiling_pct))), 0.00)
    INTO v_blended_score, v_max_overage
    FROM quotation_items qi
    JOIN products p ON p.id = qi.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN discount_governance_rules dgr
           ON dgr.tenant_id = v_tenant_id AND dgr.tier = v_tier AND dgr.category_id = pc.id
    WHERE qi.quotation_id = p_quotation_id;

    -- Find the approval chain bracket the blended score falls into.
    SELECT requires_sales_manager, requires_finance
    INTO v_requires_manager, v_requires_finance
    FROM approval_chains
    WHERE tenant_id = v_tenant_id
      AND tier = v_tier
      AND v_blended_score BETWEEN min_discount_pct AND max_discount_pct
    LIMIT 1;

    -- Draft quotations must strictly remain in draft until explicitly submitted for approval.
    IF v_current_status = 'draft' THEN
        v_new_status := 'draft';
    ELSIF v_blended_score = 0 THEN
        v_new_status := v_current_status;
    ELSIF v_requires_finance THEN
        v_new_status := 'pending_finance';
    ELSIF v_requires_manager THEN
        v_new_status := 'pending_manager';
    ELSE
        -- Score > 0 but no matching bracket configured: fail safe to manager review.
        v_new_status := 'pending_manager';
    END IF;

    IF v_new_status <> v_current_status THEN
        INSERT INTO approval_audit_logs (
            tenant_id, quotation_id, reviewer_id, reviewer_role, action,
            justification, previous_status, new_status
        ) VALUES (
            v_tenant_id, p_quotation_id, NULL, NULL, 'auto_routed',
            format('Auto-routed by governance engine: blended risk score = %s (max single-line overage = %s)', v_blended_score, v_max_overage),
            v_current_status, v_new_status
        );
    END IF;

    UPDATE quotations
    SET blended_risk_score = v_blended_score,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_quotation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_quotation_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_quote_id UUID;
    v_total_amount NUMERIC(12, 2);
    v_total_cost NUMERIC(12, 2);
    v_overall_margin NUMERIC(5, 2);
BEGIN
    v_quote_id := COALESCE(NEW.quotation_id, OLD.quotation_id);

    SELECT COALESCE(SUM(line_total), 0.00), COALESCE(SUM(line_cost), 0.00)
    INTO v_total_amount, v_total_cost
    FROM quotation_items
    WHERE quotation_id = v_quote_id;

    IF v_total_amount > 0 THEN
        v_overall_margin := ROUND(((v_total_amount - v_total_cost) / v_total_amount) * 100.00, 2);
    ELSE
        v_overall_margin := 0.00;
    END IF;

    UPDATE quotations
    SET subtotal_amount = v_total_amount,
        total_amount = v_total_amount,
        total_cost = v_total_cost,
        total_margin_pct = v_overall_margin,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE id = v_quote_id;

    -- [FIX-9] evaluate governance/auto-routing every time items change
    PERFORM fn_evaluate_quotation_governance(v_quote_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_quotation_totals ON quotation_items;
CREATE TRIGGER trg_sync_quotation_totals
AFTER INSERT OR UPDATE OR DELETE ON quotation_items
FOR EACH ROW
EXECUTE FUNCTION fn_sync_quotation_totals();

-- ----------------------------------------------------------------------------
-- 11c. DISCOUNT ANOMALY DETECTION  [FIX: anomaly monitoring was inert]
-- ----------------------------------------------------------------------------
-- Flags a line whose discount is well above the assigned rep's own historical
-- average (threshold: 1.5x avg AND at least 5 points higher — tune as needed).

CREATE OR REPLACE FUNCTION fn_detect_discount_anomaly()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_rep_avg NUMERIC(5, 2);
BEGIN
    SELECT q.tenant_id, u.historical_discount_avg
    INTO v_tenant_id, v_rep_avg
    FROM quotations q
    JOIN users u ON u.id = q.assigned_rep_id
    WHERE q.id = NEW.quotation_id;

    IF v_rep_avg IS NOT NULL
       AND NEW.applied_discount_pct > v_rep_avg * 1.5
       AND NEW.applied_discount_pct - v_rep_avg >= 5.00 THEN

        INSERT INTO deal_health_alerts (
            tenant_id, quotation_id, alert_type, severity, description, trigger_metric
        ) VALUES (
            v_tenant_id, NEW.quotation_id, 'discount_anomaly', 'medium',
            format('Line discount of %s%% is well above rep''s historical average of %s%%', NEW.applied_discount_pct, v_rep_avg),
            NEW.applied_discount_pct
        );
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detect_discount_anomaly ON quotation_items;
CREATE TRIGGER trg_detect_discount_anomaly
AFTER INSERT OR UPDATE OF applied_discount_pct ON quotation_items
FOR EACH ROW
EXECUTE FUNCTION fn_detect_discount_anomaly();

-- ----------------------------------------------------------------------------
-- 11d. STALLED-DEAL DETECTION  [FIX: time-based, needs a scheduler]
-- ----------------------------------------------------------------------------
-- This cannot be a row-level trigger since it fires on the PASSAGE OF TIME,
-- not on a data change. Call this periodically (e.g. hourly) via pg_cron,
-- or from your application's job scheduler:
--   SELECT sp_flag_stalled_deals(3);   -- flag quotes idle 3+ days
-- If pg_cron is available: SELECT cron.schedule('flag-stalled-deals',
--   '0 * * * *', $$CALL sp_flag_stalled_deals(3)$$);

CREATE OR REPLACE PROCEDURE sp_flag_stalled_deals(p_idle_days INT DEFAULT 3)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric)
    SELECT
        q.tenant_id, q.id, 'stalled_deal',
        CASE WHEN NOW() - q.last_activity_at > (p_idle_days * 2 || ' days')::INTERVAL THEN 'critical' ELSE 'medium' END,
        format('No activity for %s days (last activity: %s)', EXTRACT(DAY FROM NOW() - q.last_activity_at)::INT, q.last_activity_at),
        EXTRACT(DAY FROM NOW() - q.last_activity_at)
    FROM quotations q
    WHERE q.status NOT IN ('confirmed', 'rejected')
      AND NOW() - q.last_activity_at > (p_idle_days || ' days')::INTERVAL
      AND NOT EXISTS (
          SELECT 1 FROM deal_health_alerts a
          WHERE a.quotation_id = q.id AND a.alert_type = 'stalled_deal' AND a.is_resolved = FALSE
      );
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. STORED PROCEDURES
-- ----------------------------------------------------------------------------

-- [FIX-6] auto-assign the RFQ to the customer's account owner if not provided,
-- then insert a notification for that rep.
CREATE OR REPLACE FUNCTION fn_notify_new_rfq()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_rep_id IS NULL THEN
        SELECT account_owner_id INTO NEW.assigned_rep_id
        FROM customers WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_assign_rep ON quotation_requests;
CREATE TRIGGER trg_rfq_assign_rep
BEFORE INSERT ON quotation_requests
FOR EACH ROW
EXECUTE FUNCTION fn_notify_new_rfq();

CREATE OR REPLACE FUNCTION fn_rfq_notification_after_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_rep_id IS NOT NULL THEN
        INSERT INTO notifications (tenant_id, recipient_user_id, notification_type, reference_table, reference_id, message)
        VALUES (
            NEW.tenant_id, NEW.assigned_rep_id, 'new_rfq', 'quotation_requests', NEW.id,
            format('New quotation request received from customer %s', NEW.customer_id)
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_notify_rep ON quotation_requests;
CREATE TRIGGER trg_rfq_notify_rep
AFTER INSERT ON quotation_requests
FOR EACH ROW
EXECUTE FUNCTION fn_rfq_notification_after_insert();

-- RFQ -> Quotation conversion (now also copies line_notes; [FIX-13])
CREATE OR REPLACE PROCEDURE sp_convert_rfq_to_quotation(
    p_request_id UUID,
    p_assigned_rep_id UUID,
    INOUT p_new_quote_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tenant_id UUID;
    v_customer_id UUID;
    v_quote_code VARCHAR(50);
    v_item RECORD;
BEGIN
    SELECT tenant_id, customer_id INTO v_tenant_id, v_customer_id
    FROM quotation_requests
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation Request % does not exist or is not pending.', p_request_id;
    END IF;

    v_quote_code := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);

    INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, origin_request_id, status)
    VALUES (v_tenant_id, v_quote_code, v_customer_id, p_assigned_rep_id, p_request_id, 'draft')
    RETURNING id INTO p_new_quote_id;

    FOR v_item IN
        SELECT qri.product_id, qri.variant_id, qri.requested_qty, qri.line_notes, p.item_type
        FROM quotation_request_items qri
        JOIN products p ON qri.product_id = p.id
        WHERE qri.request_id = p_request_id
    LOOP
        INSERT INTO quotation_items (
            tenant_id, quotation_id, product_id, variant_id, line_type,
            quantity, applied_discount_pct, line_notes
        ) VALUES (
            v_tenant_id, p_new_quote_id, v_item.product_id, v_item.variant_id,
            v_item.item_type, v_item.requested_qty, 0.00, v_item.line_notes
        );
    END LOOP;

    UPDATE quotation_requests SET status = 'converted', updated_at = NOW() WHERE id = p_request_id;

    RAISE NOTICE 'RFQ % successfully converted to Quotation %', p_request_id, p_new_quote_id;
END;
$$;

-- [FIX] "confirm quotation" is the authoritative moment negotiation results get
-- re-checked against governance and, if needed, routed back into approval.
CREATE OR REPLACE PROCEDURE sp_customer_confirm_quotation(p_quotation_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status_before quote_status;
BEGIN
    SELECT status INTO v_status_before FROM quotations WHERE id = p_quotation_id;

    IF v_status_before NOT IN ('sent', 'under_negotiation', 'pending_manager', 'pending_finance') THEN
        RAISE EXCEPTION 'Quotation % cannot be confirmed from status %', p_quotation_id, v_status_before;
    END IF;

    -- Tentatively mark confirmed, then let governance evaluation downgrade it
    -- back into an approval state if the negotiated terms breach ceilings.
    UPDATE quotations SET status = 'confirmed', updated_at = NOW() WHERE id = p_quotation_id;
    PERFORM fn_evaluate_quotation_governance(p_quotation_id);
END;
$$;

-- Flags a negotiation row (informational, for the UI) if the customer's
-- counter-discount would breach the category/tier ceiling.
CREATE OR REPLACE FUNCTION fn_check_negotiation_ceiling()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_tier customer_tier;
    v_category_id UUID;
    v_ceiling NUMERIC(5, 2);
BEGIN
    IF NEW.proposed_discount_pct IS NULL OR NEW.quotation_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT q.tenant_id, c.tier, p.category_id
    INTO v_tenant_id, v_tier, v_category_id
    FROM quotation_items qi
    JOIN quotations q ON q.id = qi.quotation_id
    JOIN customers c ON c.id = q.customer_id
    JOIN products p ON p.id = qi.product_id
    WHERE qi.id = NEW.quotation_item_id;

    SELECT COALESCE(dgr.max_discount_pct, pc.default_discount_ceiling_pct)
    INTO v_ceiling
    FROM product_categories pc
    LEFT JOIN discount_governance_rules dgr
           ON dgr.tenant_id = v_tenant_id AND dgr.tier = v_tier AND dgr.category_id = pc.id
    WHERE pc.id = v_category_id;

    IF v_ceiling IS NOT NULL AND NEW.proposed_discount_pct > v_ceiling THEN
        NEW.triggers_approval_reset := TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_negotiation_ceiling ON quotation_negotiations;
CREATE TRIGGER trg_check_negotiation_ceiling
BEFORE INSERT ON quotation_negotiations
FOR EACH ROW
EXECUTE FUNCTION fn_check_negotiation_ceiling();

-- ----------------------------------------------------------------------------
-- 13. ROW-LEVEL SECURITY  [FIX: every table now has policies AND is forced]
-- ----------------------------------------------------------------------------
-- Session GUCs set by the application per request:
--   app.current_tenant_id           UUID  (always)
--   app.current_actor_type          text  'staff' | 'customer_portal'
--   app.current_user_id             UUID  (staff sessions)
--   app.current_role                text  'admin'|'sales_manager'|'sales_rep'|'finance' (staff sessions)
--   app.current_customer_id         UUID  (customer_portal sessions)
--   app.current_portal_user_id      UUID  (customer_portal sessions)
-- In addition, the DB connection itself must run under app_role_staff or
-- app_role_customer_portal (see section 0) so column-level GRANTs in section
-- 15 are actually enforced, independent of what the GUCs claim.

-- helper expressions repeated across policies:
--   is_staff()  := current_setting('app.current_actor_type', true) = 'staff'
--                  AND current_setting('app.current_role', true)
--                      IN ('admin','sales_manager','sales_rep','finance')
--   is_portal() := current_setting('app.current_actor_type', true) = 'customer_portal'

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_self_policy ON tenants;
CREATE POLICY tenants_self_policy ON tenants
    FOR SELECT
    USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_staff_policy ON users;
CREATE POLICY users_staff_policy ON users
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
-- No customer policy on `users` at all: portal actors get zero rows here by
-- default-deny, which is exactly the isolation the spec calls for.

ALTER TABLE customer_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portal_users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portal_users_staff_policy ON customer_portal_users;
CREATE POLICY portal_users_staff_policy ON customer_portal_users
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS portal_users_self_policy ON customer_portal_users;
CREATE POLICY portal_users_self_policy ON customer_portal_users
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND id = NULLIF(current_setting('app.current_portal_user_id', true), '')::UUID
    );

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_staff_policy ON customers;
CREATE POLICY customers_staff_policy ON customers
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS customers_self_policy ON customers;
CREATE POLICY customers_self_policy ON customers
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
    );

-- Catalog / configuration tables: staff-only, tenant-scoped. [FIX: previously had NO RLS]
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'product_categories', 'price_lists', 'price_list_items',
        'upsell_rules', 'discount_governance_rules', 'approval_chains',
        'shipment_items', 'warehouses', 'warehouse_inventory',
        'shipment_orders', 'subscriptions', 'subscription_plans',
        'invoices', 'invoice_items', 'deal_health_alerts', 'notifications'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_staff_policy', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL USING (
                tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID
                AND current_setting(''app.current_actor_type'', true) = ''staff''
            )', t || '_staff_policy', t
        );
    END LOOP;
END $$;
-- notifications additionally needs a "staff sees only their own" restriction
DROP POLICY IF EXISTS notifications_staff_policy ON notifications;
CREATE POLICY notifications_staff_policy ON notifications
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
        AND recipient_user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
    );

-- Products: staff full CRUD [FIX: was SELECT-only]; customers see active only.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_staff_policy ON products;
CREATE POLICY product_staff_policy ON products
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS product_customer_policy ON products;
CREATE POLICY product_customer_policy ON products
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND is_active = TRUE
    );

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS variants_staff_policy ON product_variants;
CREATE POLICY variants_staff_policy ON product_variants
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS variants_customer_policy ON product_variants;
CREATE POLICY variants_customer_policy ON product_variants
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
    );

-- RFQ tables
ALTER TABLE quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rfq_staff_policy ON quotation_requests;
CREATE POLICY rfq_staff_policy ON quotation_requests
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS rfq_customer_policy ON quotation_requests;
CREATE POLICY rfq_customer_policy ON quotation_requests
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
    );

-- [FIX] quotation_request_items now has RLS too (previously only enabled, no policy)
ALTER TABLE quotation_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_request_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rfq_items_staff_policy ON quotation_request_items;
CREATE POLICY rfq_items_staff_policy ON quotation_request_items
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS rfq_items_customer_policy ON quotation_request_items;
CREATE POLICY rfq_items_customer_policy ON quotation_request_items
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND request_id IN (
            SELECT id FROM quotation_requests
            WHERE customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
        )
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND request_id IN (
            SELECT id FROM quotation_requests
            WHERE customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
        )
    );

-- Quotations
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotation_staff_policy ON quotations;
CREATE POLICY quotation_staff_policy ON quotations
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS quotation_customer_policy ON quotations;
CREATE POLICY quotation_customer_policy ON quotations
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
        AND status NOT IN ('draft'::quote_status)
    );
DROP POLICY IF EXISTS quotation_customer_update_policy ON quotations;
CREATE POLICY quotation_customer_update_policy ON quotations
    FOR UPDATE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
        AND status NOT IN ('draft'::quote_status)
    );

-- Quotation items
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotation_items_staff_policy ON quotation_items;
CREATE POLICY quotation_items_staff_policy ON quotation_items
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS quotation_items_customer_policy ON quotation_items;
CREATE POLICY quotation_items_customer_policy ON quotation_items
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND quotation_id IN (
            SELECT id FROM quotations
            WHERE customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
              AND status NOT IN ('draft'::quote_status)
        )
    );

-- Negotiations [FIX: previously enabled with NO policy at all -> full lockout]
ALTER TABLE quotation_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_negotiations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS negotiations_staff_policy ON quotation_negotiations;
CREATE POLICY negotiations_staff_policy ON quotation_negotiations
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );
DROP POLICY IF EXISTS negotiations_customer_policy ON quotation_negotiations;
CREATE POLICY negotiations_customer_policy ON quotation_negotiations
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND quotation_id IN (
            SELECT id FROM quotations
            WHERE customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
        )
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'customer_portal'
        AND author_portal_user_id = NULLIF(current_setting('app.current_portal_user_id', true), '')::UUID
    );

-- Audit logs: strictly internal
ALTER TABLE approval_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_staff_only ON approval_audit_logs;
CREATE POLICY audit_logs_staff_only ON approval_audit_logs
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        AND current_setting('app.current_actor_type', true) = 'staff'
    );

-- ----------------------------------------------------------------------------
-- 14. SECURE CUSTOMER-FACING VIEWS (HIDE INTERNAL COST/MARGIN COLUMNS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_customer_portal_quotations AS
SELECT
    q.id AS quotation_id, q.tenant_id, q.quotation_code, q.customer_id, q.status,
    q.subtotal_amount, q.total_amount, q.promised_delivery_date, q.created_at,
    qi.id AS item_id, p.name AS product_name, p.description AS product_description,
    qi.quantity, qi.unit_list_price, qi.applied_discount_pct,
    qi.calculated_unit_price, qi.line_total
FROM quotations q
JOIN quotation_items qi ON q.id = qi.quotation_id
JOIN products p ON qi.product_id = p.id;
-- unit_cost, total_cost, line_margin_pct, blended_risk_score remain omitted.

-- [FIX] equivalent safe view for the catalog (products.unit_cost was previously
-- reachable by any customer-portal query against the base table).
CREATE OR REPLACE VIEW view_customer_portal_catalog AS
SELECT
    p.id AS product_id, p.tenant_id, p.category_id, p.sku, p.name, p.description,
    p.item_type, p.base_price, p.tax_rate, p.is_promoted,
    pv.id AS variant_id, pv.attribute_name, pv.attribute_value, pv.extra_price
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE p.is_active = TRUE;
-- unit_cost is omitted entirely.

-- ----------------------------------------------------------------------------
-- 15. COLUMN-LEVEL GRANTS  [FIX: real defense-in-depth against cost/margin leakage]
-- ----------------------------------------------------------------------------
-- These GRANTs/REVOKEs only take effect if your application actually connects
-- using app_role_staff / app_role_customer_portal (see section 0). If your
-- app instead connects as the table owner, these are bypassed — table owners
-- ignore both RLS and column grants. Use a non-owner login role in production
-- and GRANT it membership in the appropriate role below.

GRANT USAGE ON SCHEMA public TO app_role_staff, app_role_customer_portal;

-- Staff: full column access everywhere they have row access.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role_staff;
GRANT SELECT ON view_customer_portal_quotations, view_customer_portal_catalog TO app_role_staff;

-- Customer portal role: only the views, plus explicit non-sensitive columns
-- on the few base tables the portal touches directly (RFQ submission).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_role_customer_portal;
GRANT SELECT ON view_customer_portal_quotations, view_customer_portal_catalog TO app_role_customer_portal;

GRANT SELECT (id, tenant_id, category_id, sku, name, description, item_type,
              base_price, tax_rate, is_promoted, is_active)
    ON products TO app_role_customer_portal;               -- unit_cost excluded
GRANT SELECT ON product_variants TO app_role_customer_portal;

GRANT SELECT, INSERT, UPDATE ON quotation_requests TO app_role_customer_portal;
GRANT SELECT, INSERT, UPDATE, DELETE ON quotation_request_items TO app_role_customer_portal;
GRANT SELECT, INSERT ON quotation_negotiations TO app_role_customer_portal;

GRANT SELECT (id, tenant_id, quotation_code, customer_id, assigned_rep_id,
              status, subtotal_amount, total_amount, promised_delivery_date,
              created_at, updated_at)
    ON quotations TO app_role_customer_portal;              -- total_cost, total_margin_pct, blended_risk_score excluded

GRANT SELECT (id, tenant_id, quotation_id, product_id, variant_id, line_type,
              quantity, unit_list_price, applied_discount_pct,
              calculated_unit_price, line_total, line_notes)
    ON quotation_items TO app_role_customer_portal;         -- unit_cost_price, line_cost, line_margin_pct excluded

GRANT SELECT, UPDATE ON customer_portal_users TO app_role_customer_portal;
GRANT SELECT ON customers TO app_role_customer_portal;

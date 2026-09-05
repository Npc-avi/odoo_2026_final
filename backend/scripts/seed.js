import argon2 from 'argon2';
import dotenv from 'dotenv';
import { adminPool } from '../src/config/database.js';

dotenv.config();

async function runSeed() {
  console.log('====================================================');
  console.log('    DEALFLOW 360 - ROBUST ENTERPRISE SEED ENGINE    ');
  console.log('====================================================');

  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');

    console.log('[Seed] 1. Resetting existing workspace tables...');
    await client.query(`
      TRUNCATE TABLE
        tenants, users, customers, customer_portal_users,
        product_categories, products, product_variants,
        price_lists, price_list_items, upsell_rules,
        quotation_requests, quotation_request_items,
        discount_governance_rules, approval_chains,
        quotations, quotation_items, approval_audit_logs, quotation_negotiations,
        warehouses, warehouse_inventory, shipment_orders, shipment_items,
        subscription_plans, subscriptions, invoices, invoice_items,
        deal_health_alerts, notifications
      CASCADE;
    `);

    // Standard shared password for all seed accounts:
    const defaultPasswordHash = await argon2.hash('Password123!');

    // --------------------------------------------------------------------------
    // 1. TENANTS
    // --------------------------------------------------------------------------
    console.log('[Seed] 2. Inserting Multi-tenant Organizations...');
    const tenantRes = await client.query(`
      INSERT INTO tenants (name, subdomain, default_currency, is_active)
      VALUES 
        ('Acme Industrial Tech', 'acme', 'USD', TRUE),
        ('Global Apex Solutions', 'globalapex', 'USD', TRUE)
      RETURNING id, name, subdomain;
    `);
    const acmeTenant = tenantRes.rows[0];
    const globalTenant = tenantRes.rows[1];

    // --------------------------------------------------------------------------
    // 2. STAFF USERS (All roles represented)
    // --------------------------------------------------------------------------
    console.log('[Seed] 3. Inserting Staff Members across all internal roles...');
    const usersRes = await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, full_name, role, historical_discount_avg, is_active)
      VALUES
        ($1, 'admin@acme.com', $2, 'Alice Admin', 'admin', 5.00, TRUE),
        ($1, 'manager@acme.com', $2, 'Mark Manager', 'sales_manager', 5.00, TRUE),
        ($1, 'rep@acme.com', $2, 'Rachel Rep', 'sales_rep', 6.00, TRUE),
        ($1, 'finance@acme.com', $2, 'Frank Finance', 'finance', 3.00, TRUE),
        ($1, 'clark@acme.com', $2, 'Clark Kent', 'sales_rep', 4.50, TRUE)
      RETURNING id, email, full_name, role;
    `, [acmeTenant.id, defaultPasswordHash]);

    const adminUser = usersRes.rows.find(u => u.role === 'admin');
    const managerUser = usersRes.rows.find(u => u.role === 'sales_manager');
    const salesRep = usersRes.rows.find(u => u.email === 'rep@acme.com');
    const financeUser = usersRes.rows.find(u => u.role === 'finance');
    const clarkRep = usersRes.rows.find(u => u.email === 'clark@acme.com');

    // --------------------------------------------------------------------------
    // 3. CUSTOMERS (All Tiers: Bronze, Silver, Gold, Platinum)
    // --------------------------------------------------------------------------
    console.log('[Seed] 4. Inserting Customers across all tiers...');
    const customersRes = await client.query(`
      INSERT INTO customers (tenant_id, company_name, contact_name, email, tier, credit_limit, account_owner_id, membership_status)
      VALUES
        ($1, 'Acme Corp', 'Alice Acme', 'alice@acmecorp.com', 'Gold', 100000.00, $2, 'active'),
        ($1, 'Zenith Co', 'Zach Zenith', 'zach@zenith.com', 'Silver', 50000.00, $2, 'active'),
        ($1, 'Wayne Enterprises', 'Bruce Wayne', 'bruce@wayne.com', 'Gold', 150000.00, $2, 'active'),
        ($1, 'Stark Industries', 'Tony Stark', 'tony@stark.com', 'Platinum', 300000.00, $3, 'active'),
        ($1, 'Cyberdyne Systems', 'Miles Dyson', 'miles@cyberdyne.com', 'Silver', 75000.00, $2, 'paused'),
        ($1, 'Initech Corporation', 'Peter Gibbons', 'peter@initech.com', 'Bronze', 25000.00, $3, 'active'),
        ($1, 'LexCorp Enterprises', 'Lex Luthor', 'lex@lexcorp.com', 'Platinum', 250000.00, $2, 'active')
      RETURNING id, company_name, tier, email;
    `, [acmeTenant.id, salesRep.id, clarkRep.id]);

    const acmeCustomer = customersRes.rows.find(c => c.company_name === 'Acme Corp');
    const zenithCustomer = customersRes.rows.find(c => c.company_name === 'Zenith Co');
    const wayneCustomer = customersRes.rows.find(c => c.company_name === 'Wayne Enterprises');
    const starkCustomer = customersRes.rows.find(c => c.company_name === 'Stark Industries');
    const cyberdyneCustomer = customersRes.rows.find(c => c.company_name === 'Cyberdyne Systems');
    const initechCustomer = customersRes.rows.find(c => c.company_name === 'Initech Corporation');
    const lexcorpCustomer = customersRes.rows.find(c => c.company_name === 'LexCorp Enterprises');

    // --------------------------------------------------------------------------
    // 4. CUSTOMER PORTAL USERS (Eligible for immediate login)
    // --------------------------------------------------------------------------
    console.log('[Seed] 5. Inserting Customer Portal Users (password: Password123!)...');
    const portalUsersRes = await client.query(`
      INSERT INTO customer_portal_users (tenant_id, customer_id, email, password_hash, is_active)
      VALUES
        ($1, $2, 'bruce@wayne.com', $6, TRUE),
        ($1, $3, 'tony@stark.com', $6, TRUE),
        ($1, $4, 'miles@cyberdyne.com', $6, TRUE),
        ($1, $5, 'peter@initech.com', $6, TRUE),
        ($1, $7, 'lex@lexcorp.com', $6, TRUE)
      RETURNING id, email, customer_id;
    `, [
      acmeTenant.id,
      wayneCustomer.id,
      starkCustomer.id,
      cyberdyneCustomer.id,
      initechCustomer.id,
      defaultPasswordHash,
      lexcorpCustomer.id
    ]);

    const waynePortalUser = portalUsersRes.rows.find(p => p.email === 'bruce@wayne.com');
    const starkPortalUser = portalUsersRes.rows.find(p => p.email === 'tony@stark.com');

    // --------------------------------------------------------------------------
    // 5. PRODUCT CATEGORIES & GOVERNANCE CEILINGS
    // --------------------------------------------------------------------------
    console.log('[Seed] 6. Inserting Product Categories...');
    const catRes = await client.query(`
      INSERT INTO product_categories (tenant_id, name, default_discount_ceiling_pct)
      VALUES
        ($1, 'Hardware & Devices', 15.00),
        ($1, 'Professional Services', 10.00),
        ($1, 'Software & Subscriptions', 12.00),
        ($1, 'Enterprise Cloud & AI', 8.00)
      RETURNING id, name, default_discount_ceiling_pct;
    `, [acmeTenant.id]);

    const hwCat = catRes.rows.find(c => c.name.includes('Hardware'));
    const srvCat = catRes.rows.find(c => c.name.includes('Services'));
    const subCat = catRes.rows.find(c => c.name.includes('Software'));
    const cloudCat = catRes.rows.find(c => c.name.includes('Cloud'));

    // --------------------------------------------------------------------------
    // 6. PRODUCTS (Hardware, Services, Subscriptions)
    // --------------------------------------------------------------------------
    console.log('[Seed] 7. Inserting Comprehensive Product Catalog...');
    const prodRes = await client.query(`
      INSERT INTO products (tenant_id, category_id, sku, name, description, item_type, unit_cost, base_price, tax_rate, is_promoted, is_active)
      VALUES
        ($1, $2, 'HW-LAPTOP-14', 'Laptop Pro 14', 'Flagship developer ultra-portable workstation', 'hardware', 800.00, 1200.00, 8.00, TRUE, TRUE),
        ($1, $2, 'HW-DOCK-01', 'Dual 4K Docking Station', 'Thunderbolt display expansion dock with power delivery', 'hardware', 75.00, 150.00, 8.00, FALSE, TRUE),
        ($1, $2, 'HW-LAPTOP-16', 'Enterprise Workstation 16', 'Maximum performance engineering laptop', 'hardware', 1400.00, 2000.00, 8.00, FALSE, TRUE),
        ($1, $2, 'HW-SRV-BLADE', 'Server Blade 2U Modular', 'Rack-mount modular compute node', 'hardware', 3200.00, 5000.00, 8.00, FALSE, TRUE),
        ($1, $2, 'HW-IOT-GATEWAY', 'Edge IoT Gateway Controller', 'Industrial telemetry edge bridge', 'hardware', 450.00, 850.00, 8.00, FALSE, TRUE),

        ($1, $3, 'SRV-SETUP-MIG', 'Enterprise Setup & Cloud Migration', 'Complete onboarding and architectural configuration', 'service', 600.00, 1500.00, 0.00, FALSE, TRUE),
        ($1, $3, 'SRV-SLA-247', 'Dedicated 24/7 Operations SLA', 'Direct senior engineering emergency response retainer', 'service', 400.00, 1000.00, 0.00, FALSE, TRUE),
        ($1, $3, 'SRV-SEC-AUDIT', 'Security & Compliance Architecture Audit', 'SOC2 and ISO27001 hardening audit review', 'service', 1200.00, 3500.00, 0.00, FALSE, TRUE),

        ($1, $4, 'SUB-DF360-SEAT', 'DealFlow 360 Core License (Seat)', 'Continuous quote-to-cash governance suite per user', 'subscription', 10.00, 65.00, 0.00, FALSE, TRUE),
        ($1, $4, 'SUB-AI-ANOMALY', 'AI Deal Health & Anomaly Predictor', 'Machine learning margin and velocity monitor', 'subscription', 15.00, 95.00, 0.00, TRUE, TRUE),
        ($1, $5, 'SUB-CLOUD-STREAM', 'Real-Time Enterprise Event Stream', 'Managed high-throughput Kafka telemetry connector', 'subscription', 50.00, 250.00, 0.00, FALSE, TRUE)
      RETURNING id, sku, name, item_type, unit_cost, base_price;
    `, [acmeTenant.id, hwCat.id, srvCat.id, subCat.id, cloudCat.id]);

    const laptop14Prod = prodRes.rows.find(p => p.sku === 'HW-LAPTOP-14');
    const dockProd = prodRes.rows.find(p => p.sku === 'HW-DOCK-01');
    const laptop16Prod = prodRes.rows.find(p => p.sku === 'HW-LAPTOP-16');
    const serverProd = prodRes.rows.find(p => p.sku === 'HW-SRV-BLADE');
    const setupProd = prodRes.rows.find(p => p.sku === 'SRV-SETUP-MIG');
    const slaProd = prodRes.rows.find(p => p.sku === 'SRV-SLA-247');
    const seatProd = prodRes.rows.find(p => p.sku === 'SUB-DF360-SEAT');
    const aiProd = prodRes.rows.find(p => p.sku === 'SUB-AI-ANOMALY');

    // --------------------------------------------------------------------------
    // 7. PRODUCT VARIANTS
    // --------------------------------------------------------------------------
    console.log('[Seed] 8. Inserting Product Variants...');
    await client.query(`
      INSERT INTO product_variants (tenant_id, product_id, variant_sku, attribute_name, attribute_value, extra_price)
      VALUES
        ($1, $2, 'HW-LAPTOP-32GB', 'Memory / Storage', '32GB RAM / 1TB NVMe', 250.00),
        ($1, $2, 'HW-LAPTOP-64GB', 'Memory / Storage', '64GB RAM / 2TB NVMe', 550.00);
    `, [acmeTenant.id, laptop16Prod.id]);

    // --------------------------------------------------------------------------
    // 8. DISCOUNT GOVERNANCE RULES
    // --------------------------------------------------------------------------
    console.log('[Seed] 9. Setting up Discount Governance Rules...');
    await client.query(`
      INSERT INTO discount_governance_rules (tenant_id, tier, category_id, max_discount_pct)
      VALUES
        -- Gold Tier
        ($1, 'Gold', $2, 15.00),
        ($1, 'Gold', $3, 10.00),
        ($1, 'Gold', $4, 12.00),
        -- Silver Tier
        ($1, 'Silver', $2, 10.00),
        ($1, 'Silver', $3, 8.00),
        ($1, 'Silver', $4, 10.00),
        -- Bronze Tier
        ($1, 'Bronze', $2, 5.00),
        ($1, 'Bronze', $3, 5.00),
        ($1, 'Bronze', $4, 5.00),
        -- Platinum Tier
        ($1, 'Platinum', $2, 22.00),
        ($1, 'Platinum', $3, 18.00),
        ($1, 'Platinum', $4, 20.00);
    `, [acmeTenant.id, hwCat.id, srvCat.id, subCat.id]);

    // --------------------------------------------------------------------------
    // 9. APPROVAL CHAINS
    // --------------------------------------------------------------------------
    console.log('[Seed] 10. Setting up Approval Chains...');
    await client.query(`
      INSERT INTO approval_chains (tenant_id, tier, min_discount_pct, max_discount_pct, requires_sales_manager, requires_finance)
      VALUES
        ($1, 'Gold', 0.01, 10.00, TRUE, FALSE),
        ($1, 'Gold', 10.01, 50.00, TRUE, TRUE),
        ($1, 'Silver', 0.01, 8.00, TRUE, FALSE),
        ($1, 'Silver', 8.01, 50.00, TRUE, TRUE),
        ($1, 'Bronze', 0.01, 5.00, TRUE, FALSE),
        ($1, 'Bronze', 5.01, 50.00, TRUE, TRUE),
        ($1, 'Platinum', 0.01, 15.00, TRUE, FALSE),
        ($1, 'Platinum', 15.01, 60.00, TRUE, TRUE);
    `, [acmeTenant.id]);

    // --------------------------------------------------------------------------
    // 10. UPSELL RULES
    // --------------------------------------------------------------------------
    console.log('[Seed] 11. Inserting Upsell & Cross-Sell Rules...');
    await client.query(`
      INSERT INTO upsell_rules (tenant_id, trigger_product_id, suggested_product_id, priority, min_margin_threshold_pct)
      VALUES
        ($1, $2, $3, 1, 20.00),
        ($1, $4, $5, 1, 25.00),
        ($1, $6, $7, 2, 30.00);
    `, [acmeTenant.id, laptop14Prod.id, setupProd.id, seatProd.id, aiProd.id, serverProd.id, slaProd.id]);

    // --------------------------------------------------------------------------
    // 11. WAREHOUSES & INVENTORY LEVELS
    // --------------------------------------------------------------------------
    console.log('[Seed] 12. Inserting Warehouses & Inventory Levels...');
    const whRes = await client.query(`
      INSERT INTO warehouses (tenant_id, name, code, location, shipping_cost_weight, is_active)
      VALUES
        ($1, 'Main Austin Warehouse', 'WH-MAIN', 'Austin, TX', 1.00, TRUE),
        ($1, 'East Depot Newark', 'WH-EAST', 'Newark, NJ', 1.05, TRUE),
        ($1, 'Central Logistics Hub', 'WH-CENTRAL', 'Chicago, IL', 1.20, TRUE)
      RETURNING id, code, name;
    `, [acmeTenant.id]);

    const whMain = whRes.rows.find(w => w.code === 'WH-MAIN');
    const whEast = whRes.rows.find(w => w.code === 'WH-EAST');
    const whCentral = whRes.rows.find(w => w.code === 'WH-CENTRAL');

    await client.query(`
      INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
      VALUES
        -- Main Austin
        ($1, $2, $5, 50, 20), -- Laptop Pro 14 (Avail 30)
        ($1, $2, $6, 80, 15), -- Docking Station (Avail 65)
        ($1, $2, $7, 15, 0),  -- Laptop 16 (Avail 15)
        ($1, $2, $8, 2, 2),   -- Server Blade (Avail 0)

        -- East Newark
        ($1, $3, $5, 20, 5),  -- Laptop Pro 14 (Avail 15)
        ($1, $3, $6, 30, 8),  -- Docking Station (Avail 22)
        ($1, $3, $7, 10, 0),  -- Laptop 16 (Avail 10)
        ($1, $3, $8, 8, 4),   -- Server Blade (Avail 4)

        -- Central Chicago
        ($1, $4, $5, 25, 0),
        ($1, $4, $6, 40, 0);
    `, [
      acmeTenant.id,
      whMain.id,
      whEast.id,
      whCentral.id,
      laptop14Prod.id,
      dockProd.id,
      laptop16Prod.id,
      serverProd.id,
    ]);

    // --------------------------------------------------------------------------
    // 12. SUBSCRIPTION PLANS & CUSTOMER SUBSCRIPTIONS
    // --------------------------------------------------------------------------
    console.log('[Seed] 13. Inserting Subscription Plans & Active Subscriptions...');
    const plansRes = await client.query(`
      INSERT INTO subscription_plans (tenant_id, name, cadence, billing_interval_days, allows_proration)
      VALUES
        ($1, 'Silver Tier Discount', 'monthly', 30, TRUE),
        ($1, 'Gold Velocity Pass', 'monthly', 30, TRUE),
        ($1, 'Enterprise Platinum VIP', 'yearly', 365, TRUE),
        ($1, 'AI Telemetry Module', 'monthly', 30, TRUE)
      RETURNING id, name, cadence;
    `, [acmeTenant.id]);

    const silverPlan = plansRes.rows.find(p => p.name.includes('Silver'));
    const goldPlan = plansRes.rows.find(p => p.name.includes('Gold'));
    const platPlan = plansRes.rows.find(p => p.name.includes('Platinum'));
    const aiPlan = plansRes.rows.find(p => p.name.includes('AI'));

    // Subscriptions for Wayne Enterprises (Gold), Stark Industries (Platinum), Cyberdyne (Silver)
    await client.query(`
      INSERT INTO subscriptions (
        tenant_id, customer_id, plan_id, start_date, next_billing_date, unit_recurring_price, quantity, status
      )
      VALUES
        ($1, $2, $3, CURRENT_DATE - 60, CURRENT_DATE + 30, 65.00, 1, 'active'),
        ($1, $4, $5, CURRENT_DATE - 90, CURRENT_DATE + 275, 950.00, 1, 'active'),
        ($1, $6, $7, CURRENT_DATE - 45, CURRENT_DATE + 15, 49.00, 1, 'paused');
    `, [
      acmeTenant.id,
      wayneCustomer.id,
      goldPlan.id,
      starkCustomer.id,
      platPlan.id,
      cyberdyneCustomer.id,
      silverPlan.id
    ]);

    // --------------------------------------------------------------------------
    // 13. QUOTATIONS ACROSS EVERY STATUS
    // --------------------------------------------------------------------------
    console.log('[Seed] 14. Generating Quotations for all workflow stages...');

    // A. DRAFT QUOTATION: QT-1001 (Sales Rep building fresh proposal)
    const qDraft = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score)
      VALUES ($1, 'QT-1001', $2, $3, 'draft', 3600.00, 3888.00, 2400.00, 33.33, 0.00)
      RETURNING id;
    `, [acmeTenant.id, wayneCustomer.id, salesRep.id]);
    const qDraftId = qDraft.rows[0].id;
    await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 3, 1200.00, 0.00, 1200.00, 3600.00, 800.00, 2400.00);
    `, [acmeTenant.id, qDraftId, laptop14Prod.id]);

    // B. UNDER NEGOTIATION: QT-1002 (Live Customer Counter-offer with chat thread)
    const qNeg = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score, promised_delivery_date)
      VALUES ($1, 'QT-1002', $2, $3, 'under_negotiation', 13350.00, 14418.00, 8800.00, 34.08, 4.00, CURRENT_DATE + 14)
      RETURNING id;
    `, [acmeTenant.id, wayneCustomer.id, salesRep.id]);
    const qNegId = qNeg.rows[0].id;
    await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES
        ($1, $2, $3, 'hardware', 10, 1200.00, 10.00, 1080.00, 10800.00, 800.00, 8000.00),
        ($1, $2, $4, 'hardware', 10, 150.00, 5.00, 142.50, 1425.00, 75.00, 750.00),
        ($1, $2, $5, 'service', 1, 1500.00, 15.00, 1275.00, 1275.00, 600.00, 600.00);
    `, [acmeTenant.id, qNegId, laptop14Prod.id, dockProd.id, setupProd.id]);

    // Seed live negotiation chat messages
    await client.query(`
      INSERT INTO quotation_negotiations (tenant_id, quotation_id, author_portal_user_id, comments, proposed_discount_pct, created_at)
      VALUES ($1, $2, $3, 'Can we get 10% discount across the laptops and expedited shipping to our Gotham HQ?', 10.00, NOW() - INTERVAL '2 days');
    `, [acmeTenant.id, qNegId, waynePortalUser.id]);

    await client.query(`
      INSERT INTO quotation_negotiations (tenant_id, quotation_id, author_staff_user_id, comments, created_at)
      VALUES ($1, $2, $3, 'Approved 10% on the laptops and bundled docking units. Ready for your final signoff!', NOW() - INTERVAL '1 day');
    `, [acmeTenant.id, qNegId, salesRep.id]);

    // C. PENDING SALES MANAGER: QT-1003 (Discount overage requires manager approval)
    const qPendMgr = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score)
      VALUES ($1, 'QT-1003', $2, $3, 'pending_manager', 18000.00, 19440.00, 12600.00, 30.00, 8.00)
      RETURNING id;
    `, [acmeTenant.id, initechCustomer.id, salesRep.id]);
    const qPendMgrId = qPendMgr.rows[0].id;
    await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 10, 2000.00, 10.00, 1800.00, 18000.00, 1400.00, 14000.00);
    `, [acmeTenant.id, qPendMgrId, laptop16Prod.id]);

    // D. PENDING FINANCE: QT-1004 (Aggressive discount requiring finance approval)
    const qPendFin = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score)
      VALUES ($1, 'QT-1004', $2, $3, 'pending_finance', 42500.00, 45900.00, 27200.00, 36.00, 15.00)
      RETURNING id;
    `, [acmeTenant.id, starkCustomer.id, clarkRep.id]);
    const qPendFinId = qPendFin.rows[0].id;
    await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 10, 5000.00, 15.00, 4250.00, 42500.00, 3200.00, 32000.00);
    `, [acmeTenant.id, qPendFinId, serverProd.id]);

    // E. APPROVED: QT-1005 (Ready for customer confirmation)
    const qApproved = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score)
      VALUES ($1, 'QT-1005', $2, $3, 'approved', 7500.00, 8100.00, 4800.00, 36.00, 0.00)
      RETURNING id;
    `, [acmeTenant.id, zenithCustomer.id, salesRep.id]);
    const qApprovedId = qApproved.rows[0].id;
    await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 5, 1500.00, 0.00, 1500.00, 7500.00, 960.00, 4800.00);
    `, [acmeTenant.id, qApprovedId, setupProd.id]);

    // F. CONFIRMED ORDERS WITH MULTI-WAREHOUSE FULFILLMENT:
    // Q-1042 (Warehouse split demo: 24 Laptop Pro 14 from Austin & Newark)
    const q1042 = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score)
      VALUES ($1, 'Q-1042', $2, $3, 'confirmed', 28800.00, 31104.00, 19200.00, 33.33, 0.00)
      RETURNING id;
    `, [acmeTenant.id, acmeCustomer.id, salesRep.id]);
    const q1042Id = q1042.rows[0].id;
    const q1042Item = await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 24, 1200.00, 0.00, 1200.00, 28800.00, 800.00, 19200.00)
      RETURNING id;
    `, [acmeTenant.id, q1042Id, laptop14Prod.id]);

    // Q-1030 (Backorder demo: 10 Server Blades where stock is 2 -> Backorder)
    const q1030 = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score)
      VALUES ($1, 'Q-1030', $2, $3, 'confirmed', 50000.00, 54000.00, 32000.00, 36.00, 0.00)
      RETURNING id;
    `, [acmeTenant.id, zenithCustomer.id, salesRep.id]);
    const q1030Id = q1030.rows[0].id;
    await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 10, 5000.00, 0.00, 5000.00, 50000.00, 3200.00, 32000.00);
    `, [acmeTenant.id, q1030Id, serverProd.id]);

    // Q-1088: In Fulfillment with live tracking & warehouse shipments
    const q1088 = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, subtotal_amount, total_amount, total_cost, total_margin_pct, blended_risk_score, promised_delivery_date)
      VALUES ($1, 'QT-1088', $2, $3, 'in_fulfillment', 14400.00, 15552.00, 9600.00, 33.33, 0.00, CURRENT_DATE + 5)
      RETURNING id;
    `, [acmeTenant.id, wayneCustomer.id, salesRep.id]);
    const q1088Id = q1088.rows[0].id;
    const q1088Item1 = await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 10, 1200.00, 0.00, 1200.00, 12000.00, 800.00, 8000.00)
      RETURNING id;
    `, [acmeTenant.id, q1088Id, laptop14Prod.id]);
    const q1088Item2 = await client.query(`
      INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, unit_list_price, applied_discount_pct, calculated_unit_price, line_total, unit_cost_price, line_cost)
      VALUES ($1, $2, $3, 'hardware', 16, 150.00, 0.00, 150.00, 2400.00, 75.00, 1200.00)
      RETURNING id;
    `, [acmeTenant.id, q1088Id, dockProd.id]);

    // --------------------------------------------------------------------------
    // 14. SHIPMENT ORDERS (Fulfillment testing)
    // --------------------------------------------------------------------------
    console.log('[Seed] 15. Inserting Warehouse Shipments & Tracking numbers...');
    const ship1 = await client.query(`
      INSERT INTO shipment_orders (tenant_id, quotation_id, warehouse_id, shipment_code, status, shipping_cost, carrier, tracking_number)
      VALUES ($1, $2, $3, 'SH-MAIN-8801', 'shipped', 85.00, 'FedEx Ground', 'FDX-994827110')
      RETURNING id;
    `, [acmeTenant.id, q1088Id, whMain.id]);
    await client.query(`
      INSERT INTO shipment_items (tenant_id, shipment_order_id, quotation_item_id, fulfilled_qty, is_backorder)
      VALUES ($1, $2, $3, 10, FALSE);
    `, [acmeTenant.id, ship1.rows[0].id, q1088Item1.rows[0].id]);

    const ship2 = await client.query(`
      INSERT INTO shipment_orders (tenant_id, quotation_id, warehouse_id, shipment_code, status, shipping_cost, carrier, tracking_number)
      VALUES ($1, $2, $3, 'SH-EAST-8802', 'shipped', 45.00, 'UPS Next Day Air', '1Z999AA10123456784')
      RETURNING id;
    `, [acmeTenant.id, q1088Id, whEast.id]);
    await client.query(`
      INSERT INTO shipment_items (tenant_id, shipment_order_id, quotation_item_id, fulfilled_qty, is_backorder)
      VALUES ($1, $2, $3, 16, FALSE);
    `, [acmeTenant.id, ship2.rows[0].id, q1088Item2.rows[0].id]);

    // --------------------------------------------------------------------------
    // 15. INVOICES & BILLING (Both Paid & Unpaid across Customers)
    // --------------------------------------------------------------------------
    console.log('[Seed] 16. Inserting Comprehensive Invoices & Line items...');

    // Invoice 1: Wayne Enterprises - Paid ($15,552.00) from QT-1088
    const inv1 = await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at, paid_at)
      VALUES ($1, $2, $3, 'INV-2026-001', 'standard', 'paid', 14400.00, 1152.00, 15552.00, CURRENT_DATE - 10, CURRENT_DATE - 20, CURRENT_DATE - 5)
      RETURNING id;
    `, [acmeTenant.id, q1088Id, wayneCustomer.id]);
    await client.query(`
      INSERT INTO invoice_items (tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total)
      VALUES
        ($1, $2, 'Laptop Pro 14 (10 units)', 'hardware', 10, 1200.00, 12000.00),
        ($1, $2, 'Dual 4K Docking Station (16 units)', 'hardware', 16, 150.00, 2400.00);
    `, [acmeTenant.id, inv1.rows[0].id]);

    // Invoice 2: Wayne Enterprises - Unpaid / Issued ($8,250.00)
    const inv2 = await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at)
      VALUES ($1, $2, $3, 'INV-2026-002', 'standard', 'issued', 7638.89, 611.11, 8250.00, CURRENT_DATE + 14, CURRENT_DATE - 2)
      RETURNING id;
    `, [acmeTenant.id, qDraftId, wayneCustomer.id]);
    await client.query(`
      INSERT INTO invoice_items (tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total)
      VALUES
        ($1, $2, 'Edge IoT Gateway Controller (5 units)', 'hardware', 5, 850.00, 4250.00),
        ($1, $2, 'Security & Compliance Architecture Audit', 'service', 1, 3500.00, 3500.00);
    `, [acmeTenant.id, inv2.rows[0].id]);

    // Invoice 3: Wayne Enterprises - Monthly Recurring ($65.00)
    const inv3 = await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at, paid_at)
      VALUES ($1, $2, $3, 'INV-REC-W01', 'subscription_recurring', 'paid', 65.00, 0.00, 65.00, CURRENT_DATE - 1, CURRENT_DATE - 30, CURRENT_DATE - 2)
      RETURNING id;
    `, [acmeTenant.id, qNegId, wayneCustomer.id]);
    await client.query(`
      INSERT INTO invoice_items (tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total, is_prorated)
      VALUES ($1, $2, 'Gold Velocity Pass Monthly Recurring', 'subscription', 1, 65.00, 65.00, FALSE);
    `, [acmeTenant.id, inv3.rows[0].id]);

    // Invoice 4: Stark Industries - Paid ($12,000.00)
    const inv4 = await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at, paid_at)
      VALUES ($1, $2, $3, 'INV-STARK-001', 'standard', 'paid', 11111.11, 888.89, 12000.00, CURRENT_DATE - 15, CURRENT_DATE - 40, CURRENT_DATE - 12)
      RETURNING id;
    `, [acmeTenant.id, qPendFinId, starkCustomer.id]);
    await client.query(`
      INSERT INTO invoice_items (tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total)
      VALUES ($1, $2, 'High-Performance Workstation Deployment (6 units)', 'hardware', 6, 2000.00, 12000.00);
    `, [acmeTenant.id, inv4.rows[0].id]);

    // Invoice 5: Stark Industries - Unpaid ($45,900.00) from QT-1004
    const inv5 = await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at)
      VALUES ($1, $2, $3, 'INV-STARK-002', 'standard', 'issued', 42500.00, 3400.00, 45900.00, CURRENT_DATE + 21, CURRENT_DATE)
      RETURNING id;
    `, [acmeTenant.id, qPendFinId, starkCustomer.id]);
    await client.query(`
      INSERT INTO invoice_items (tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total)
      VALUES ($1, $2, 'Modular Server Blades 2U Compute Rack', 'hardware', 10, 4250.00, 42500.00);
    `, [acmeTenant.id, inv5.rows[0].id]);

    // Invoice 6: Acme Corp - Paid ($31,104.00) from Q-1042
    const inv6 = await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at, paid_at)
      VALUES ($1, $2, $3, 'INV-ACME-1042', 'standard', 'paid', 28800.00, 2304.00, 31104.00, CURRENT_DATE - 5, CURRENT_DATE - 25, CURRENT_DATE - 3)
      RETURNING id;
    `, [acmeTenant.id, q1042Id, acmeCustomer.id]);
    await client.query(`
      INSERT INTO invoice_items (tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total)
      VALUES ($1, $2, 'Laptop Pro 14 Fleet Upgrade (24 units)', 'hardware', 24, 1200.00, 28800.00);
    `, [acmeTenant.id, inv6.rows[0].id]);

    // Invoice 7: Zenith Co - Overdue ($5,000.00)
    await client.query(`
      INSERT INTO invoices (tenant_id, quotation_id, customer_id, invoice_number, invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at)
      VALUES ($1, $2, $3, 'INV-OVERDUE-07', 'standard', 'issued', 4629.63, 370.37, 5000.00, CURRENT_DATE - 8, CURRENT_DATE - 38);
    `, [acmeTenant.id, qApprovedId, zenithCustomer.id]);

    // --------------------------------------------------------------------------
    // 16. DEAL HEALTH ALERTS (Stalled, Margin, Delivery, and Escalated)
    // --------------------------------------------------------------------------
    console.log('[Seed] 17. Inserting Deal Health Alerts (Pending, Escalated, Resolved)...');
    await client.query(`
      INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status, created_at)
      VALUES
        -- 1. Stalled deal in customer negotiation for Wayne Enterprises
        ($1, $2, 'stalled_deal', 'medium', 'Quotation has been in customer negotiation for over 14 days without agreement.', 14.00, FALSE, 'Pending Review', NOW() - INTERVAL '14 days'),

        -- 2. Discount anomaly on Initech quote - ESCALATED TO ADMIN (test Admin Resolve button!)
        ($1, $3, 'discount_anomaly', 'critical', 'Aggressive hardware discount requested exceeding tier threshold by 12 points. Escalated to Executive Admin for discretion approval.', 25.00, FALSE, 'Escalated to Admin', NOW() - INTERVAL '3 days'),

        -- 3. Delivery slippage on Zenith backorder
        ($1, $4, 'delivery_slippage', 'medium', 'Warehouse backorder on modular compute units risks promising delivery date.', 7.00, FALSE, 'Pending Review', NOW() - INTERVAL '2 days'),

        -- 4. Previously resolved alert
        ($1, $5, 'stalled_deal', 'low', 'Resolved by sales manager following customer contract execution.', 5.00, TRUE, 'Resolved', NOW() - INTERVAL '10 days');
    `, [acmeTenant.id, qNegId, qPendMgrId, q1030Id, qApprovedId]);

    // --------------------------------------------------------------------------
    // 17. INBOUND RFQs & CUSTOMER INQUIRIES
    // --------------------------------------------------------------------------
    console.log('[Seed] 18. Inserting Customer Inbound RFQs...');
    const rfq1 = await client.query(`
      INSERT INTO quotation_requests (tenant_id, customer_id, portal_user_id, assigned_rep_id, status, customer_notes)
      VALUES ($1, $2, $3, $4, 'pending', 'Urgent procurement inquiry for 25 developer workstations for Q4 engineering expansion.')
      RETURNING id;
    `, [acmeTenant.id, wayneCustomer.id, waynePortalUser.id, salesRep.id]);
    await client.query(`
      INSERT INTO quotation_request_items (tenant_id, request_id, product_id, requested_qty, line_notes)
      VALUES
        ($1, $2, $3, 20, 'Requires 32GB RAM upgrade'),
        ($1, $2, $4, 20, 'Include dual 4K docking hubs');
    `, [acmeTenant.id, rfq1.rows[0].id, laptop14Prod.id, dockProd.id]);

    const rfq2 = await client.query(`
      INSERT INTO quotation_requests (tenant_id, customer_id, portal_user_id, assigned_rep_id, status, customer_notes)
      VALUES ($1, $2, $3, $4, 'pending', 'Compute cluster expansion quote request for Stark Industries R&D lab.')
      RETURNING id;
    `, [acmeTenant.id, starkCustomer.id, starkPortalUser.id, clarkRep.id]);
    await client.query(`
      INSERT INTO quotation_request_items (tenant_id, request_id, product_id, requested_qty, line_notes)
      VALUES ($1, $2, $3, 10, 'Requires 24/7 senior operations SLA');
    `, [acmeTenant.id, rfq2.rows[0].id, serverProd.id]);

    await client.query('COMMIT');
    console.log('====================================================');
    console.log('✅ ROBUST SEEDING COMPLETED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    console.log('Test Accounts & Credentials:');
    console.log('  Admin:         admin@acme.com / Password123!');
    console.log('  Manager:       manager@acme.com / Password123!');
    console.log('  Sales Rep:     rep@acme.com / Password123!');
    console.log('  Finance:       finance@acme.com / Password123!');
    console.log('  Rep 2:         clark@acme.com / Password123!');
    console.log('Customer Portal:');
    console.log('  Wayne Ent (Gold):     bruce@wayne.com / Password123!');
    console.log('  Stark Ind (Platinum): tony@stark.com / Password123!');
    console.log('  Cyberdyne (Silver):   miles@cyberdyne.com / Password123!');
    console.log('  Initech (Bronze):     peter@initech.com / Password123!');
    console.log('  LexCorp (Platinum):   lex@lexcorp.com / Password123!');
    console.log('====================================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed Error] Failed to seed database:', err);
    process.exit(1);
  } finally {
    client.release();
    await adminPool.end();
  }
}

runSeed();

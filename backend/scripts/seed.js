import argon2 from 'argon2';
import dotenv from 'dotenv';
import { adminPool } from '../src/config/database.js';

dotenv.config();

async function runSeed() {
  console.log('====================================================');
  console.log('       DEALFLOW 360 - DATABASE SEEDING ENGINE       ');
  console.log('====================================================');

  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');

    console.log('[Seed] Resetting existing tenant data...');
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

    // 1. Tenants
    console.log('[Seed] Inserting Tenants...');
    const tenantRes = await client.query(`
      INSERT INTO tenants (name, subdomain, default_currency, is_active)
      VALUES 
        ('Acme Industrial Tech', 'acme', 'USD', TRUE),
        ('Global Apex Solutions', 'globalapex', 'USD', TRUE)
      RETURNING id, name, subdomain;
    `);
    const acmeTenant = tenantRes.rows[0];
    const globalTenant = tenantRes.rows[1];

    // Password hash (shared test password: 'Password123!')
    const defaultPasswordHash = await argon2.hash('Password123!');

    // 2. Staff Users for Acme
    console.log('[Seed] Inserting Staff Users...');
    const usersRes = await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, full_name, role, historical_discount_avg, is_active)
      VALUES
        ($1, 'admin@acme.com', $2, 'Alice Admin', 'admin', 5.00, TRUE),
        ($1, 'manager@acme.com', $2, 'Mark Manager', 'sales_manager', 5.00, TRUE),
        ($1, 'rep@acme.com', $2, 'Rachel Rep', 'sales_rep', 6.00, TRUE),
        ($1, 'finance@acme.com', $2, 'Frank Finance', 'finance', 3.00, TRUE)
      RETURNING id, email, full_name, role;
    `, [acmeTenant.id, defaultPasswordHash]);

    const salesRep = usersRes.rows.find(u => u.role === 'sales_rep');

    // 3. Customers
    console.log('[Seed] Inserting Customers...');
    const customersRes = await client.query(`
      INSERT INTO customers (tenant_id, company_name, contact_name, email, tier, credit_limit, account_owner_id)
      VALUES
        ($1, 'Acme Corp', 'Alice Acme', 'alice@acmecorp.com', 'Gold', 100000.00, $2),
        ($1, 'Zenith Co', 'Zach Zenith', 'zach@zenith.com', 'Silver', 50000.00, $2),
        ($1, 'Wayne Enterprises', 'Bruce Wayne', 'bruce@wayne.com', 'Gold', 100000.00, $2),
        ($1, 'Stark Industries', 'Tony Stark', 'tony@stark.com', 'Platinum', 250000.00, $2),
        ($1, 'Cyberdyne Systems', 'Miles Dyson', 'miles@cyberdyne.com', 'Silver', 50000.00, $2),
        ($1, 'Initech Corporation', 'Peter Gibbons', 'peter@initech.com', 'Bronze', 20000.00, $2)
      RETURNING id, company_name, tier, email;
    `, [acmeTenant.id, salesRep.id]);

    const acmeCustomer = customersRes.rows.find(c => c.company_name === 'Acme Corp');
    const zenithCustomer = customersRes.rows.find(c => c.company_name === 'Zenith Co');
    const wayneCustomer = customersRes.rows.find(c => c.company_name === 'Wayne Enterprises');
    const starkCustomer = customersRes.rows.find(c => c.company_name === 'Stark Industries');
    const cyberdyneCustomer = customersRes.rows.find(c => c.company_name === 'Cyberdyne Systems');

    // 4. Customer Portal Users
    console.log('[Seed] Inserting Customer Portal Users...');
    await client.query(`
      INSERT INTO customer_portal_users (tenant_id, customer_id, email, password_hash, is_active)
      VALUES
        ($1, $2, 'bruce@wayne.com', $3, TRUE),
        ($1, $4, 'tony@stark.com', $3, TRUE);
    `, [acmeTenant.id, wayneCustomer.id, defaultPasswordHash, starkCustomer.id]);

    // 5. Product Categories
    console.log('[Seed] Inserting Product Categories...');
    const catRes = await client.query(`
      INSERT INTO product_categories (tenant_id, name, default_discount_ceiling_pct)
      VALUES
        ($1, 'Hardware & Devices', 15.00),
        ($1, 'Professional Services', 10.00),
        ($1, 'Software & Subscriptions', 12.00)
      RETURNING id, name, default_discount_ceiling_pct;
    `, [acmeTenant.id]);

    const hwCat = catRes.rows.find(c => c.name.includes('Hardware'));
    const srvCat = catRes.rows.find(c => c.name.includes('Services'));
    const subCat = catRes.rows.find(c => c.name.includes('Software'));

    // 6. Products
    console.log('[Seed] Inserting Products Catalog...');
    const prodRes = await client.query(`
      INSERT INTO products (tenant_id, category_id, sku, name, description, item_type, unit_cost, base_price, tax_rate, is_promoted, is_active)
      VALUES
        ($1, $2, 'HW-LAPTOP-14', 'Laptop Pro 14', 'Flagship developer and executive ultra-portable laptop', 'hardware', 42.00, 1200.00, 8.00, TRUE, TRUE),
        ($1, $2, 'HW-DOCK-01', 'Docking Station', 'Dual 4K display expansion hub with power delivery', 'hardware', 29.00, 150.00, 8.00, FALSE, TRUE),
        ($1, $2, 'HW-LAPTOP-16', 'Enterprise Laptop Pro 16', 'High performance engineering workstation', 'hardware', 1200.00, 2000.00, 8.00, FALSE, TRUE),
        ($1, $2, 'HW-SRV-BLADE', 'High-Performance Server Blade', 'Modular rack-mount server unit', 'hardware', 3200.00, 5000.00, 8.00, FALSE, TRUE),
        ($1, $3, 'SRV-SETUP-MIG', 'Enterprise Setup & Cloud Migration', 'Complete onboarding and architectural configuration', 'service', 600.00, 1500.00, 0.00, FALSE, TRUE),
        ($1, $3, 'SRV-SLA-247', 'Dedicated 24/7 Operations SLA', 'Direct access to senior engineering response team', 'service', 400.00, 1000.00, 0.00, FALSE, TRUE),
        ($1, $4, 'SUB-DF360-SEAT', 'DealFlow 360 Core License (Seat)', 'Continuous quote-to-cash governance suite', 'subscription', 10.00, 65.00, 0.00, FALSE, TRUE),
        ($1, $4, 'SUB-AI-ANOMALY', 'AI Deal Health & Anomaly Predictor', 'Machine learning telemetry addon module', 'subscription', 15.00, 95.00, 0.00, TRUE, TRUE)
      RETURNING id, sku, name, item_type, unit_cost, base_price;
    `, [acmeTenant.id, hwCat.id, srvCat.id, subCat.id]);

    const laptop14Prod = prodRes.rows.find(p => p.sku === 'HW-LAPTOP-14');
    const dockProd = prodRes.rows.find(p => p.sku === 'HW-DOCK-01');
    const laptopProd = prodRes.rows.find(p => p.sku === 'HW-LAPTOP-16');
    const serverProd = prodRes.rows.find(p => p.sku === 'HW-SRV-BLADE');
    const setupProd = prodRes.rows.find(p => p.sku === 'SRV-SETUP-MIG');
    const seatProd = prodRes.rows.find(p => p.sku === 'SUB-DF360-SEAT');
    const aiProd = prodRes.rows.find(p => p.sku === 'SUB-AI-ANOMALY');

    // 7. Product Variants
    console.log('[Seed] Inserting Product Variants...');
    await client.query(`
      INSERT INTO product_variants (tenant_id, product_id, variant_sku, attribute_name, attribute_value, extra_price)
      VALUES
        ($1, $2, 'HW-LAPTOP-32GB', 'Memory / Storage', '32GB RAM / 1TB NVMe', 250.00),
        ($1, $2, 'HW-LAPTOP-64GB', 'Memory / Storage', '64GB RAM / 2TB NVMe', 550.00);
    `, [acmeTenant.id, laptopProd.id]);

    // 8. Discount Governance Rules (Tier x Category)
    console.log('[Seed] Setting up Discount Governance Rules...');
    await client.query(`
      INSERT INTO discount_governance_rules (tenant_id, tier, category_id, max_discount_pct)
      VALUES
        -- Gold Tier (Matches Problem Statement Example)
        ($1, 'Gold', $2, 15.00),   -- Hardware: up to 15%
        ($1, 'Gold', $3, 10.00),   -- Service: up to 10%
        ($1, 'Gold', $4, 12.00),   -- Subscription: up to 12%
        -- Silver Tier
        ($1, 'Silver', $2, 10.00),
        ($1, 'Silver', $3, 7.00),
        ($1, 'Silver', $4, 8.00),
        -- Bronze Tier
        ($1, 'Bronze', $2, 5.00),
        ($1, 'Bronze', $3, 5.00),
        ($1, 'Bronze', $4, 5.00),
        -- Platinum Tier
        ($1, 'Platinum', $2, 20.00),
        ($1, 'Platinum', $3, 15.00),
        ($1, 'Platinum', $4, 18.00);
    `, [acmeTenant.id, hwCat.id, srvCat.id, subCat.id]);

    // 9. Approval Chains (GiST Range Non-Overlapping Rules)
    console.log('[Seed] Setting up Approval Chains...');
    await client.query(`
      INSERT INTO approval_chains (tenant_id, tier, min_discount_pct, max_discount_pct, requires_sales_manager, requires_finance)
      VALUES
        -- Gold Tier
        ($1, 'Gold', 0.01, 10.00, TRUE, FALSE),
        ($1, 'Gold', 10.01, 50.00, TRUE, TRUE),
        -- Silver Tier
        ($1, 'Silver', 0.01, 8.00, TRUE, FALSE),
        ($1, 'Silver', 8.01, 50.00, TRUE, TRUE),
        -- Bronze Tier
        ($1, 'Bronze', 0.01, 5.00, TRUE, FALSE),
        ($1, 'Bronze', 5.01, 50.00, TRUE, TRUE),
        -- Platinum Tier
        ($1, 'Platinum', 0.01, 15.00, TRUE, FALSE),
        ($1, 'Platinum', 15.01, 60.00, TRUE, TRUE);
    `, [acmeTenant.id]);

    // 10. Upsell Rules
    console.log('[Seed] Inserting Upsell & Cross-Sell Rules...');
    await client.query(`
      INSERT INTO upsell_rules (tenant_id, trigger_product_id, suggested_product_id, priority, min_margin_threshold_pct)
      VALUES
        ($1, $2, $3, 1, 20.00),  -- Laptop -> Setup Service
        ($1, $4, $5, 1, 25.00);  -- Platform Seat -> AI Anomaly Module
    `, [acmeTenant.id, laptopProd.id, setupProd.id, seatProd.id, aiProd.id]);

    // 11. Warehouses & Stock
    console.log('[Seed] Inserting Warehouses and Inventory Levels...');
    const whRes = await client.query(`
      INSERT INTO warehouses (tenant_id, name, code, location, shipping_cost_weight, is_active)
      VALUES
        ($1, 'Main Warehouse', 'WH-MAIN', 'San Francisco, CA', 1.00, TRUE),
        ($1, 'East Depot', 'WH-EAST', 'Newark, NJ', 1.05, TRUE),
        ($1, 'Central Logistics Hub', 'WH-CENTRAL', 'Chicago, IL', 1.20, TRUE)
      RETURNING id, code, name;
    `, [acmeTenant.id]);

    const whMain = whRes.rows.find(w => w.code === 'WH-MAIN');
    const whEast = whRes.rows.find(w => w.code === 'WH-EAST');
    const whCentral = whRes.rows.find(w => w.code === 'WH-CENTRAL');

    // Distribute stock across warehouses to demonstrate dynamic splitting & backorders
    // Matches screenshot 1:
    // Main Warehouse: Laptop Pro 14 (In Stock 40, Reserved 18, Avail 22), Docking Station (65 In Stock, 12 Reserved, Avail 53)
    // East Depot: Laptop Pro 14 (In Stock 10, Reserved 6, Avail 4), Docking Station (20 In Stock, 5 Reserved, Avail 15)
    await client.query(`
      INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
      VALUES
        -- Main Warehouse
        ($1, $2, $5, 40, 18), -- Laptop Pro 14 (Avail: 22)
        ($1, $2, $6, 65, 12), -- Docking Station (Avail: 53)
        ($1, $2, $7, 10, 0),  -- Enterprise Laptop Pro 16 (Avail: 10)
        ($1, $2, $8, 1, 1),   -- Server Blade (Avail: 0)

        -- East Depot
        ($1, $3, $5, 10, 6),  -- Laptop Pro 14 (Avail: 4)
        ($1, $3, $6, 20, 5),  -- Docking Station (Avail: 15)
        ($1, $3, $7, 5, 0),   -- Enterprise Laptop Pro 16 (Avail: 5)
        ($1, $3, $8, 8, 6),   -- Server Blade (Avail: 2)

        -- Central Logistics Hub
        ($1, $4, $5, 15, 0),  -- Laptop Pro 14 (Avail: 15)
        ($1, $4, $6, 25, 0);  -- Docking Station (Avail: 25)
    `, [
      acmeTenant.id,
      whMain.id,
      whEast.id,
      whCentral.id,
      laptop14Prod.id,
      dockProd.id,
      laptopProd.id,
      serverProd.id,
    ]);

    // 12. Subscription Plans
    console.log('[Seed] Inserting Subscription Plans...');
    await client.query(`
      INSERT INTO subscription_plans (tenant_id, name, cadence, billing_interval_days, allows_proration)
      VALUES
        ($1, 'Enterprise Monthly', 'monthly', 30, TRUE),
        ($1, 'Annual Scale', 'yearly', 365, TRUE);
    `, [acmeTenant.id]);

    // 13. Seed Confirmed Quotations Awaiting Fulfillment (Matches Screenshot 1 & 2):
    // Order 1: Q-1042 (Acme Corp) - 24 units of Laptop Pro 14 -> Main (22) + East (2) = Split Pending
    console.log('[Seed] Generating Confirmed Order Q-1042 for Acme Corp (Warehouse Split Demonstration)...');
    const q1042Res = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status)
      VALUES ($1, 'Q-1042', $2, $3, 'confirmed')
      RETURNING id;
    `, [acmeTenant.id, acmeCustomer.id, salesRep.id]);
    const q1042Id = q1042Res.rows[0].id;

    await client.query(`
      INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, line_type, quantity, applied_discount_pct
      ) VALUES ($1, $2, $3, 'hardware', 24, 0.00);
    `, [acmeTenant.id, q1042Id, laptop14Prod.id]);

    // Order 2: Q-1030 (Zenith Co) - 10 units of Server Blade -> Total avail across all warehouses = 2 -> Backorder!
    console.log('[Seed] Generating Confirmed Order Q-1030 for Zenith Co (Backorder Demonstration)...');
    const q1030Res = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status)
      VALUES ($1, 'Q-1030', $2, $3, 'confirmed')
      RETURNING id;
    `, [acmeTenant.id, zenithCustomer.id, salesRep.id]);
    const q1030Id = q1030Res.rows[0].id;

    await client.query(`
      INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, line_type, quantity, applied_discount_pct
      ) VALUES ($1, $2, $3, 'hardware', 10, 0.00);
    `, [acmeTenant.id, q1030Id, serverProd.id]);

    // Order 3: Q-1055 (Cyberdyne Systems) - 60 units of Docking Station -> Main (53) + East (7) = Split Pending
    console.log('[Seed] Generating Confirmed Order Q-1055 for Cyberdyne Systems...');
    const q1055Res = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status)
      VALUES ($1, 'Q-1055', $2, $3, 'confirmed')
      RETURNING id;
    `, [acmeTenant.id, cyberdyneCustomer.id, salesRep.id]);
    const q1055Id = q1055Res.rows[0].id;

    await client.query(`
      INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, line_type, quantity, applied_discount_pct
      ) VALUES ($1, $2, $3, 'hardware', 60, 0.00);
    `, [acmeTenant.id, q1055Id, dockProd.id]);

    // Order 4: Problem Statement Example Quotation (Draft with Blended Risk Score = 8):
    console.log('[Seed] Generating Problem Statement Example Quotation (Draft Blended Risk Score = 8)...');
    const quoteRes = await client.query(`
      INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status)
      VALUES ($1, 'QT-DEMO-BLENDED-01', $2, $3, 'draft')
      RETURNING id;
    `, [acmeTenant.id, wayneCustomer.id, salesRep.id]);
    const demoQuoteId = quoteRes.rows[0].id;

    // Insert Item 1: Laptop (12% discount)
    await client.query(`
      INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, line_type, quantity, applied_discount_pct
      ) VALUES ($1, $2, $3, 'hardware', 2, 12.00);
    `, [acmeTenant.id, demoQuoteId, laptopProd.id]);

    // Insert Item 2: Setup Service (18% discount - breaks 10% ceiling by 8 points!)
    await client.query(`
      INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, line_type, quantity, applied_discount_pct
      ) VALUES ($1, $2, $3, 'service', 1, 18.00);
    `, [acmeTenant.id, demoQuoteId, setupProd.id]);

    // 14. Seed Inbound RFQ for Customer Portal
    console.log('[Seed] Generating Sample Inbound RFQ...');
    const rfqRes = await client.query(`
      INSERT INTO quotation_requests (tenant_id, customer_id, portal_user_id, assigned_rep_id, status, customer_notes)
      SELECT $1, $2, cpu.id, $3, 'pending', 'Urgent hardware refresh for Q4 infrastructure expansion'
      FROM customer_portal_users cpu WHERE cpu.customer_id = $2 LIMIT 1
      RETURNING id;
    `, [acmeTenant.id, wayneCustomer.id, salesRep.id]);
    const demoRfqId = rfqRes.rows[0].id;

    await client.query(`
      INSERT INTO quotation_request_items (tenant_id, request_id, product_id, requested_qty, line_notes)
      VALUES
        ($1, $2, $3, 5, 'Requires 64GB memory upgrade'),
        ($1, $2, $4, 1, 'Include weekend deployment assistance');
    `, [acmeTenant.id, demoRfqId, laptopProd.id, setupProd.id]);

    await client.query('COMMIT');
    console.log('====================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('  Staff Admin:   admin@acme.com / Password123!');
    console.log('  Staff Manager: manager@acme.com / Password123!');
    console.log('  Staff Rep:     rep@acme.com / Password123!');
    console.log('  Staff Finance: finance@acme.com / Password123!');
    console.log('  Customer User: bruce@wayne.com / Password123! (Wayne Enterprises, Gold)');
    console.log('  Customer User: tony@stark.com / Password123! (Stark Industries, Platinum)');
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

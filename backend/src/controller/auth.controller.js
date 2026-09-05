import argon2 from 'argon2';
import { withTenantContext, withSystemContext } from '../middleware/tenant-context.middleware.js';
import {
  findStaffUserByEmail,
  findStaffUserById,
  createStaffUser,
  findTenantById
} from '../repository/auth.repository.js';
import { signStaffToken } from '../utils/token.util.js';
import { setStaffCookie, clearStaffCookie } from '../utils/cookie.util.js';

/**
 * Register internal staff member (admin/manager/rep/finance)
 */
export async function registerStaff(req, res, next) {
  try {
    const { tenantId, email, password, fullName, role } = req.body;

    const result = await withSystemContext(async (client) => {
      // 1. Verify tenant exists and is active
      const tenant = await findTenantById(client, tenantId);
      if (!tenant) {
        const err = new Error(`Tenant '${tenantId}' does not exist.`);
        err.status = 404;
        throw err;
      }
      if (!tenant.is_active) {
        const err = new Error(`Tenant is deactivated.`);
        err.status = 403;
        throw err;
      }

      // 2. Hash password with argon2
      const passwordHash = await argon2.hash(password);

      // 3. Create user record
      const newUser = await createStaffUser(client, {
        tenantId,
        email,
        passwordHash,
        fullName,
        role
      });

      return { user: newUser, tenant };
    });

    // 4. Issue JWT and Set Cookie
    const token = signStaffToken({
      userId: result.user.id,
      tenantId: result.user.tenant_id,
      role: result.user.role
    });

    setStaffCookie(res, token);

    return res.status(201).json({
      message: 'Staff user registered successfully.',
      token,
      user: {
        id: result.user.id,
        tenantId: result.user.tenant_id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: result.user.role,
        tenantName: result.tenant.name
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Authenticate internal staff member via email and password
 */
export async function loginStaff(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await withSystemContext(async (client) => {
      return findStaffUserByEmail(client, email);
    });

    if (!user) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      return next(err);
    }

    if (!user.is_active) {
      const err = new Error('Your staff account is currently inactive.');
      err.status = 403;
      return next(err);
    }

    if (!user.tenant_is_active) {
      const err = new Error('Your organization tenant is currently suspended.');
      err.status = 403;
      return next(err);
    }

    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      return next(err);
    }

    // Sign staff JWT
    const token = signStaffToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    });

    setStaffCookie(res, token);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        historicalDiscountAvg: user.historical_discount_avg,
        tenantName: user.tenant_name,
        tenantSubdomain: user.tenant_subdomain
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Re-fetch currently authenticated staff profile from database inside tenant context
 */
export async function getStaffMe(req, res, next) {
  try {
    const profile = await withTenantContext(req.actor, async (client) => {
      return findStaffUserById(client, req.actor.userId, req.actor.tenantId);
    });

    if (!profile) {
      const err = new Error('Staff user not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      user: {
        id: profile.id,
        tenantId: profile.tenant_id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        historicalDiscountAvg: profile.historical_discount_avg,
        isActive: profile.is_active,
        tenantName: profile.tenant_name,
        tenantSubdomain: profile.tenant_subdomain
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear staff session cookie
 */
export function logoutStaff(req, res) {
  clearStaffCookie(res);
  return res.status(200).json({ message: 'Logged out successfully.' });
}

/**
 * Register a brand new company (tenant) with its own isolated infrastructure
 */
export async function registerCompany(req, res, next) {
  try {
    const {
      companyName,
      subdomain,
      defaultCurrency = 'USD',
      fullName,
      email,
      password
    } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCompanyName = companyName.trim();

    // Generate valid subdomain slug if not provided
    let cleanSubdomain = (subdomain || cleanCompanyName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSubdomain || cleanSubdomain.length < 2) {
      cleanSubdomain = `org-${Date.now().toString(36)}`;
    }

    const result = await withSystemContext(async (client) => {
      // 1. Check if email already registered as staff
      const existingUser = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (existingUser.rows.length > 0) {
        const err = new Error('An account with this email address already exists.');
        err.status = 409;
        throw err;
      }

      // 2. Check if subdomain taken; if so, append random suffix
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE subdomain = $1 LIMIT 1',
        [cleanSubdomain]
      );
      if (existingTenant.rows.length > 0) {
        cleanSubdomain = `${cleanSubdomain}-${Math.random().toString(36).substring(2, 6)}`;
      }

      // 3. Create Tenant
      const tenantRes = await client.query(
        `INSERT INTO tenants (name, subdomain, default_currency, is_active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id, name, subdomain, default_currency, created_at`,
        [cleanCompanyName, cleanSubdomain, defaultCurrency.toUpperCase()]
      );
      const tenant = tenantRes.rows[0];

      // 4. Hash password with argon2
      const passwordHash = await argon2.hash(password);

      // 5. Create Admin User
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, historical_discount_avg, is_active)
         VALUES ($1, $2, $3, $4, 'admin', 5.00, TRUE)
         RETURNING id, tenant_id, email, full_name, role`,
        [tenant.id, normalizedEmail, passwordHash, fullName.trim()]
      );
      const user = userRes.rows[0];

      // 6. Bootstrap Company Infrastructure
      // 6a. Product Categories
      const catRes = await client.query(
        `INSERT INTO product_categories (tenant_id, name, default_discount_ceiling_pct)
         VALUES 
           ($1, 'Hardware & Systems', 15.00),
           ($1, 'Professional Services', 10.00),
           ($1, 'Enterprise Subscriptions', 20.00)
         RETURNING id, name`,
        [tenant.id]
      );
      const hwCat = catRes.rows.find(c => c.name.includes('Hardware'));
      const srvCat = catRes.rows.find(c => c.name.includes('Professional'));
      const subCat = catRes.rows.find(c => c.name.includes('Subscriptions'));

      // 6b. Starter Catalog SKUs
      const prodRes = await client.query(
        `INSERT INTO products (tenant_id, category_id, sku, name, description, item_type, unit_cost, base_price, tax_rate, is_active)
         VALUES
           ($1, $2, 'HW-CORE-100', 'Enterprise Core Server Node', 'High-throughput fault-tolerant enterprise node unit.', 'hardware', 2400.00, 3999.00, 5.00, TRUE),
           ($1, $3, 'SRV-DEP-200', 'Rapid Architecture Deployment', 'On-site installation, configuration, and compliance setup.', 'service', 1100.00, 2200.00, 0.00, TRUE),
           ($1, $4, 'SUB-SaaS-300', 'DealFlow360 Telemetry License', 'Monthly autonomous quotation and telemetry radar subscription.', 'subscription', 100.00, 350.00, 0.00, TRUE)
         RETURNING id, sku, item_type`,
        [tenant.id, hwCat.id, srvCat.id, subCat.id]
      );
      const hwProd = prodRes.rows.find(p => p.item_type === 'hardware');

      // 6c. Company Warehouses & Stock
      const whRes = await client.query(
        `INSERT INTO warehouses (tenant_id, name, code, location, shipping_cost_weight, is_active)
         VALUES
           ($1, 'Primary Central Hub', 'WH-MAIN-01', 'North America Hub', 1.00, TRUE),
           ($1, 'Express Logistics Depot', 'WH-DEPOT-02', 'Coastal Facility', 1.25, TRUE)
         RETURNING id, code`,
        [tenant.id]
      );
      const mainWh = whRes.rows[0];
      const depotWh = whRes.rows[1];

      // Stock allocation
      if (hwProd) {
        await client.query(
          `INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
           VALUES
             ($1, $2, $3, 85, 0),
             ($1, $4, $3, 40, 0)`,
          [tenant.id, mainWh.id, hwProd.id, depotWh.id]
        );
      }

      // 6d. Discount Governance Rules
      await client.query(
        `INSERT INTO discount_governance_rules (tenant_id, tier, category_id, max_discount_pct)
         VALUES
           ($1, 'Gold', $2, 15.00),
           ($1, 'Gold', $3, 10.00),
           ($1, 'Gold', $4, 15.00),
           ($1, 'Silver', $2, 10.00),
           ($1, 'Silver', $3, 7.00),
           ($1, 'Silver', $4, 10.00),
           ($1, 'Bronze', $2, 5.00),
           ($1, 'Bronze', $3, 5.00),
           ($1, 'Bronze', $4, 5.00),
           ($1, 'Platinum', $2, 20.00),
           ($1, 'Platinum', $3, 15.00),
           ($1, 'Platinum', $4, 25.00)`,
        [tenant.id, hwCat.id, srvCat.id, subCat.id]
      );

      // 6e. Approval Chains
      await client.query(
        `INSERT INTO approval_chains (tenant_id, tier, min_discount_pct, max_discount_pct, requires_sales_manager, requires_finance)
         VALUES
           ($1, 'Gold', 0.01, 10.00, TRUE, FALSE),
           ($1, 'Gold', 10.01, 50.00, TRUE, TRUE),
           ($1, 'Silver', 0.01, 8.00, TRUE, FALSE),
           ($1, 'Silver', 8.01, 50.00, TRUE, TRUE),
           ($1, 'Bronze', 0.01, 5.00, TRUE, FALSE),
           ($1, 'Bronze', 5.01, 50.00, TRUE, TRUE),
           ($1, 'Platinum', 0.01, 15.00, TRUE, FALSE),
           ($1, 'Platinum', 15.01, 60.00, TRUE, TRUE)`,
        [tenant.id]
      );

      // 6f. Starter Client Company (Customer)
      const custRes = await client.query(
        `INSERT INTO customers (tenant_id, company_name, contact_name, email, tier, credit_limit, account_owner_id)
         VALUES ($1, 'Strategic Client Partner', 'Jordan Vance', $2, 'Gold', 150000.00, $3)
         RETURNING id, company_name, email`,
        [tenant.id, `partner@${cleanSubdomain}.com`, user.id]
      );

      const starterCust = custRes.rows[0];
      await client.query(
        `INSERT INTO customer_portal_users (tenant_id, customer_id, email, password_hash, is_active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [tenant.id, starterCust.id, starterCust.email, passwordHash]
      );

      return { tenant, user };
    });

    // 7. Issue JWT and Set Cookie
    const token = signStaffToken({
      userId: result.user.id,
      tenantId: result.user.tenant_id,
      role: result.user.role
    });

    setStaffCookie(res, token);

    return res.status(201).json({
      message: 'Company workspace and infrastructure initialized successfully.',
      token,
      user: {
        id: result.user.id,
        tenantId: result.user.tenant_id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: result.user.role,
        tenantName: result.tenant.name,
        tenantSubdomain: result.tenant.subdomain
      }
    });
  } catch (err) {
    next(err);
  }
}

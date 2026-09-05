import argon2 from 'argon2';
import { withTenantContext } from '../middleware/tenant-context.middleware.js';

const DEFAULT_PASSWORD = 'Password123!';

/**
 * List all staff users in current tenant
 */
export async function listStaff(req, res, next) {
  try {
    const staff = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(`
        SELECT id, tenant_id, email, full_name, role, historical_discount_avg, is_active, created_at
        FROM users
        WHERE tenant_id = $1
        ORDER BY 
          CASE role
            WHEN 'admin' THEN 1
            WHEN 'sales_manager' THEN 2
            WHEN 'finance' THEN 3
            WHEN 'sales_rep' THEN 4
            ELSE 5
          END,
          full_name ASC
      `, [req.actor.tenantId]);
      return result.rows;
    });

    return res.status(200).json({ staff });
  } catch (err) {
    next(err);
  }
}

/**
 * Change staff role (admin only)
 */
export async function updateStaffRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['admin', 'sales_manager', 'sales_rep', 'finance'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }

    const updatedUser = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(`
        UPDATE users
        SET role = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, full_name, email, role, is_active
      `, [role, id, req.actor.tenantId]);
      return result.rows[0];
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Staff user not found.' });
    }

    return res.status(200).json({
      message: `Staff role updated to '${role}' successfully.`,
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle staff active status
 */
export async function toggleStaffStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updatedUser = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(`
        UPDATE users
        SET is_active = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, full_name, email, role, is_active
      `, [Boolean(is_active), id, req.actor.tenantId]);
      return result.rows[0];
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Staff user not found.' });
    }

    return res.status(200).json({
      message: `Staff account status updated.`,
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new staff user with shared password
 */
export async function createStaffMember(req, res, next) {
  try {
    const { full_name, email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({ message: 'Full name, email, and role are required.' });
    }

    const allowedRoles = ['admin', 'sales_manager', 'sales_rep', 'finance'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${allowedRoles.join(', ')}` });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

    const newUser = await withTenantContext(req.actor, async (client) => {
      // Check existing email in tenant
      const checkRes = await client.query(`
        SELECT id FROM users WHERE email = $1 AND tenant_id = $2
      `, [normalizedEmail, req.actor.tenantId]);

      if (checkRes.rows.length > 0) {
        throw new Error(`A staff user with email '${normalizedEmail}' already exists in this organization.`);
      }

      const result = await client.query(`
        INSERT INTO users (tenant_id, email, password_hash, full_name, role, historical_discount_avg, is_active)
        VALUES ($1, $2, $3, $4, $5, 5.00, TRUE)
        RETURNING id, full_name, email, role, is_active, created_at
      `, [req.actor.tenantId, normalizedEmail, passwordHash, full_name.trim(), role]);

      return result.rows[0];
    });

    return res.status(201).json({
      message: `Staff member '${newUser.full_name}' created successfully. Eligible to login immediately with password '${DEFAULT_PASSWORD}'.`,
      user: newUser
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all customers with subscription and portal status
 */
export async function listCustomersWithDetails(req, res, next) {
  try {
    const customers = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(`
        SELECT c.id, c.tenant_id, c.company_name, c.contact_name, c.email, c.tier,
               c.credit_limit, COALESCE(c.membership_status, 'active') AS membership_status,
               c.created_at,
               s.id AS subscription_id, s.status AS subscription_status,
               sp.name AS subscription_plan_name,
               EXISTS (
                 SELECT 1 FROM customer_portal_users cpu 
                 WHERE cpu.customer_id = c.id AND cpu.is_active = TRUE
               ) AS has_portal_access
        FROM customers c
        LEFT JOIN LATERAL (
          SELECT s2.id, s2.status, s2.plan_id
          FROM subscriptions s2
          WHERE s2.customer_id = c.id
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) s ON TRUE
        LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
        WHERE c.tenant_id = $1
        ORDER BY c.company_name ASC
      `, [req.actor.tenantId]);
      return result.rows;
    });

    return res.status(200).json({ customers });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new Customer + Customer Portal User + Subscription
 */
export async function createCustomerMember(req, res, next) {
  try {
    const {
      company_name,
      contact_name,
      email,
      tier = 'Silver',
      credit_limit = 50000.00,
      subscription_plan_id
    } = req.body;

    if (!company_name || !contact_name || !email) {
      return res.status(400).json({ message: 'Company name, contact name, and email are required.' });
    }

    const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ message: `Tier must be one of: ${validTiers.join(', ')}` });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

    const result = await withTenantContext(req.actor, async (client) => {
      // 1. Insert Customer
      const custRes = await client.query(`
        INSERT INTO customers (tenant_id, company_name, contact_name, email, tier, credit_limit, membership_status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `, [req.actor.tenantId, company_name.trim(), contact_name.trim(), normalizedEmail, tier, credit_limit]);
      const newCustomer = custRes.rows[0];

      // 2. Insert Customer Portal User
      const portalRes = await client.query(`
        INSERT INTO customer_portal_users (tenant_id, customer_id, email, password_hash, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, email, is_active
      `, [req.actor.tenantId, newCustomer.id, normalizedEmail, passwordHash]);
      const portalUser = portalRes.rows[0];

      // 3. Optional Subscription
      let subscription = null;
      if (subscription_plan_id) {
        const planRes = await client.query(`
          SELECT id, name, billing_interval_days FROM subscription_plans WHERE id = $1
        `, [subscription_plan_id]);

        if (planRes.rows[0]) {
          const plan = planRes.rows[0];
          const intervalDays = plan.billing_interval_days || 30;
          const nextBilling = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const subRes = await client.query(`
            INSERT INTO subscriptions (
              tenant_id, customer_id, plan_id,
              start_date, next_billing_date, unit_recurring_price, quantity, status
            )
            VALUES ($1, $2, $3, CURRENT_DATE, $4, 65.00, 1, 'active')
            RETURNING *
          `, [req.actor.tenantId, newCustomer.id, plan.id, nextBilling]);
          subscription = { ...subRes.rows[0], plan_name: plan.name };
        }
      }

      return {
        customer: newCustomer,
        portalUser,
        subscription
      };
    });

    return res.status(201).json({
      message: `Customer '${result.customer.company_name}' registered. Customer portal login active with email '${normalizedEmail}' and password '${DEFAULT_PASSWORD}'.`,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

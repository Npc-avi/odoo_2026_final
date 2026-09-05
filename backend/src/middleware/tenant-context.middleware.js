import { pool, adminPool } from '../config/database.js';

/**
 * Executes an arbitrary database operation within an isolated PostgreSQL transaction,
 * enforcing Row-Level Security session GUCs and PostgreSQL Role assignment.
 * 
 * @param {Object} actor - The authenticated actor ({ actorType, tenantId, userId, role, customerId, portalUserId })
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn - The business repository operation
 */
export async function withTenantContext(actor, fn) {
  if (!actor || !actor.tenantId || !actor.actorType) {
    const err = new Error('Invalid actor context provided for tenant execution.');
    err.status = 401;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Set Tenant ID (always required)
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [actor.tenantId]);

    // 2. Set Actor Specific GUCs and Role
    if (actor.actorType === 'staff') {
      await client.query(`SELECT set_config('app.current_actor_type', 'staff', true)`);
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [actor.userId || null]);
      await client.query(`SELECT set_config('app.current_role', $1, true)`, [actor.role || null]);
      await client.query('SET ROLE app_role_staff');
    } else if (actor.actorType === 'customer_portal') {
      await client.query(`SELECT set_config('app.current_actor_type', 'customer_portal', true)`);
      await client.query(`SELECT set_config('app.current_customer_id', $1, true)`, [actor.customerId || null]);
      await client.query(`SELECT set_config('app.current_portal_user_id', $1, true)`, [actor.portalUserId || null]);
      await client.query('SET ROLE app_role_customer_portal');
    } else {
      const err = new Error(`Unknown actor type '${actor.actorType}'.`);
      err.status = 403;
      throw err;
    }

    // 3. Execute repository logic
    const result = await fn(client);

    // 4. Commit transaction
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[TenantContext] Rollback error:', rbErr.message);
    }
    throw err;
  } finally {
    // 5. CRITICAL: Always RESET ROLE before releasing client back to the pool
    try {
      await client.query('RESET ROLE');
    } catch (resetErr) {
      console.error('[TenantContext] Failed to RESET ROLE before release:', resetErr.message);
    }
    client.release();
  }
}

/**
 * Executes a query in administrative / system context (for pre-auth lookups or cron jobs).
 * 
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn 
 */
export async function withSystemContext(fn) {
  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Executes operations on behalf of an authenticated actor with elevated permissions
 * while strictly setting and enforcing tenant context.
 * 
 * @param {Object} actor - Authenticated actor with tenantId
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn 
 */
export async function withElevatedTenantContext(actor, fn) {
  if (!actor || !actor.tenantId) {
    const err = new Error('Invalid actor context provided for tenant execution.');
    err.status = 401;
    throw err;
  }

  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [actor.tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

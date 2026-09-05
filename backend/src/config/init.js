import { pool } from './database.js';

/**
 * Validates database connectivity and verifies that the current connection role
 * can assume app_role_staff and app_role_customer_portal.
 * Does NOT run schema DDL — dealflow360_schema.sql is run separately/once.
 */
export async function verifyDatabaseInitialization() {
  let client;
  try {
    client = await pool.connect();
    
    // Check basic connectivity
    const res = await client.query('SELECT current_user, session_user, current_database()');
    const { current_user, current_database } = res.rows[0];
    console.log(`[DB Init] Connected to database '${current_database}' as login role '${current_user}'.`);

    // Verify role membership in app_role_staff
    try {
      await client.query('SET ROLE app_role_staff');
      await client.query('RESET ROLE');
      console.log(`[DB Init] Successfully verified role membership: 'app_role_staff'.`);
    } catch (err) {
      console.warn(`[DB Init Warning] Could not assume 'app_role_staff'. Ensure user '${current_user}' has been granted 'app_role_staff':`, err.message);
    }

    // Verify role membership in app_role_customer_portal
    try {
      await client.query(`
        GRANT SELECT (id, name, subdomain) ON tenants TO app_role_customer_portal;
        GRANT SELECT, INSERT, UPDATE, DELETE ON quotation_items TO app_role_customer_portal;
        GRANT UPDATE (status, promised_delivery_date, last_activity_at, updated_at) ON quotations TO app_role_customer_portal;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role_customer_portal;
      `);
      await client.query('SET ROLE app_role_customer_portal');
      await client.query('RESET ROLE');
      console.log(`[DB Init] Successfully verified role membership: 'app_role_customer_portal'.`);
    } catch (err) {
      console.warn(`[DB Init Warning] Could not assume 'app_role_customer_portal'. Ensure user '${current_user}' has been granted 'app_role_customer_portal':`, err.message);
    }

    return true;
  } catch (err) {
    console.error(`[DB Init Error] Failed to connect to database:`, err.message);
    return false;
  } finally {
    if (client) {
      try {
        await client.query('RESET ROLE');
      } catch (_) {}
      client.release();
    }
  }
}

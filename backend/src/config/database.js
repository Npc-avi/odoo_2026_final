import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://dealflow_app_user:StrongPassword123@localhost:5432/dealflow360';
const adminConnectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;

/**
 * Standard Application Pool:
 * Used for all tenant-scoped requests. Must connect as a non-owner role that
 * has membership in app_role_staff and app_role_customer_portal so RLS
 * policies and column grants are strictly enforced by Postgres.
 */
export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

/**
 * System / Administrative Pool:
 * Used exclusively for pre-auth credential lookups and system maintenance/cron jobs
 * (e.g. sp_flag_stalled_deals) that must scan across tenants or verify credentials.
 */
export const adminPool = new Pool({
  connectionString: adminConnectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

adminPool.on('error', (err) => {
  console.error('[PostgreSQL Admin Pool Error]:', err.message);
});

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminUrl = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dealflow360';

async function setupDatabase() {
  console.log('====================================================');
  console.log('    DEALFLOW 360 - DDL SCHEMA & ROLES SETUP         ');
  console.log('====================================================');

  const client = new pg.Client({ connectionString: adminUrl });
  try {
    console.log(`[Setup] Connecting to PostgreSQL via: ${adminUrl.replace(/:[^:@]+@/, ':****@')}...`);
    await client.connect();

    // 1. Create the non-owner application login role if not exists
    console.log('[Setup] Ensuring non-owner application login role exists: dealflow_app_user...');
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dealflow_app_user') THEN
          CREATE ROLE dealflow_app_user WITH LOGIN PASSWORD 'StrongPassword123';
        END IF;
      END $$;
    `);

    // 2. Read and execute dealflow360_schema.sql
    const schemaPath = path.join(__dirname, '..', 'dealflow360_schema.sql');
    console.log(`[Setup] Reading DDL schema from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[Setup] Executing DDL statements, triggers, RLS policies, and stored procedures...');
    await client.query(schemaSql);

    // 3. Grant application role memberships to dealflow_app_user
    console.log('[Setup] Granting app_role_staff and app_role_customer_portal to dealflow_app_user...');
    await client.query(`
      GRANT app_role_staff TO dealflow_app_user;
      GRANT app_role_customer_portal TO dealflow_app_user;
      GRANT CONNECT ON DATABASE dealflow360 TO dealflow_app_user;
      GRANT USAGE ON SCHEMA public TO dealflow_app_user;
    `);

    console.log('====================================================');
    console.log('✅ DATABASE SCHEMA AND ROLES CONFIGURED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('[Setup Error] Failed to setup database schema:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();

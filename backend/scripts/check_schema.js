import { adminPool } from '../src/config/database.js';

async function main() {
  const client = await adminPool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'deal_health_alerts'
    `);
    console.log('deal_health_alerts columns:', res.rows.map(r => r.column_name));

    const subCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
    `);
    console.log('subscriptions columns:', subCols.rows.map(r => r.column_name));

    const invCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
    `);
    console.log('invoices columns:', invCols.rows.map(r => r.column_name));
  } finally {
    client.release();
    await adminPool.end();
  }
}

main().catch(console.error);

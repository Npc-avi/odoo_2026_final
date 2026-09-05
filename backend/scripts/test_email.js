import dotenv from 'dotenv';
dotenv.config();

import { pool, adminPool } from '../src/config/database.js';
import {
  verifySmtpConnection,
  isSmtpConfigured,
  sendQuotationConfirmationEmail
} from '../src/service/email.service.js';

async function main() {
  console.log('======================================================');
  console.log(' DealFlow 360 — SMTP & Quotation Email Verification');
  console.log('======================================================\n');

  console.log('1. Checking SMTP Configuration in .env:');
  console.log(`   - SMTP_HOST:    ${process.env.SMTP_HOST || '(not set)'}`);
  console.log(`   - SMTP_PORT:    ${process.env.SMTP_PORT || '(not set)'}`);
  console.log(`   - SMTP_SERVICE: ${process.env.SMTP_SERVICE || '(none)'}`);
  console.log(`   - SMTP_USER:    ${process.env.SMTP_USER || '(not set)'}`);
  console.log(`   - SMTP_FROM:    ${process.env.SMTP_FROM || '(default)'}`);
  console.log(`   - Configured:   ${isSmtpConfigured() ? 'YES (Live Credentials Detected)' : 'NO (Dev Mock Transporter Active)'}`);

  console.log('\n2. Testing Connection to SMTP Server...');
  const verifyRes = await verifySmtpConnection();
  if (verifyRes.success) {
    console.log(`   SUCCESS: ${verifyRes.message}`);
  } else {
    console.log(`   INFO/STATUS: ${verifyRes.message}`);
    if (verifyRes.error) {
      console.error(`   ERROR DETAIL: ${verifyRes.error}`);
    }
  }

  console.log('\n3. Fetching Sample Confirmed Quotation from Database...');
  const db = adminPool || pool;
  try {
    const qRes = await db.query(`
      SELECT q.id, q.quotation_code, q.status, q.total_amount, c.company_name, c.email
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      ORDER BY (CASE WHEN q.status = 'confirmed' THEN 0 ELSE 1 END), q.updated_at DESC
      LIMIT 1;
    `);

    if (qRes.rowCount === 0) {
      console.log('   No quotations found in database. Run `npm run seed` first.');
      process.exit(0);
    }

    const sampleQuote = qRes.rows[0];
    console.log(`   Found Quotation: ${sampleQuote.quotation_code} (Status: ${sampleQuote.status})`);
    console.log(`   Customer:        ${sampleQuote.company_name} <${sampleQuote.email}>`);
    console.log(`   Total Amount:    $${sampleQuote.total_amount}`);

    console.log('\n4. Dispatched Confirmation Email Pipeline:');
    sendQuotationConfirmationEmail({ quotationId: sampleQuote.id });

    // Wait a brief moment for setImmediate and mail dispatch to finish
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('\nVerification complete!');
  } catch (err) {
    console.error('   Database error while fetching quotation:', err.message);
  } finally {
    await pool.end();
    await adminPool.end();
  }
}

main().catch(console.error);

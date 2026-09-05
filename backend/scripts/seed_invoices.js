import { adminPool } from '../src/config/database.js';

async function seedInvoices() {
  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');

    // Fetch tenant
    const tRes = await client.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tRes.rows[0]?.id;
    if (!tenantId) throw new Error('No tenant found.');

    const repRes = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['sales_rep']);
    const repId = repRes.rows[0]?.id;

    // Find or create Nova Retail
    let novaRes = await client.query('SELECT id FROM customers WHERE company_name = $1', ['Nova Retail']);
    let novaId = novaRes.rows[0]?.id;
    if (!novaId) {
      const insNova = await client.query(
        `INSERT INTO customers (tenant_id, company_name, contact_name, email, tier, credit_limit, account_owner_id)
         VALUES ($1, 'Nova Retail', 'Nora Nova', 'nora@novaretail.com', 'Platinum', 150000.00, $2)
         RETURNING id`,
        [tenantId, repId]
      );
      novaId = insNova.rows[0].id;
    }

    // Fetch customers
    const custRes = await client.query('SELECT id, company_name FROM customers');
    const custMap = {};
    custRes.rows.forEach(c => { custMap[c.company_name] = c.id; });

    // Fetch products
    const prodRes = await client.query('SELECT id, sku, name, base_price, item_type FROM products');
    const prodList = prodRes.rows;
    const defaultProd = prodList[0];

    // Clean existing invoices to prevent duplicate conflicts
    await client.query('DELETE FROM invoice_items');
    await client.query('DELETE FROM invoices');

    console.log('Seeding reference quotations and invoices...');

    // Invoices to build matching reference screenshot:
    // INV-1042: Acme Corp, $2,730, Unpaid (issued), due Sep 10
    // INV-1043: Acme Corp, $46, Paid, due Sep 15 (recurring)
    // INV-1038: Nova Retail, $9,750, Paid, due Aug 30
    // INV-1031: Zenith Co, $50,000, Unpaid, due Sep 20
    // INV-1019: Wayne Enterprises, $4,750, Unpaid, due Sep 25
    // INV-1014: Initech Corporation, $880, Unpaid, due Sep 28
    // plus 20 paid invoices to total 4 Unpaid and 21+ Paid!

    const targetList = [
      {
        num: 'INV-1042',
        customer: 'Acme Corp',
        quoteCode: 'Q-1042',
        type: 'standard',
        status: 'issued', // Unpaid
        total: 2730.00,
        due: '2026-09-10',
        paidAt: null,
        desc: 'Laptop Pro 14 (Partial Delivery Batch - 24 units)'
      },
      {
        num: 'INV-1043',
        customer: 'Acme Corp',
        quoteCode: 'Q-1042',
        type: 'subscription_recurring',
        status: 'paid',
        total: 46.00,
        due: '2026-09-15',
        paidAt: '2026-09-01T12:00:00Z',
        desc: 'DealFlow 360 Core License (Seat) - Monthly Subscription'
      },
      {
        num: 'INV-1038',
        customer: 'Nova Retail',
        quoteCode: 'Q-1038',
        type: 'standard',
        status: 'paid',
        total: 9750.00,
        due: '2026-08-30',
        paidAt: '2026-08-30T10:30:00Z',
        desc: 'High-Performance Server Blade Deployment & Multi-Site Setup'
      },
      {
        num: 'INV-1031',
        customer: 'Zenith Co',
        quoteCode: 'Q-1030',
        type: 'standard',
        status: 'issued', // Unpaid
        total: 50000.00,
        due: '2026-09-20',
        paidAt: null,
        desc: 'Server Blade Cluster Installation'
      },
      {
        num: 'INV-1019',
        customer: 'Wayne Enterprises',
        quoteCode: 'QT-DEMO-BLENDED-01',
        type: 'standard',
        status: 'issued', // Unpaid
        total: 4750.00,
        due: '2026-09-25',
        paidAt: null,
        desc: 'Enterprise Laptop Pro 16 Workstations'
      },
      {
        num: 'INV-1014',
        customer: 'Initech Corporation',
        quoteCode: 'Q-1014',
        type: 'standard',
        status: 'issued', // Unpaid
        total: 880.00,
        due: '2026-09-28',
        paidAt: null,
        desc: 'Peripheral Hardware & Setup Service'
      }
    ];

    // Extra paid invoices
    const extraPaidCustomers = [
      { num: 'INV-1055', cust: 'Cyberdyne Systems', code: 'Q-1055', total: 9000.00, due: '2026-09-12' },
      { num: 'INV-1025', cust: 'Stark Industries', code: 'QT-20260905-GLL63Z', total: 1687.50, due: '2026-09-01' },
      { num: 'INV-1011', cust: 'Acme Corp', code: 'Q-1011', total: 1200.00, due: '2026-08-15' },
      { num: 'INV-1012', cust: 'Zenith Co', code: 'Q-1012', total: 3450.00, due: '2026-08-18' },
      { num: 'INV-1015', cust: 'Wayne Enterprises', code: 'Q-1015', total: 890.00, due: '2026-08-20' },
      { num: 'INV-1016', cust: 'Stark Industries', code: 'Q-1016', total: 14200.00, due: '2026-08-22' },
      { num: 'INV-1018', cust: 'Nova Retail', code: 'Q-1018', total: 2100.00, due: '2026-08-25' },
      { num: 'INV-1020', cust: 'Cyberdyne Systems', code: 'Q-1020', total: 680.00, due: '2026-08-27' },
      { num: 'INV-1022', cust: 'Initech Corporation', code: 'Q-1022', total: 450.00, due: '2026-08-29' },
      { num: 'INV-1023', cust: 'Stark Industries', code: 'Q-1023', total: 6700.00, due: '2026-08-30' },
      { num: 'INV-1026', cust: 'Wayne Enterprises', code: 'Q-1026', total: 3200.00, due: '2026-09-02' },
      { num: 'INV-1028', cust: 'Acme Corp', code: 'Q-1028', total: 750.00, due: '2026-09-03' },
      { num: 'INV-1029', cust: 'Nova Retail', code: 'Q-1029', total: 5400.00, due: '2026-09-04' },
      { num: 'INV-1032', cust: 'Cyberdyne Systems', code: 'Q-1032', total: 1850.00, due: '2026-09-05' },
      { num: 'INV-1033', cust: 'Zenith Co', code: 'Q-1033', total: 8900.00, due: '2026-09-06' },
      { num: 'INV-1034', cust: 'Stark Industries', code: 'Q-1034', total: 290.00, due: '2026-09-07' },
      { num: 'INV-1035', cust: 'Initech Corporation', code: 'Q-1035', total: 1340.00, due: '2026-09-08' },
      { num: 'INV-1036', cust: 'Wayne Enterprises', code: 'Q-1036', total: 4600.00, due: '2026-09-09' },
      { num: 'INV-1037', cust: 'Acme Corp', code: 'Q-1037', total: 310.00, due: '2026-09-10' },
      { num: 'INV-1039', cust: 'Nova Retail', code: 'Q-1039', total: 7800.00, due: '2026-09-11' }
    ];

    extraPaidCustomers.forEach(ep => {
      targetList.push({
        num: ep.num,
        customer: ep.cust,
        quoteCode: ep.code,
        type: 'standard',
        status: 'paid',
        total: ep.total,
        due: ep.due,
        paidAt: '2026-08-25T10:00:00Z',
        desc: `${ep.cust} Fulfillment & Supply Contract`
      });
    });

    for (const item of targetList) {
      const custId = custMap[item.customer] || novaId;

      // Find or create quotation
      let quoteRes = await client.query('SELECT id FROM quotations WHERE quotation_code = $1', [item.quoteCode]);
      let quotationId = quoteRes.rows[0]?.id;

      if (!quotationId) {
        const insQ = await client.query(
          `INSERT INTO quotations (tenant_id, quotation_code, customer_id, assigned_rep_id, status, total_amount)
           VALUES ($1, $2, $3, $4, 'in_fulfillment', $5)
           RETURNING id`,
          [tenantId, item.quoteCode, custId, repId, item.total]
        );
        quotationId = insQ.rows[0].id;

        // Insert quote item
        if (defaultProd) {
          await client.query(
            `INSERT INTO quotation_items (tenant_id, quotation_id, product_id, line_type, quantity, applied_discount_pct, calculated_unit_price, line_total)
             VALUES ($1, $2, $3, $4, 1, 0, $5, $5)`,
            [tenantId, quotationId, defaultProd.id, defaultProd.item_type || 'hardware', item.total]
          );
        }
      }

      const subtotal = Number((item.total * 0.9259).toFixed(2));
      const tax = Number((item.total - subtotal).toFixed(2));

      const insInv = await client.query(
        `INSERT INTO invoices (
          tenant_id, quotation_id, customer_id, invoice_number,
          invoice_type, status, subtotal_amount, tax_amount, total_amount, due_date, issued_at, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
        RETURNING id`,
        [
          tenantId,
          quotationId,
          custId,
          item.num,
          item.type,
          item.status,
          subtotal,
          tax,
          item.total,
          item.due,
          item.paidAt || null
        ]
      );
      const invoiceId = insInv.rows[0].id;

      await client.query(
        `INSERT INTO invoice_items (
          tenant_id, invoice_id, description, item_type, quantity, unit_price, line_total, is_prorated
        ) VALUES ($1, $2, $3, $4, 1, $5, $6, FALSE)`,
        [
          tenantId,
          invoiceId,
          item.desc,
          item.type === 'subscription_recurring' ? 'subscription' : 'hardware',
          subtotal,
          subtotal
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded ${targetList.length} invoices matching reference!`);
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding invoices failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedInvoices();

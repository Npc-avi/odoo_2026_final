import { adminPool } from '../src/config/database.js';

async function main() {
  console.log('[Migration] Starting customer membership & subscription update...');

  // 1. Add membership_status to customers table if not exists
  await adminPool.query(`
    ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS membership_status VARCHAR(50) NOT NULL DEFAULT 'active';
  `);
  console.log('[Migration] Ensured customers.membership_status column exists.');

  // 2. Make quotation_id and quotation_item_id nullable on subscriptions
  await adminPool.query(`
    ALTER TABLE subscriptions 
    ALTER COLUMN quotation_id DROP NOT NULL;
  `);
  await adminPool.query(`
    ALTER TABLE subscriptions 
    ALTER COLUMN quotation_item_id DROP NOT NULL;
  `);
  console.log('[Migration] Made quotation_id and quotation_item_id nullable on subscriptions.');

  // 3. Ensure tier plans exist in subscription_plans for Platinum, Gold, Silver, Bronze
  const defaultTenantRes = await adminPool.query(`SELECT id FROM tenants LIMIT 1`);
  const tenantId = defaultTenantRes.rows[0]?.id;

  if (tenantId) {
    const plansToEnsure = [
      { name: 'Platinum Executive Plan', cadence: 'monthly', interval: 30 },
      { name: 'Gold Corporate Plan', cadence: 'monthly', interval: 30 },
      { name: 'Silver Professional Plan', cadence: 'monthly', interval: 30 },
      { name: 'Bronze Starter Plan', cadence: 'monthly', interval: 30 },
    ];

    for (const p of plansToEnsure) {
      await adminPool.query(`
        INSERT INTO subscription_plans (tenant_id, name, cadence, billing_interval_days, allows_proration)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (tenant_id, name) DO NOTHING;
      `, [tenantId, p.name, p.cadence, p.interval]);
    }

    // 4. Seed or link subscription records for existing customers so they appear in Subscriptions (List)
    const customers = await adminPool.query(`SELECT id, tenant_id, company_name, tier FROM customers`);
    const allPlans = await adminPool.query(`SELECT id, name FROM subscription_plans WHERE tenant_id = $1`, [tenantId]);
    const planMap = {};
    for (const row of allPlans.rows) {
      if (row.name.includes('Platinum')) planMap['Platinum'] = row.id;
      if (row.name.includes('Gold')) planMap['Gold'] = row.id;
      if (row.name.includes('Silver')) planMap['Silver'] = row.id;
      if (row.name.includes('Bronze')) planMap['Bronze'] = row.id;
    }
    const defaultPlanId = allPlans.rows[0]?.id;

    const tierPrices = {
      'Platinum': 499.00,
      'Gold': 299.00,
      'Silver': 149.00,
      'Bronze': 49.00,
    };

    for (const cust of customers.rows) {
      // Check if subscription exists
      const existingSub = await adminPool.query(`SELECT id FROM subscriptions WHERE customer_id = $1`, [cust.id]);
      if (existingSub.rows.length === 0) {
        const planId = planMap[cust.tier] || defaultPlanId;
        const price = tierPrices[cust.tier] || 99.00;
        await adminPool.query(`
          INSERT INTO subscriptions (
            tenant_id, customer_id, plan_id, start_date, next_billing_date,
            unit_recurring_price, quantity, status
          )
          VALUES (
            $1, $2, $3, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days',
            $4, 1, 'active'
          );
        `, [cust.tenant_id, cust.id, planId, price]);
        console.log(`[Migration] Created ${cust.tier} subscription for ${cust.company_name}`);
      }
    }
  }

  console.log('[Migration] Done successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});

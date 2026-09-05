import { adminPool } from '../src/config/database.js';

async function seedComprehensiveDealHealth() {
  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');

    const tRes = await client.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tRes.rows[0]?.id;
    if (!tenantId) throw new Error('No tenant found.');

    // Fetch existing quotations
    const qRes = await client.query(`
      SELECT q.id, q.quotation_code, q.status, c.company_name
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
    `);
    const qMap = {};
    qRes.rows.forEach(q => { qMap[q.quotation_code] = q; });

    console.log('Ensuring all deal health categories have real database flags...');

    // 1. Stalled Deals:
    if (qMap['Q-1030']) {
      const q = qMap['Q-1030'];
      const exists = await client.query(
        "SELECT id FROM deal_health_alerts WHERE quotation_id = $1 AND alert_type = 'stalled_deal'",
        [q.id]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status)
           VALUES ($1, $2, 'stalled_deal', 'medium', 'Quotation idle 9+ days in negotiation without customer confirmation', 9, FALSE, 'Nudge sent')`,
          [tenantId, q.id]
        );
      }
    }

    if (qMap['QT-DEMO-BLENDED-01']) {
      const q = qMap['QT-DEMO-BLENDED-01'];
      const exists = await client.query(
        "SELECT id FROM deal_health_alerts WHERE quotation_id = $1 AND alert_type = 'stalled_deal'",
        [q.id]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status)
           VALUES ($1, $2, 'stalled_deal', 'critical', 'Draft quote idle 7+ days with multiple discount ceiling breaches', 7, FALSE, 'Escalated to Manager')`,
          [tenantId, q.id]
        );
      }
    }

    if (qMap['QT-20260905-5F63V1']) {
      const q = qMap['QT-20260905-5F63V1'];
      const exists = await client.query(
        "SELECT id FROM deal_health_alerts WHERE quotation_id = $1 AND alert_type = 'stalled_deal'",
        [q.id]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status)
           VALUES ($1, $2, 'stalled_deal', 'low', 'Draft quotation inactive for 4 days awaiting customer specifications', 4, FALSE, 'Pending Review')`,
          [tenantId, q.id]
        );
      }
    }

    // 2. Delivery Slippage:
    if (qMap['Q-1030']) {
      const q = qMap['Q-1030'];
      const exists = await client.query(
        "SELECT id FROM deal_health_alerts WHERE quotation_id = $1 AND alert_type = 'delivery_slippage'",
        [q.id]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status)
           VALUES ($1, $2, 'delivery_slippage', 'critical', 'Backorder stockout: 10 Server Blades ordered, only 2 available across all warehouses', 8, FALSE, 'Pending Review')`,
          [tenantId, q.id]
        );
      }
    }

    if (qMap['Q-1042']) {
      const q = qMap['Q-1042'];
      const exists = await client.query(
        "SELECT id FROM deal_health_alerts WHERE quotation_id = $1 AND alert_type = 'delivery_slippage'",
        [q.id]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status)
           VALUES ($1, $2, 'delivery_slippage', 'medium', 'Promised delivery date approaching; dual-warehouse split dispatch pending carrier pickup', 3, FALSE, 'Nudge sent')`,
          [tenantId, q.id]
        );
      }
    }

    if (qMap['Q-1055']) {
      const q = qMap['Q-1055'];
      const exists = await client.query(
        "SELECT id FROM deal_health_alerts WHERE quotation_id = $1 AND alert_type = 'delivery_slippage'",
        [q.id]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO deal_health_alerts (tenant_id, quotation_id, alert_type, severity, description, trigger_metric, is_resolved, action_status)
           VALUES ($1, $2, 'delivery_slippage', 'low', 'Docking station high-volume shipment scheduled for delivery consolidation', 2, FALSE, 'Pending Review')`,
          [tenantId, q.id]
        );
      }
    }

    // Set sample action statuses on discount anomalies
    await client.query(
      `UPDATE deal_health_alerts
       SET action_status = 'Escalated to Manager'
       WHERE alert_type = 'discount_anomaly' AND trigger_metric >= 18.00`
    );
    await client.query(
      `UPDATE deal_health_alerts
       SET action_status = 'Nudge sent'
       WHERE alert_type = 'discount_anomaly' AND trigger_metric < 18.00`
    );

    await client.query('COMMIT');
    console.log('Deal health alerts seeded successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed deal health alerts:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedComprehensiveDealHealth();

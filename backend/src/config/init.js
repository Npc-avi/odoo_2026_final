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
        ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'in_fulfillment';
        ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'fulfillment';

        GRANT SELECT (id, name, subdomain) ON tenants TO app_role_customer_portal;
        GRANT SELECT, INSERT, UPDATE, DELETE ON quotation_items TO app_role_customer_portal;
        GRANT UPDATE (status, promised_delivery_date, last_activity_at, updated_at) ON quotations TO app_role_customer_portal;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role_customer_portal;
        GRANT SELECT ON invoices TO app_role_customer_portal;
        GRANT SELECT ON invoice_items TO app_role_customer_portal;
        GRANT SELECT ON subscriptions TO app_role_customer_portal;
        GRANT SELECT ON subscription_plans TO app_role_customer_portal;

        DROP POLICY IF EXISTS invoice_customer_policy ON invoices;
        CREATE POLICY invoice_customer_policy ON invoices
            FOR SELECT
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                AND (
                    current_setting('app.current_actor_type', true) = 'staff'
                    OR (
                        current_setting('app.current_actor_type', true) = 'customer_portal'
                        AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
                    )
                )
            );

        DROP POLICY IF EXISTS invoice_items_customer_policy ON invoice_items;
        CREATE POLICY invoice_items_customer_policy ON invoice_items
            FOR SELECT
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                AND (
                    current_setting('app.current_actor_type', true) = 'staff'
                    OR (
                        current_setting('app.current_actor_type', true) = 'customer_portal'
                        AND invoice_id IN (
                            SELECT id FROM invoices
                            WHERE customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
                        )
                    )
                )
            );

        DROP POLICY IF EXISTS quotation_customer_policy ON quotations;
        CREATE POLICY quotation_customer_policy ON quotations
            FOR SELECT
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                AND current_setting('app.current_actor_type', true) = 'customer_portal'
                AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
                AND status NOT IN ('draft'::quote_status)
            );

        DROP POLICY IF EXISTS quotation_customer_update_policy ON quotations;
        CREATE POLICY quotation_customer_update_policy ON quotations
            FOR UPDATE
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                AND current_setting('app.current_actor_type', true) = 'customer_portal'
                AND customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
                AND status NOT IN ('draft'::quote_status)
            );

        DROP POLICY IF EXISTS quotation_items_customer_policy ON quotation_items;
        CREATE POLICY quotation_items_customer_policy ON quotation_items
            FOR SELECT
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                AND current_setting('app.current_actor_type', true) = 'customer_portal'
                AND quotation_id IN (
                    SELECT id FROM quotations
                    WHERE customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::UUID
                      AND status NOT IN ('draft'::quote_status)
                )
            );

        CREATE OR REPLACE FUNCTION fn_evaluate_quotation_governance(p_quotation_id UUID)
        RETURNS VOID AS $func$
        DECLARE
            v_tenant_id UUID;
            v_tier customer_tier;
            v_current_status quote_status;
            v_blended_score NUMERIC(8, 2) := 0.00;
            v_requires_manager BOOLEAN := FALSE;
            v_requires_finance BOOLEAN := FALSE;
            v_max_overage NUMERIC(5, 2);
            v_new_status quote_status;
        BEGIN
            SELECT q.tenant_id, c.tier, q.status
            INTO v_tenant_id, v_tier, v_current_status
            FROM quotations q
            JOIN customers c ON c.id = q.customer_id
            WHERE q.id = p_quotation_id;

            IF NOT FOUND THEN
                RETURN;
            END IF;

            IF v_current_status NOT IN ('draft', 'under_negotiation', 'pending_manager', 'pending_finance') THEN
                RETURN;
            END IF;

            SELECT COALESCE(SUM(GREATEST(0, qi.applied_discount_pct - COALESCE(dgr.max_discount_pct, pc.default_discount_ceiling_pct))), 0.00),
                   COALESCE(MAX(GREATEST(0, qi.applied_discount_pct - COALESCE(dgr.max_discount_pct, pc.default_discount_ceiling_pct))), 0.00)
            INTO v_blended_score, v_max_overage
            FROM quotation_items qi
            JOIN products p ON p.id = qi.product_id
            JOIN product_categories pc ON pc.id = p.category_id
            LEFT JOIN discount_governance_rules dgr
                   ON dgr.tenant_id = v_tenant_id AND dgr.tier = v_tier AND dgr.category_id = pc.id
            WHERE qi.quotation_id = p_quotation_id;

            SELECT requires_sales_manager, requires_finance
            INTO v_requires_manager, v_requires_finance
            FROM approval_chains
            WHERE tenant_id = v_tenant_id
              AND tier = v_tier
              AND v_blended_score BETWEEN min_discount_pct AND max_discount_pct
            LIMIT 1;

            -- Draft quotations must strictly remain in draft until explicitly submitted for approval.
            IF v_current_status = 'draft' THEN
                v_new_status := 'draft';
            ELSIF v_blended_score = 0 THEN
                v_new_status := v_current_status;
            ELSIF v_requires_finance THEN
                v_new_status := 'pending_finance';
            ELSIF v_requires_manager THEN
                v_new_status := 'pending_manager';
            ELSE
                v_new_status := 'pending_manager';
            END IF;

            IF v_new_status <> v_current_status THEN
                INSERT INTO approval_audit_logs (
                    tenant_id, quotation_id, reviewer_id, reviewer_role, action,
                    justification, previous_status, new_status
                ) VALUES (
                    v_tenant_id, p_quotation_id, NULL, NULL, 'auto_routed',
                    format('Auto-routed by governance engine: blended risk score = %s (max single-line overage = %s)', v_blended_score, v_max_overage),
                    v_current_status, v_new_status
                );
            END IF;

            UPDATE quotations
            SET blended_risk_score = v_blended_score,
                status = v_new_status,
                updated_at = NOW()
            WHERE id = p_quotation_id;
        END;
        $func$ LANGUAGE plpgsql;

        CREATE OR REPLACE PROCEDURE sp_customer_confirm_quotation(p_quotation_id UUID)
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $proc$
        DECLARE
            v_status_before quote_status;
        BEGIN
            SELECT status INTO v_status_before FROM quotations WHERE id = p_quotation_id;

            IF v_status_before NOT IN ('sent', 'under_negotiation', 'pending_manager', 'pending_finance') THEN
                RAISE EXCEPTION 'Quotation % cannot be confirmed from status %', p_quotation_id, v_status_before;
            END IF;

            UPDATE quotations SET status = 'confirmed', updated_at = NOW() WHERE id = p_quotation_id;
            PERFORM fn_evaluate_quotation_governance(p_quotation_id);
        END;
        $proc$;
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

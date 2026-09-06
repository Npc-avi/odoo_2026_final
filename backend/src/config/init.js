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
        GRANT UPDATE (status, paid_at) ON invoices TO app_role_customer_portal;
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

        DROP POLICY IF EXISTS invoice_customer_update_policy ON invoices;
        CREATE POLICY invoice_customer_update_policy ON invoices
            FOR UPDATE
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

    // Initialize governance_report_schedules table for admin cron job reporting
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS governance_report_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_email VARCHAR(255) NOT NULL,
          frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
          cron_expression VARCHAR(100) NOT NULL DEFAULT '0 9 * * *',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uk_tenant_governance_schedule UNIQUE (tenant_id)
        );

        GRANT SELECT, INSERT, UPDATE, DELETE ON governance_report_schedules TO app_role_staff;
      `);
      console.log(`[DB Init] Verified table 'governance_report_schedules'.`);
    } catch (err) {
      console.warn(`[DB Init Warning] Error checking governance_report_schedules table:`, err.message);
    }

    // Trigger to lock quotation items from modification when parent quotation is in fulfillment
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION fn_prevent_quotation_item_modification_in_fulfillment()
        RETURNS TRIGGER AS $$
        DECLARE
            v_status quote_status;
            v_quote_id UUID;
        BEGIN
            IF TG_OP = 'DELETE' THEN
                v_quote_id := OLD.quotation_id;
            ELSE
                v_quote_id := NEW.quotation_id;
            END IF;

            SELECT status INTO v_status FROM quotations WHERE id = v_quote_id;

            IF v_status IN ('in_fulfillment', 'fulfillment') THEN
                RAISE EXCEPTION 'Quotation is in fulfillment and line items cannot be modified.' USING ERRCODE = '23514';
            END IF;

            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_prevent_quotation_item_modification_in_fulfillment ON quotation_items;
        CREATE TRIGGER trg_prevent_quotation_item_modification_in_fulfillment
        BEFORE INSERT OR UPDATE OR DELETE ON quotation_items
        FOR EACH ROW
        EXECUTE FUNCTION fn_prevent_quotation_item_modification_in_fulfillment();
      `);
      console.log(`[DB Init] Verified trigger 'trg_prevent_quotation_item_modification_in_fulfillment'.`);
    } catch (err) {
      console.warn(`[DB Init Warning] Error ensuring quotation fulfillment trigger:`, err.message);
    }

    // Trigger & function to automatically generate Unpaid Invoice ('issued') when quotation enters fulfillment
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION fn_auto_generate_unpaid_invoice_on_fulfillment()
        RETURNS TRIGGER AS $$
        DECLARE
            v_inv_count INT;
            v_subtotal NUMERIC(12,2);
            v_tax NUMERIC(12,2);
            v_total NUMERIC(12,2);
            v_inv_number VARCHAR(100);
            v_new_inv_id UUID;
            v_due_date DATE;
        BEGIN
            IF (NEW.status IN ('in_fulfillment', 'fulfillment') AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status NOT IN ('in_fulfillment', 'fulfillment'))) THEN
                SELECT COUNT(*) INTO v_inv_count FROM invoices WHERE quotation_id = NEW.id;
                IF v_inv_count = 0 THEN
                    -- Calculate subtotal from items if available, or fall back to quotation fields
                    SELECT COALESCE(SUM(line_total), NEW.subtotal_amount, NEW.total_amount, 0.00)
                    INTO v_subtotal
                    FROM quotation_items
                    WHERE quotation_id = NEW.id;

                    IF v_subtotal IS NULL OR v_subtotal = 0 THEN
                        v_subtotal := COALESCE(NEW.total_amount, 0.00);
                    END IF;

                    v_tax := ROUND(v_subtotal * 0.08, 2);
                    v_total := v_subtotal + v_tax;
                    v_inv_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
                    v_due_date := CURRENT_DATE + 30;

                    INSERT INTO invoices (
                        tenant_id, quotation_id, customer_id, invoice_number,
                        invoice_type, status, subtotal_amount, tax_amount, total_amount,
                        due_date, issued_at
                    ) VALUES (
                        NEW.tenant_id, NEW.id, NEW.customer_id, v_inv_number,
                        'standard', 'issued', v_subtotal, v_tax, v_total,
                        v_due_date, NOW()
                    ) RETURNING id INTO v_new_inv_id;

                    -- Copy quotation line items into invoice_items
                    INSERT INTO invoice_items (
                        tenant_id, invoice_id, quotation_item_id, description, item_type,
                        quantity, unit_price, line_total, is_prorated
                    )
                    SELECT 
                        qi.tenant_id,
                        v_new_inv_id,
                        qi.id,
                        COALESCE(p.name, 'Item') || ' (' || qi.line_type || ')',
                        qi.line_type,
                        qi.quantity,
                        qi.calculated_unit_price,
                        qi.line_total,
                        FALSE
                    FROM quotation_items qi
                    LEFT JOIN products p ON p.id = qi.product_id
                    WHERE qi.quotation_id = NEW.id;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_auto_generate_unpaid_invoice_on_fulfillment ON quotations;
        CREATE TRIGGER trg_auto_generate_unpaid_invoice_on_fulfillment
        AFTER INSERT OR UPDATE OF status ON quotations
        FOR EACH ROW
        EXECUTE FUNCTION fn_auto_generate_unpaid_invoice_on_fulfillment();
      `);
      console.log(`[DB Init] Verified trigger 'trg_auto_generate_unpaid_invoice_on_fulfillment'.`);

      // Backfill any existing in_fulfillment quotation that does not have an invoice yet
      const missingInvoices = await client.query(`
        SELECT q.id, q.tenant_id, q.customer_id, q.quotation_code, q.total_amount, q.subtotal_amount
        FROM quotations q
        WHERE q.status IN ('in_fulfillment', 'fulfillment')
          AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.quotation_id = q.id);
      `);

      for (const q of missingInvoices.rows) {
        const subtotalRes = await client.query(
          `SELECT COALESCE(SUM(line_total), $1) as subtotal FROM quotation_items WHERE quotation_id = $2`,
          [q.total_amount || 0, q.id]
        );
        const subtotal = Number(subtotalRes.rows[0]?.subtotal || q.total_amount || 0);
        const tax = Number((subtotal * 0.08).toFixed(2));
        const total = Number((subtotal + tax).toFixed(2));
        const invNum = 'INV-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const invRes = await client.query(`
          INSERT INTO invoices (
            tenant_id, quotation_id, customer_id, invoice_number,
            invoice_type, status, subtotal_amount, tax_amount, total_amount,
            due_date, issued_at
          ) VALUES ($1, $2, $3, $4, 'standard', 'issued', $5, $6, $7, $8, NOW())
          RETURNING id;
        `, [q.tenant_id, q.id, q.customer_id, invNum, subtotal, tax, total, dueDate]);

        const invId = invRes.rows[0].id;
        await client.query(`
          INSERT INTO invoice_items (
            tenant_id, invoice_id, quotation_item_id, description, item_type,
            quantity, unit_price, line_total, is_prorated
          )
          SELECT 
            qi.tenant_id,
            $1,
            qi.id,
            COALESCE(p.name, 'Item') || ' (' || qi.line_type || ')',
            qi.line_type,
            qi.quantity,
            qi.calculated_unit_price,
            qi.line_total,
            FALSE
          FROM quotation_items qi
          LEFT JOIN products p ON p.id = qi.product_id
          WHERE qi.quotation_id = $2;
        `, [invId, q.id]);

        console.log(`[DB Init] Created unpaid invoice ${invNum} for in_fulfillment quotation ${q.quotation_code}.`);
      }
    } catch (err) {
      console.warn(`[DB Init Warning] Error checking auto invoice on fulfillment trigger:`, err.message);
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

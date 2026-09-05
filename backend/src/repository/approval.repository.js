import {
  GET_QUOTATION_APPROVAL_STATE,
  CHECK_APPROVAL_CHAIN_FOR_TIER,
  UPDATE_QUOTATION_STATUS,
  INSERT_APPROVAL_AUDIT_LOG,
  GET_APPROVAL_AUDIT_TRAIL,
  LIST_GOVERNANCE_RULES,
  UPSERT_GOVERNANCE_RULE,
  DELETE_GOVERNANCE_RULE,
  LIST_APPROVAL_CHAINS,
  INSERT_APPROVAL_CHAIN,
  DELETE_APPROVAL_CHAIN
} from '../queries/approval.query.js';

export async function getApprovalAuditTrail(client, quotationId) {
  const result = await client.query(GET_APPROVAL_AUDIT_TRAIL, [quotationId]);
  return result.rows;
}

export async function processApprovalDecision(client, actor, quotationId, { action, justification }) {
  // 1. Fetch current quotation approval status
  const quoteRes = await client.query(GET_QUOTATION_APPROVAL_STATE, [quotationId]);
  const quote = quoteRes.rows[0];

  if (!quote) {
    const err = new Error(`Quotation '${quotationId}' not found.`);
    err.status = 404;
    throw err;
  }

  const prevStatus = quote.status;
  if (!['pending_manager', 'pending_finance', 'under_negotiation', 'sent'].includes(prevStatus)) {
    const err = new Error(`Quotation is in status '${prevStatus}' and cannot be reviewed via approval pipeline.`);
    err.status = 400;
    throw err;
  }

  // 2. Validate reviewer role permissions
  if (prevStatus === 'pending_manager' && !['sales_manager', 'admin', 'sales_rep'].includes(actor.role)) {
    const err = new Error('Sales Manager or Admin role is required to review this quotation.');
    err.status = 403;
    throw err;
  }

  if (prevStatus === 'pending_finance' && !['finance', 'admin'].includes(actor.role)) {
    const err = new Error('Finance or Admin role is required to review this quotation.');
    err.status = 403;
    throw err;
  }

  // 3. Check line discount against Rep self-authorization limit (5.00%)
  const maxDiscountRes = await client.query(
    `SELECT COALESCE(MAX(applied_discount_pct), 0.00) AS max_discount FROM quotation_items WHERE quotation_id = $1`,
    [quotationId]
  );
  const maxDiscount = Number(maxDiscountRes.rows[0]?.max_discount || 0);
  const repLimit = 5.00;
  const exceedsRepLimit = maxDiscount > repLimit;

  // 4. Determine next status based on role and discount limits
  let newStatus;
  let finalJustification = justification;

  if (action === 'rejected') {
    newStatus = 'rejected';
  } else if (action === 'returned_for_revision') {
    newStatus = 'under_negotiation';
  } else if (action === 'approved') {
    if (actor.role === 'sales_rep') {
      if (exceedsRepLimit) {
        // Discount limit exceeds rep limit (>5%) -> needs approval of both Sales Rep and Manager!
        newStatus = 'pending_manager';
        finalJustification = `${justification} (Endorsed by Sales Rep. Escalated to Sales Manager: line discount ${maxDiscount}% exceeds 5.00% rep limit)`;
      } else {
        // Within rep limit (<=5%) -> approved directly by Sales Representative!
        newStatus = 'confirmed';
        finalJustification = `${justification} (Approved directly by Sales Representative within 5.00% limit)`;
      }
    } else if (actor.role === 'sales_manager' || actor.role === 'admin') {
      // Sales Manager signs off -> confirmed (or escalated to finance if policy requires)
      const chainRes = await client.query(CHECK_APPROVAL_CHAIN_FOR_TIER, [
        actor.tenantId,
        quote.customer_tier,
        quote.blended_risk_score
      ]);
      const chain = chainRes.rows[0];

      if (chain && chain.requires_finance && prevStatus === 'pending_manager') {
        newStatus = 'pending_finance';
      } else {
        newStatus = 'confirmed';
      }
    } else {
      // Finance or other authorized role
      newStatus = 'confirmed';
    }
  }

  // 5. Update quotation status
  await client.query(UPDATE_QUOTATION_STATUS, [quotationId, newStatus]);

  // 6. Insert immutable audit log entry
  const auditRes = await client.query(INSERT_APPROVAL_AUDIT_LOG, [
    actor.tenantId,
    quotationId,
    actor.userId,
    actor.role,
    action,
    finalJustification,
    prevStatus,
    newStatus
  ]);

  return {
    quotationId,
    previousStatus: prevStatus,
    newStatus,
    auditLog: auditRes.rows[0]
  };
}

// Governance Configuration
export async function getGovernanceRules(client) {
  const result = await client.query(LIST_GOVERNANCE_RULES);
  return result.rows;
}

export async function upsertGovernanceRule(client, tenantId, data) {
  const result = await client.query(UPSERT_GOVERNANCE_RULE, [
    tenantId,
    data.tier,
    data.categoryId,
    data.maxDiscountPct
  ]);
  return result.rows[0];
}

export async function deleteGovernanceRule(client, ruleId) {
  const result = await client.query(DELETE_GOVERNANCE_RULE, [ruleId]);
  return result.rows[0] || null;
}

// Approval Chains Configuration
export async function getApprovalChains(client) {
  const result = await client.query(LIST_APPROVAL_CHAINS);
  return result.rows;
}

export async function createApprovalChainRule(client, tenantId, data) {
  const result = await client.query(INSERT_APPROVAL_CHAIN, [
    tenantId,
    data.tier,
    data.minDiscountPct,
    data.maxDiscountPct,
    data.requiresSalesManager,
    data.requiresFinance
  ]);
  return result.rows[0];
}

export async function deleteApprovalChainRule(client, chainId) {
  const result = await client.query(DELETE_APPROVAL_CHAIN, [chainId]);
  return result.rows[0] || null;
}

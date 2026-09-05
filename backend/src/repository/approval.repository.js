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

  // 2. Validate reviewer role permissions & enforce Admin view-only
  if (actor.role === 'admin') {
    const err = new Error('Administrators have view-only access to approvals. Decisions must be made by Sales Representatives or Sales Managers.');
    err.status = 403;
    throw err;
  }

  if (prevStatus === 'pending_manager' && !['sales_manager', 'sales_rep'].includes(actor.role)) {
    const err = new Error('Sales Manager or Sales Representative role is required to review this quotation.');
    err.status = 403;
    throw err;
  }

  if (prevStatus === 'pending_finance' && actor.role !== 'finance') {
    const err = new Error('Finance role is required to review this quotation.');
    err.status = 403;
    throw err;
  }

  // 3. Check line discount against customer package / tier standard ceiling
  // Standard limits: Gold: 15%, Platinum: 20%, Silver: 10%, Bronze: 5%
  const tierCeilings = { Platinum: 20.0, Gold: 15.0, Silver: 10.0, Bronze: 5.0 };
  const standardPackageLimit = tierCeilings[quote.customer_tier] || 15.0;

  const maxDiscountRes = await client.query(
    `SELECT COALESCE(MAX(applied_discount_pct), 0.00) AS max_discount FROM quotation_items WHERE quotation_id = $1`,
    [quotationId]
  );
  const maxDiscount = Number(maxDiscountRes.rows[0]?.max_discount || 0);
  const exceedsStandardPackageLimit = maxDiscount > standardPackageLimit || Number(quote.blended_risk_score || 0) > 0;

  // 4. Determine next status based on role and package standard discount limits
  let newStatus;
  let finalJustification = justification;

  if (action === 'rejected') {
    newStatus = 'rejected';
  } else if (action === 'returned_for_revision') {
    newStatus = 'under_negotiation';
  } else if (action === 'approved') {
    if (actor.role === 'sales_rep') {
      if (exceedsStandardPackageLimit) {
        // Any request above set standard of the discount of particular package (e.g. Gold >15%) needs manager approval.
        // Only show rep approved when service rep approves, and still show into negotiation unless manager also approves!
        newStatus = 'under_negotiation';
        finalJustification = `${justification} (Rep Approved. Request discount of ${maxDiscount}% exceeds ${quote.customer_tier} standard limit of ${standardPackageLimit}%. Kept in negotiation awaiting Manager approval)`;
      } else {
        // Within package standard -> rep can approve directly
        newStatus = 'confirmed';
        finalJustification = `${justification} (Approved directly by Sales Representative within ${quote.customer_tier} standard limit of ${standardPackageLimit}%)`;
      }
    } else if (actor.role === 'sales_manager') {
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
        finalJustification = `${justification} (Manager Approved - Quotation Confirmed)`;
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

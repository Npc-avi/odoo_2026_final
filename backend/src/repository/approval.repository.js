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

  // 3. Determine next status
  let newStatus;
  if (action === 'rejected') {
    newStatus = 'rejected';
  } else if (action === 'returned_for_revision') {
    newStatus = 'under_negotiation';
  } else if (action === 'approved') {
    if (prevStatus === 'pending_manager') {
      // Check if multi-level approval requires finance review as well
      const chainRes = await client.query(CHECK_APPROVAL_CHAIN_FOR_TIER, [
        actor.tenantId,
        quote.customer_tier,
        quote.blended_risk_score
      ]);
      const chain = chainRes.rows[0];

      if (chain && chain.requires_finance) {
        newStatus = 'pending_finance';
      } else {
        newStatus = 'confirmed';
      }
    } else {
      // Approved by finance, sales rep, or manager
      newStatus = 'confirmed';
    }
  }

  // 4. Update quotation status
  await client.query(UPDATE_QUOTATION_STATUS, [quotationId, newStatus]);

  // 5. Insert immutable audit log entry
  const auditRes = await client.query(INSERT_APPROVAL_AUDIT_LOG, [
    actor.tenantId,
    quotationId,
    actor.userId,
    actor.role,
    action,
    justification,
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

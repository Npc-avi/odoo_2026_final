import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  getApprovalAuditTrail,
  processApprovalDecision,
  getGovernanceRules,
  upsertGovernanceRule,
  deleteGovernanceRule,
  getApprovalChains,
  createApprovalChainRule,
  deleteApprovalChainRule
} from '../repository/approval.repository.js';

/**
 * Get audit trail for a quotation
 */
export async function getAuditTrail(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const auditLogs = await withTenantContext(req.actor, async (client) => {
      return getApprovalAuditTrail(client, id);
    });
    return res.status(200).json({ auditLogs });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit manual approval action (approve, reject, return for revision)
 */
export async function handleApprovalAction(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const decision = await withTenantContext(req.actor, async (client) => {
      return processApprovalDecision(client, req.actor, id, req.body);
    });

    return res.status(200).json({
      message: `Quotation status updated to '${decision.newStatus}'.`,
      decision
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List Discount Governance Rules
 */
export async function listGovernanceRules(req, res, next) {
  try {
    const rules = await withTenantContext(req.actor, async (client) => {
      return getGovernanceRules(client);
    });
    return res.status(200).json({ rules });
  } catch (err) {
    next(err);
  }
}

/**
 * Create or Update Discount Governance Rule
 */
export async function saveGovernanceRule(req, res, next) {
  try {
    const rule = await withTenantContext(req.actor, async (client) => {
      return upsertGovernanceRule(client, req.actor.tenantId, req.body);
    });
    return res.status(201).json({ rule });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Discount Governance Rule
 */
export async function removeGovernanceRule(req, res, next) {
  try {
    const { id } = req.params;
    const rule = await withTenantContext(req.actor, async (client) => {
      return deleteGovernanceRule(client, id);
    });
    return res.status(200).json({ message: 'Governance rule removed.', rule });
  } catch (err) {
    next(err);
  }
}

/**
 * List Approval Chains
 */
export async function listApprovalChains(req, res, next) {
  try {
    const chains = await withTenantContext(req.actor, async (client) => {
      return getApprovalChains(client);
    });
    return res.status(200).json({ chains });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Approval Chain Rule
 */
export async function saveApprovalChain(req, res, next) {
  try {
    const chain = await withTenantContext(req.actor, async (client) => {
      return createApprovalChainRule(client, req.actor.tenantId, req.body);
    });
    return res.status(201).json({ chain });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Approval Chain Rule
 */
export async function removeApprovalChain(req, res, next) {
  try {
    const { id } = req.params;
    const chain = await withTenantContext(req.actor, async (client) => {
      return deleteApprovalChainRule(client, id);
    });
    return res.status(200).json({ message: 'Approval chain rule removed.', chain });
  } catch (err) {
    next(err);
  }
}

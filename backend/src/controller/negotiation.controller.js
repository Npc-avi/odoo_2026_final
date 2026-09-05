import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  getNegotiationsByQuote,
  addCustomerPortalNegotiation,
  addStaffNegotiation,
  customerConfirmQuotation
} from '../repository/negotiation.repository.js';

/**
 * List all negotiation threads / counter offers on a quotation
 */
export async function listNegotiationThread(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const threads = await withTenantContext(req.actor, async (client) => {
      return getNegotiationsByQuote(client, id);
    });
    return res.status(200).json({ negotiations: threads });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer Portal: Submit a counter-discount or line comment
 */
export async function submitPortalNegotiation(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const entry = await withTenantContext(req.actor, async (client) => {
      return addCustomerPortalNegotiation(client, req.actor, id, req.body);
    });

    return res.status(201).json({
      message: entry.triggers_approval_reset
        ? 'Counter proposal submitted. Note: The requested discount exceeds standard policy and will require manager approval upon confirmation.'
        : 'Counter proposal submitted successfully.',
      negotiation: entry
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Respond to customer negotiation inside workspace
 */
export async function submitStaffNegotiation(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const entry = await withTenantContext(req.actor, async (client) => {
      return addStaffNegotiation(client, req.actor, id, req.body);
    });

    return res.status(201).json({
      message: 'Negotiation response posted.',
      negotiation: entry
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer Portal: Confirm Quotation (1-click final confirmation)
 * Executes stored procedure `sp_customer_confirm_quotation` which checks governance
 */
export async function confirmQuotationPortal(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const result = await withTenantContext(req.actor, async (client) => {
      return customerConfirmQuotation(client, id);
    });

    return res.status(200).json({
      message: result.message,
      confirmation: result
    });
  } catch (err) {
    next(err);
  }
}

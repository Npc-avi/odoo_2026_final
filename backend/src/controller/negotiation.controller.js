import { withTenantContext, withElevatedTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  emitNegotiationUpdated,
  emitQuotationUpdated
} from '../service/socket.service.js';
import {
  getNegotiationsByQuote,
  addCustomerPortalNegotiation,
  addStaffNegotiation,
  customerConfirmQuotation
} from '../repository/negotiation.repository.js';
import { sendQuotationConfirmationEmail } from '../service/email.service.js';

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
    const entry = await withElevatedTenantContext(req.actor, async (client) => {
      const qCheck = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
      if (qCheck.rows.length === 0) {
        const err = new Error('Quotation not found.');
        err.status = 404;
        throw err;
      }
      const status = qCheck.rows[0].status;
      if (status === 'in_fulfillment' || status === 'fulfillment') {
        const err = new Error('Quotation is in fulfillment and cannot be updated.');
        err.status = 400;
        throw err;
      }
      if (status === 'confirmed') {
        const err = new Error('Confirmed quotations cannot be negotiated.');
        err.status = 400;
        throw err;
      }
      return addCustomerPortalNegotiation(client, req.actor, id, req.body);
    });

    emitNegotiationUpdated(req.actor.tenantId, id, { negotiation: entry, status: 'under_negotiation' });

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
      const qCheck = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
      if (qCheck.rows.length === 0) {
        const err = new Error('Quotation not found.');
        err.status = 404;
        throw err;
      }
      const status = qCheck.rows[0].status;
      if (status === 'in_fulfillment' || status === 'fulfillment') {
        const err = new Error('Quotation is in fulfillment and cannot be updated.');
        err.status = 400;
        throw err;
      }
      return addStaffNegotiation(client, req.actor, id, req.body);
    });

    emitNegotiationUpdated(req.actor.tenantId, id, { negotiation: entry, status: 'under_negotiation' });

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
    const result = await withElevatedTenantContext(req.actor, async (client) => {
      const qCheck = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
      if (qCheck.rows.length === 0) {
        const err = new Error('Quotation not found.');
        err.status = 404;
        throw err;
      }
      const status = qCheck.rows[0].status;
      if (status === 'in_fulfillment' || status === 'fulfillment') {
        const err = new Error('Quotation is already in fulfillment and cannot be modified.');
        err.status = 400;
        throw err;
      }
      if (status === 'confirmed') {
        const err = new Error('Quotation is already confirmed.');
        err.status = 400;
        throw err;
      }
      return customerConfirmQuotation(client, id);
    });

    emitQuotationUpdated(req.actor.tenantId, id, { confirmation: result, status: result.status });

    if (result.status === 'confirmed') {
      sendQuotationConfirmationEmail({ quotationId: id });
    }

    return res.status(200).json({
      message: result.message,
      confirmation: result
    });
  } catch (err) {
    next(err);
  }
}

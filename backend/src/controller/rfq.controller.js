import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  createQuotationRequest,
  getRfqsForCustomer,
  getRfqsForStaff,
  getRfqDetail,
  convertRfqToQuotation,
  declineRfq
} from '../repository/rfq.repository.js';
import { sendRfqNotificationEmail } from '../service/email.service.js';

/**
 * Customer Portal: Submit an inbound Request for Quotation (RFQ)
 */
export async function submitRfqPortal(req, res, next) {
  try {
    const result = await withTenantContext(req.actor, async (client) => {
      return createQuotationRequest(client, req.actor, req.body);
    });

    // Send async email notification to rep ONLY if explicitly enabled
    if (process.env.ENABLE_RFQ_EMAIL_NOTIFICATIONS === 'true') {
      try {
        sendRfqNotificationEmail({
          repEmail: process.env.SALES_REP_ALERT_EMAIL || 'sales-ops@dealflow360.internal',
          repName: 'Assigned Sales Representative',
          customerName: `Customer Account ${req.actor.customerId}`,
          rfqId: result.request.id
        });
      } catch (_) {}
    }

    return res.status(201).json({
      message: 'Quotation request submitted successfully.',
      request: result.request,
      items: result.items
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer Portal: List customer's own quotation requests
 */
export async function listCustomerRfqs(req, res, next) {
  try {
    const rfqs = await withTenantContext(req.actor, async (client) => {
      return getRfqsForCustomer(client, req.actor.customerId);
    });
    return res.status(200).json({ rfqs });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: List all incoming quotation requests for tenant
 */
export async function listStaffRfqs(req, res, next) {
  try {
    const rfqs = await withTenantContext(req.actor, async (client) => {
      return getRfqsForStaff(client);
    });
    return res.status(200).json({ rfqs });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Get RFQ Details and Requested Lines
 */
export async function getRfq(req, res, next) {
  try {
    const { id } = req.params;
    const rfq = await withTenantContext(req.actor, async (client) => {
      return getRfqDetail(client, id);
    });

    if (!rfq) {
      const err = new Error('Quotation request not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ rfq });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Convert RFQ to Draft Quotation (1-Click stored procedure call)
 */
export async function convertRfq(req, res, next) {
  try {
    const { id } = req.params;
    const repId = req.body.assignedRepId || req.actor.userId;

    const quotation = await withTenantContext(req.actor, async (client) => {
      return convertRfqToQuotation(client, id, repId);
    });

    return res.status(200).json({
      message: 'Quotation request successfully converted to draft quotation.',
      quotation
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Decline RFQ
 */
export async function rejectRfq(req, res, next) {
  try {
    const { id } = req.params;
    const result = await withTenantContext(req.actor, async (client) => {
      return declineRfq(client, id);
    });

    if (!result) {
      const err = new Error('Quotation request not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Quotation request has been declined.',
      rfq: result
    });
  } catch (err) {
    next(err);
  }
}

import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  getSubscriptions,
  getSubscriptionDetail,
  generateBillingFromQuotation,
  adjustSubscriptionSeats,
  cancelSubscriptionContract,
  getInvoices,
  getInvoiceDetail,
  markInvoicePaid
} from '../repository/billing.repository.js';

// Subscription Plans
export async function listPlans(req, res, next) {
  try {
    const plans = await withTenantContext(req.actor, async (client) => {
      return getSubscriptionPlans(client);
    });
    return res.status(200).json({ plans });
  } catch (err) {
    next(err);
  }
}

export async function addPlan(req, res, next) {
  try {
    const plan = await withTenantContext(req.actor, async (client) => {
      return createSubscriptionPlan(client, req.actor.tenantId, req.body);
    });
    return res.status(201).json({ plan });
  } catch (err) {
    next(err);
  }
}

// Subscriptions
export async function listAllSubscriptions(req, res, next) {
  try {
    const subscriptions = await withTenantContext(req.actor, async (client) => {
      return getSubscriptions(client);
    });
    return res.status(200).json({ subscriptions });
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const sub = await withTenantContext(req.actor, async (client) => {
      return getSubscriptionDetail(client, id);
    });

    if (!sub) {
      const err = new Error('Subscription not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ subscription: sub });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate Hybrid Billing (Invoices + Subscriptions) from confirmed quotation
 */
export async function generateBilling(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const billing = await withTenantContext(req.actor, async (client) => {
      return generateBillingFromQuotation(client, req.actor.tenantId, id);
    });

    return res.status(201).json({
      message: 'Hybrid billing generated successfully.',
      billing
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mid-Cycle Subscription Seat Adjustment with Proration
 */
export async function adjustSeats(req, res, next) {
  try {
    const { id } = req.params; // subscription_id
    const { newQuantity } = req.body;

    const result = await withTenantContext(req.actor, async (client) => {
      return adjustSubscriptionSeats(client, req.actor.tenantId, id, Number(newQuantity));
    });

    return res.status(200).json({
      message: 'Subscription seats adjusted and proration billing generated.',
      adjustment: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel active subscription with credit note refund calculation
 */
export async function cancelSubscription(req, res, next) {
  try {
    const { id } = req.params; // subscription_id
    const result = await withTenantContext(req.actor, async (client) => {
      return cancelSubscriptionContract(client, req.actor.tenantId, id);
    });

    return res.status(200).json({
      message: 'Subscription canceled and credit note generated.',
      cancellation: result
    });
  } catch (err) {
    next(err);
  }
}

// Invoices
export async function listAllInvoices(req, res, next) {
  try {
    const invoices = await withTenantContext(req.actor, async (client) => {
      return getInvoices(client);
    });
    return res.status(200).json({ invoices });
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await withTenantContext(req.actor, async (client) => {
      return getInvoiceDetail(client, id);
    });

    if (!invoice) {
      const err = new Error('Invoice not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ invoice });
  } catch (err) {
    next(err);
  }
}

/**
 * Record payment for invoice (supports test flow & finance operations)
 */
export async function recordPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { paidAt } = req.body;

    const invoice = await withTenantContext(req.actor, async (client) => {
      return markInvoicePaid(client, id, paidAt);
    });

    if (!invoice) {
      const err = new Error('Invoice not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Payment recorded successfully. Invoice marked as paid.',
      invoice
    });
  } catch (err) {
    next(err);
  }
}

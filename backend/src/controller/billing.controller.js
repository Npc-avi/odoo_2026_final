import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  getSubscriptions,
  getSubscriptionDetail,
  generateBillingFromQuotation,
  adjustSubscriptionSeats,
  cancelSubscriptionContract,
  updateSubscriptionStatus,
  updateCustomerTier,
  getInvoices,
  getInvoiceDetail,
  markInvoicePaid
} from '../repository/billing.repository.js';
import { createOrder, verifySignature } from '../service/razorpay.service.js';
import { emitInvoiceUpdated } from '../service/socket.service.js';

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

export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await withTenantContext(req.actor, async (client) => {
      return updateSubscriptionStatus(client, id, status);
    });

    return res.status(200).json({
      message: `Subscription status updated to ${status}.`,
      subscription: result
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerTierHandler(req, res, next) {
  try {
    const { customerId } = req.params;
    const { tier } = req.body;
    if (!['Bronze', 'Silver', 'Gold', 'Platinum'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid customer tier. Must be Bronze, Silver, Gold, or Platinum.' });
    }

    const customer = await withTenantContext(req.actor, async (client) => {
      return updateCustomerTier(client, customerId, tier);
    });

    return res.status(200).json({
      message: `Customer tier updated to ${tier}.`,
      customer
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

    emitInvoiceUpdated(req.actor.tenantId, { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, status: 'paid' });

    return res.status(200).json({
      message: 'Payment recorded successfully. Invoice marked as paid.',
      invoice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Razorpay: Create order for an unpaid invoice
 * Open to any currency as requested in test mode (e.g. USD, INR, EUR, etc.)
 */
export async function createRazorpayOrderForInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const requestedCurrency = req.body.currency || req.query.currency;

    const invoice = await withTenantContext(req.actor, async (client) => {
      let query = `
        SELECT i.id, i.tenant_id, i.quotation_id, i.customer_id, i.invoice_number,
               i.invoice_type, i.status, i.total_amount,
               c.company_name AS customer_name
        FROM invoices i
        JOIN customers c ON c.id = i.customer_id
        WHERE (i.id::text = $1 OR UPPER(i.invoice_number) = UPPER($1))
      `;
      const params = [id];
      if (req.actor.actorType === 'customer_portal') {
        query += ` AND i.customer_id = $2`;
        params.push(req.actor.customerId);
      }
      const qRes = await client.query(query, params);
      return qRes.rows[0] || null;
    });

    if (!invoice) {
      const err = new Error('Invoice not found or access denied.');
      err.status = 404;
      return next(err);
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Invoice is already paid and reconciled.' });
    }

    // Determine currency: client override -> env RAZORPAY_CURRENCY -> default INR
    const currency = (
      requestedCurrency ||
      process.env.RAZORPAY_CURRENCY ||
      'INR'
    ).toUpperCase();

    // Calculate amount in smallest unit (e.g., cents/paise)
    const rawTotal = Number(invoice.total_amount || 0);
    const amountInSmallestUnit = Math.round(rawTotal * 100);

    if (amountInSmallestUnit <= 0) {
      return res.status(400).json({ message: 'Invoice amount must be greater than zero to initiate payment.' });
    }

    const { order, keyId } = await createOrder({
      amount: amountInSmallestUnit,
      currency,
      receipt: `inv_${invoice.invoice_number || invoice.id.slice(0, 8)}`,
      notes: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerId: invoice.customer_id,
        tenantId: invoice.tenant_id,
      },
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        customer_name: invoice.customer_name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Razorpay: Verify payment signature and mark invoice paid
 */
export async function verifyRazorpayPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: 'Missing required Razorpay payment verification parameters.',
      });
    }

    const isValid = verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        message: 'Invalid Razorpay payment signature. Payment verification failed.',
      });
    }

    // Signature verified! Mark invoice as paid
    const updatedInvoice = await withTenantContext(req.actor, async (client) => {
      let query = `
        UPDATE invoices
        SET status = 'paid', paid_at = NOW()
        WHERE (id::text = $1 OR UPPER(invoice_number) = UPPER($1))
      `;
      const params = [id];
      if (req.actor.actorType === 'customer_portal') {
        query += ` AND customer_id = $2`;
        params.push(req.actor.customerId);
      }
      query += ` RETURNING *;`;
      const updateRes = await client.query(query, params);
      return updateRes.rows[0] || null;
    });

    if (!updatedInvoice) {
      const err = new Error('Invoice not found during settlement.');
      err.status = 404;
      return next(err);
    }

    // Broadcast real-time invoice payment to company and customer portal
    emitInvoiceUpdated(req.actor.tenantId || updatedInvoice.tenant_id, {
      invoiceId: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoice_number,
      status: 'paid',
      razorpay_payment_id,
    });

    return res.status(200).json({
      success: true,
      message: `Payment of ${updatedInvoice.invoice_number} successfully verified and reconciled via Razorpay!`,
      invoice: updatedInvoice,
      paymentDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Customer Portal Specific Invoice Endpoints
// ============================================================================

export async function listCustomerInvoices(req, res, next) {
  try {
    const customerId = req.actor.customerId;
    const invoices = await withTenantContext(req.actor, async (client) => {
      const result = await client.query(`
        SELECT i.id, i.tenant_id, i.quotation_id, i.customer_id, i.invoice_number,
               i.invoice_type, i.status, i.subtotal_amount, i.tax_amount, i.total_amount,
               i.due_date, i.issued_at, i.paid_at,
               c.company_name AS customer_name,
               q.quotation_code, q.status AS quotation_status
        FROM invoices i
        JOIN customers c ON c.id = i.customer_id
        LEFT JOIN quotations q ON q.id = i.quotation_id
        WHERE i.customer_id = $1
        ORDER BY i.issued_at DESC
      `, [customerId]);
      return result.rows;
    });
    return res.status(200).json({ invoices });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const customerId = req.actor.customerId;
    const invoice = await withTenantContext(req.actor, async (client) => {
      const headerRes = await client.query(`
        SELECT i.id, i.tenant_id, i.quotation_id, i.customer_id, i.invoice_number,
               i.invoice_type, i.status, i.subtotal_amount, i.tax_amount, i.total_amount,
               i.due_date, i.issued_at, i.paid_at,
               c.company_name AS customer_name, c.email AS customer_email
        FROM invoices i
        JOIN customers c ON c.id = i.customer_id
        WHERE (i.id::text = $1 OR UPPER(i.invoice_number) = UPPER($1))
          AND i.customer_id = $2
      `, [id, customerId]);

      if (!headerRes.rows[0]) return null;
      const inv = headerRes.rows[0];

      const itemsRes = await client.query(`
        SELECT id, invoice_id, quotation_item_id, description, item_type,
               quantity, unit_price, line_total, is_prorated, proration_start, proration_end
        FROM invoice_items
        WHERE invoice_id = $1
        ORDER BY id ASC
      `, [inv.id]);

      let quotation = null;
      if (inv.quotation_id) {
        const qRes = await client.query(`
          SELECT id, quotation_code, status, total_amount, created_at
          FROM quotations
          WHERE id = $1 AND customer_id = $2
        `, [inv.quotation_id, customerId]);
        if (qRes.rows[0]) {
          quotation = {
            ...qRes.rows[0],
            items: itemsRes.rows,
            shipments: []
          };
        }
      }

      let relatedInvoices = [];
      if (inv.quotation_id) {
        const relRes = await client.query(`
          SELECT id, invoice_number, invoice_type, status, total_amount, due_date
          FROM invoices
          WHERE quotation_id = $1 AND customer_id = $2
          ORDER BY issued_at ASC
        `, [inv.quotation_id, customerId]);
        relatedInvoices = relRes.rows;
      }

      return {
        ...inv,
        items: itemsRes.rows,
        quotation,
        relatedInvoices
      };
    });

    if (!invoice) {
      const err = new Error('Invoice not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      invoice,
      quotation: invoice.quotation,
      relatedInvoices: invoice.relatedInvoices
    });
  } catch (err) {
    next(err);
  }
}

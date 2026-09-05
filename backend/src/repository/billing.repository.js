import {
  LIST_SUBSCRIPTION_PLANS,
  CREATE_SUBSCRIPTION_PLAN,
  LIST_SUBSCRIPTIONS_STAFF,
  GET_SUBSCRIPTION_BY_ID,
  CREATE_SUBSCRIPTION,
  UPDATE_SUBSCRIPTION_QUANTITY,
  CANCEL_SUBSCRIPTION,
  UPDATE_SUBSCRIPTION_STATUS,
  LIST_INVOICES,
  GET_INVOICE_DETAILS,
  GET_INVOICE_ITEMS,
  CREATE_INVOICE,
  CREATE_INVOICE_ITEM,
  RECORD_INVOICE_PAYMENT
} from '../queries/billing.query.js';
import { LIST_QUOTATION_ITEMS_STAFF, GET_QUOTATION_BY_ID_STAFF } from '../queries/quotation.query.js';
import {
  calculateMidCycleProration,
  calculateCancellationCredit
} from '../service/proration.service.js';

export async function getSubscriptionPlans(client) {
  const result = await client.query(LIST_SUBSCRIPTION_PLANS);
  return result.rows;
}

export async function createSubscriptionPlan(client, tenantId, data) {
  const result = await client.query(CREATE_SUBSCRIPTION_PLAN, [
    tenantId,
    data.name,
    data.cadence,
    data.billingIntervalDays,
    data.allowsProration
  ]);
  return result.rows[0];
}

export async function getSubscriptions(client) {
  const result = await client.query(LIST_SUBSCRIPTIONS_STAFF);
  return result.rows;
}

export async function getSubscriptionDetail(client, subscriptionId) {
  const result = await client.query(GET_SUBSCRIPTION_BY_ID, [subscriptionId]);
  const sub = result.rows[0] || null;
  if (!sub) return null;

  // Retrieve originating quotation lines for billing detail breakdown
  if (sub.quotation_id) {
    const itemsRes = await client.query(LIST_QUOTATION_ITEMS_STAFF, [sub.quotation_id]);
    const allItems = itemsRes.rows;
    sub.oneTimeLines = allItems.filter(i => ['hardware', 'service'].includes(i.line_type));
    sub.recurringLines = allItems.filter(i => i.line_type === 'subscription');
  } else {
    sub.oneTimeLines = [];
    sub.recurringLines = [];
  }

  return sub;
}

/**
 * Generates hybrid billing invoices and recurring subscriptions from confirmed quote lines
 */
export async function generateBillingFromQuotation(client, tenantId, quotationId) {
  const quoteRes = await client.query(GET_QUOTATION_BY_ID_STAFF, [quotationId]);
  const quote = quoteRes.rows[0];
  if (!quote) throw new Error(`Quotation '${quotationId}' not found.`);

  const itemsRes = await client.query(LIST_QUOTATION_ITEMS_STAFF, [quotationId]);
  const items = itemsRes.rows;

  const subscriptionLines = items.filter(i => i.line_type === 'subscription');
  const oneTimeLines = items.filter(i => ['hardware', 'service'].includes(i.line_type));

  const generatedInvoices = [];
  const generatedSubscriptions = [];

  // 1. One-time Invoice for Hardware and Services
  if (oneTimeLines.length > 0) {
    const subtotal = oneTimeLines.reduce((acc, cur) => acc + Number(cur.line_total), 0);
    const tax = Number((subtotal * 0.08).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    const invNum = 'INV-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const invRes = await client.query(CREATE_INVOICE, [
      tenantId,
      quotationId,
      quote.customer_id,
      invNum,
      'standard',
      'issued',
      subtotal,
      tax,
      total,
      dueDate
    ]);
    const invoice = invRes.rows[0];

    for (const line of oneTimeLines) {
      await client.query(CREATE_INVOICE_ITEM, [
        tenantId,
        invoice.id,
        line.id,
        `${line.product_name} (${line.line_type})`,
        line.line_type,
        line.quantity,
        line.calculated_unit_price,
        line.line_total,
        false,
        null,
        null
      ]);
    }
    generatedInvoices.push(invoice);
  }

  // 2. Recurring Subscriptions and Subscription Invoices
  if (subscriptionLines.length > 0) {
    // Get active subscription plan
    const plansRes = await client.query(LIST_SUBSCRIPTION_PLANS);
    const defaultPlan = plansRes.rows[0];
    if (!defaultPlan) {
      throw new Error('No active subscription plan configured for this tenant.');
    }

    for (const subLine of subscriptionLines) {
      const startDate = new Date().toISOString().split('T')[0];
      const nextBilling = new Date(Date.now() + defaultPlan.billing_interval_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create subscription contract record
      const subRes = await client.query(CREATE_SUBSCRIPTION, [
        tenantId,
        quotationId,
        subLine.id,
        quote.customer_id,
        defaultPlan.id,
        startDate,
        nextBilling,
        null, // end_date
        subLine.calculated_unit_price,
        subLine.quantity
      ]);
      const subscription = subRes.rows[0];
      generatedSubscriptions.push(subscription);

      // Create recurring invoice for first cycle
      const invNum = 'SUB-INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const lineTotal = Number(subLine.line_total);
      const tax = Number((lineTotal * 0.08).toFixed(2));
      const total = Number((lineTotal + tax).toFixed(2));

      const subInvRes = await client.query(CREATE_INVOICE, [
        tenantId,
        quotationId,
        quote.customer_id,
        invNum,
        'subscription_recurring',
        'issued',
        lineTotal,
        tax,
        total,
        startDate
      ]);
      const subInvoice = subInvRes.rows[0];

      await client.query(CREATE_INVOICE_ITEM, [
        tenantId,
        subInvoice.id,
        subLine.id,
        `${subLine.product_name} Subscription (${defaultPlan.cadence})`,
        'subscription',
        subLine.quantity,
        subLine.calculated_unit_price,
        lineTotal,
        false,
        startDate,
        nextBilling
      ]);

      generatedInvoices.push(subInvoice);
    }
  }

  return {
    invoices: generatedInvoices,
    subscriptions: generatedSubscriptions
  };
}

/**
 * Mid-Cycle Subscription Seat Adjustment with Pure Proration Math
 */
export async function adjustSubscriptionSeats(client, tenantId, subscriptionId, newQuantity) {
  const subRes = await client.query(GET_SUBSCRIPTION_BY_ID, [subscriptionId]);
  const sub = subRes.rows[0];
  if (!sub) throw new Error(`Subscription '${subscriptionId}' not found.`);

  const proration = calculateMidCycleProration({
    billingIntervalDays: sub.billing_interval_days,
    allowsProration: sub.allows_proration,
    currentQuantity: sub.quantity,
    newQuantity,
    unitRecurringPrice: sub.unit_recurring_price,
    cycleStartDate: sub.start_date,
    cycleEndDate: sub.next_billing_date
  });

  // Update subscription quantity
  await client.query(UPDATE_SUBSCRIPTION_QUANTITY, [subscriptionId, newQuantity]);

  // Generate adjustment invoice or credit note
  let adjustmentInvoice = null;
  if (proration.proratedAmount > 0) {
    const invType = proration.isCredit ? 'credit_note' : 'standard';
    const invNum = (proration.isCredit ? 'CN-' : 'ADJ-') + Math.random().toString(36).substring(2, 8).toUpperCase();
    const dueDate = new Date().toISOString().split('T')[0];

    const invRes = await client.query(CREATE_INVOICE, [
      tenantId,
      sub.quotation_id,
      sub.customer_id,
      invNum,
      invType,
      'issued',
      proration.proratedAmount,
      0.00,
      proration.proratedAmount,
      dueDate
    ]);
    adjustmentInvoice = invRes.rows[0];

    await client.query(CREATE_INVOICE_ITEM, [
      tenantId,
      adjustmentInvoice.id,
      sub.quotation_item_id,
      proration.description,
      'subscription',
      Math.abs(proration.quantityDelta),
      sub.unit_recurring_price,
      proration.proratedAmount,
      true,
      proration.prorationStart,
      proration.prorationEnd
    ]);
  }

  return {
    subscriptionId,
    previousQuantity: sub.quantity,
    newQuantity,
    proration,
    adjustmentInvoice
  };
}

/**
 * Cancel subscription with automatic partial refund / credit note calculation
 */
export async function cancelSubscriptionContract(client, tenantId, subscriptionId) {
  const subRes = await client.query(GET_SUBSCRIPTION_BY_ID, [subscriptionId]);
  const sub = subRes.rows[0];
  if (!sub) throw new Error(`Subscription '${subscriptionId}' not found.`);

  const credit = calculateCancellationCredit({
    billingIntervalDays: sub.billing_interval_days,
    allowsProration: sub.allows_proration,
    quantity: sub.quantity,
    unitRecurringPrice: sub.unit_recurring_price,
    cycleStartDate: sub.start_date,
    cycleEndDate: sub.next_billing_date
  });

  // Cancel subscription
  await client.query(CANCEL_SUBSCRIPTION, [subscriptionId]);

  let creditNote = null;
  if (credit.proratedAmount > 0) {
    const invNum = 'CN-CANCEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const invRes = await client.query(CREATE_INVOICE, [
      tenantId,
      sub.quotation_id,
      sub.customer_id,
      invNum,
      'credit_note',
      'issued',
      credit.proratedAmount,
      0.00,
      credit.proratedAmount,
      new Date().toISOString().split('T')[0]
    ]);
    creditNote = invRes.rows[0];

    await client.query(CREATE_INVOICE_ITEM, [
      tenantId,
      creditNote.id,
      sub.quotation_item_id,
      `Credit Note for Cancellation: ${sub.plan_name} (${credit.remainingDays} days unused)`,
      'subscription',
      sub.quantity,
      sub.unit_recurring_price,
      credit.proratedAmount,
      true,
      credit.prorationStart,
      credit.prorationEnd
    ]);
  }

  return {
    subscriptionId,
    status: 'canceled',
    credit,
    creditNote
  };
}

export async function getInvoices(client) {
  const result = await client.query(LIST_INVOICES);
  return result.rows;
}

export async function getInvoiceDetail(client, invoiceId) {
  const headerRes = await client.query(GET_INVOICE_DETAILS, [invoiceId]);
  if (!headerRes.rows[0]) return null;
  const invoice = headerRes.rows[0];

  const itemsRes = await client.query(GET_INVOICE_ITEMS, [invoice.id]);

  let quotation = null;
  if (invoice.quotation_id) {
    const qRes = await client.query(GET_QUOTATION_BY_ID_STAFF, [invoice.quotation_id]);
    const qItemsRes = await client.query(LIST_QUOTATION_ITEMS_STAFF, [invoice.quotation_id]);
    const shipmentsRes = await client.query(
      `SELECT s.id, s.shipment_code, s.status, s.shipping_cost, s.carrier, s.tracking_number, w.name as warehouse_name
       FROM shipment_orders s
       LEFT JOIN warehouses w ON w.id = s.warehouse_id
       WHERE s.quotation_id = $1`,
      [invoice.quotation_id]
    );
    if (qRes.rows[0]) {
      quotation = {
        ...qRes.rows[0],
        items: qItemsRes.rows,
        shipments: shipmentsRes.rows
      };
    }
  }

  let relatedInvoices = [];
  if (invoice.quotation_id) {
    const relRes = await client.query(
      `SELECT id, invoice_number, invoice_type, status, total_amount, due_date
       FROM invoices
       WHERE quotation_id = $1
       ORDER BY issued_at ASC`,
      [invoice.quotation_id]
    );
    relatedInvoices = relRes.rows;
  }

  return {
    ...invoice,
    items: itemsRes.rows,
    quotation,
    relatedInvoices
  };
}

export async function markInvoicePaid(client, invoiceId, paidAt) {
  const result = await client.query(
    `UPDATE invoices
     SET status = 'paid', paid_at = COALESCE($2, NOW())
     WHERE id::text = $1 OR UPPER(invoice_number) = UPPER($1)
     RETURNING *;`,
    [invoiceId, paidAt || null]
  );
  return result.rows[0] || null;
}

export async function updateSubscriptionStatus(client, subscriptionId, status) {
  const result = await client.query(UPDATE_SUBSCRIPTION_STATUS, [subscriptionId, status]);
  const sub = result.rows[0] || null;
  if (sub && sub.customer_id) {
    await client.query(
      `UPDATE customers SET membership_status = $1 WHERE id = $2;`,
      [status, sub.customer_id]
    ).catch(() => {});
  }
  return sub;
}

export async function updateCustomerTier(client, customerId, tier) {
  const result = await client.query(
    `UPDATE customers SET tier = $1 WHERE id = $2 RETURNING *;`,
    [tier, customerId]
  );
  return result.rows[0] || null;
}


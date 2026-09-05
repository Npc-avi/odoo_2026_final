import {
  INSERT_QUOTATION_REQUEST,
  INSERT_QUOTATION_REQUEST_ITEM,
  LIST_RFQS_FOR_CUSTOMER,
  LIST_RFQS_FOR_STAFF,
  GET_RFQ_DETAIL,
  GET_RFQ_ITEMS,
  CALL_CONVERT_RFQ_SP,
  DECLINE_RFQ
} from '../queries/rfq.query.js';

export async function createQuotationRequest(client, actor, data) {
  // 1. Insert header
  const headerRes = await client.query(INSERT_QUOTATION_REQUEST, [
    actor.tenantId,
    actor.customerId,
    actor.portalUserId,
    data.assignedRepId || null,
    data.requestedDeliveryDate || null,
    data.customerNotes || null
  ]);
  const request = headerRes.rows[0];

  // 2. Insert items
  const insertedItems = [];
  for (const item of data.items) {
    const itemRes = await client.query(INSERT_QUOTATION_REQUEST_ITEM, [
      actor.tenantId,
      request.id,
      item.productId,
      item.variantId || null,
      item.requestedQty,
      item.lineNotes || null
    ]);
    insertedItems.push(itemRes.rows[0]);
  }

  return { request, items: insertedItems };
}

export async function getRfqsForCustomer(client, customerId) {
  const result = await client.query(LIST_RFQS_FOR_CUSTOMER, [customerId]);
  return result.rows;
}

export async function getRfqsForStaff(client) {
  const result = await client.query(LIST_RFQS_FOR_STAFF);
  return result.rows;
}

export async function getRfqDetail(client, rfqId) {
  const headerRes = await client.query(GET_RFQ_DETAIL, [rfqId]);
  if (!headerRes.rows[0]) return null;

  const itemsRes = await client.query(GET_RFQ_ITEMS, [rfqId]);
  return {
    ...headerRes.rows[0],
    items: itemsRes.rows
  };
}

export async function convertRfqToQuotation(client, rfqId, repId) {
  // Call the stored procedure sp_convert_rfq_to_quotation
  // p_request_id, p_assigned_rep_id, INOUT p_new_quote_id
  const spResult = await client.query(CALL_CONVERT_RFQ_SP, [rfqId, repId, null]);
  
  let newQuoteId = null;
  if (spResult.rows && spResult.rows[0] && spResult.rows[0].p_new_quote_id) {
    newQuoteId = spResult.rows[0].p_new_quote_id;
  } else {
    // Lookup the quote created from this origin request
    const qLookup = await client.query(
      `SELECT id, quotation_code, status, total_amount FROM quotations WHERE origin_request_id = $1 LIMIT 1`,
      [rfqId]
    );
    if (qLookup.rows[0]) {
      newQuoteId = qLookup.rows[0].id;
    }
  }

  // Fetch created quotation details
  const quoteRes = await client.query(
    `SELECT q.id, q.quotation_code, q.status, q.total_amount, q.subtotal_amount, q.blended_risk_score, q.created_at
     FROM quotations q WHERE q.id = $1`,
    [newQuoteId]
  );

  return quoteRes.rows[0] || { id: newQuoteId };
}

export async function declineRfq(client, rfqId) {
  const result = await client.query(DECLINE_RFQ, [rfqId]);
  return result.rows[0] || null;
}

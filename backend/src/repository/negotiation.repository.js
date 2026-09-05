import {
  LIST_NEGOTIATIONS_FOR_QUOTE,
  INSERT_PORTAL_NEGOTIATION,
  INSERT_STAFF_NEGOTIATION,
  CALL_CONFIRM_QUOTATION_SP,
  GET_QUOTATION_STATUS_AND_CODE
} from '../queries/negotiation.query.js';

export async function getNegotiationsByQuote(client, quotationId) {
  const result = await client.query(LIST_NEGOTIATIONS_FOR_QUOTE, [quotationId]);
  return result.rows;
}

export async function addCustomerPortalNegotiation(client, actor, quotationId, data) {
  const result = await client.query(INSERT_PORTAL_NEGOTIATION, [
    actor.tenantId,
    quotationId,
    data.quotationItemId || null,
    actor.portalUserId,
    data.proposedDiscountPct !== undefined ? data.proposedDiscountPct : null,
    data.comments
  ]);

  // Update quotation status to 'under_negotiation' if currently 'sent'
  await client.query(
    `UPDATE quotations SET status = 'under_negotiation', last_activity_at = NOW() WHERE id = $1 AND status = 'sent'`,
    [quotationId]
  );

  return result.rows[0];
}

export async function addStaffNegotiation(client, actor, quotationId, data) {
  const result = await client.query(INSERT_STAFF_NEGOTIATION, [
    actor.tenantId,
    quotationId,
    data.quotationItemId || null,
    actor.userId,
    data.proposedDiscountPct !== undefined ? data.proposedDiscountPct : null,
    data.comments
  ]);

  await client.query(
    `UPDATE quotations SET last_activity_at = NOW() WHERE id = $1`,
    [quotationId]
  );

  return result.rows[0];
}

export async function customerConfirmQuotation(client, quotationId) {
  // Call stored procedure sp_customer_confirm_quotation
  await client.query(CALL_CONFIRM_QUOTATION_SP, [quotationId]);

  // Re-fetch resulting status
  const res = await client.query(GET_QUOTATION_STATUS_AND_CODE, [quotationId]);
  const quote = res.rows[0];

  const wasDowngraded = ['pending_manager', 'pending_finance'].includes(quote.status);

  return {
    quotationId,
    quotationCode: quote.quotation_code,
    status: quote.status,
    blendedRiskScore: quote.blended_risk_score,
    wasDowngraded,
    message: wasDowngraded
      ? 'Your confirmation requires an additional approval step due to customized discount terms.'
      : 'Quotation confirmed successfully! Proceeding directly to fulfillment.'
  };
}

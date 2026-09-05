import {
  LIST_QUOTATIONS_STAFF,
  GET_QUOTATION_BY_ID_STAFF,
  GET_QUOTATION_SUMMARY,
  CREATE_QUOTATION,
  LIST_QUOTATION_ITEMS_STAFF,
  INSERT_QUOTATION_ITEM,
  UPDATE_QUOTATION_ITEM,
  DELETE_QUOTATION_ITEM,
  GET_UPSELL_SUGGESTIONS,
  GET_PORTAL_QUOTATION,
  LIST_PORTAL_QUOTATIONS,
  LIST_CUSTOMERS_STAFF,
  SEND_QUOTATION_TO_CUSTOMER,
  SUBMIT_QUOTATION_FOR_APPROVAL
} from '../queries/quotation.query.js';

export async function getQuotationsStaff(client) {
  const result = await client.query(LIST_QUOTATIONS_STAFF);
  return result.rows;
}

export async function getQuotationDetailStaff(client, quotationId) {
  const headerRes = await client.query(GET_QUOTATION_BY_ID_STAFF, [quotationId]);
  if (!headerRes.rows[0]) return null;

  const itemsRes = await client.query(LIST_QUOTATION_ITEMS_STAFF, [quotationId]);
  const suggestionsRes = await client.query(GET_UPSELL_SUGGESTIONS, [quotationId]);

  return {
    ...headerRes.rows[0],
    items: itemsRes.rows,
    upsellSuggestions: suggestionsRes.rows
  };
}

export async function createQuotationDraft(client, tenantId, repId, data) {
  const quoteCode = 'QT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const initialStatus = data.status || 'draft';
  const result = await client.query(CREATE_QUOTATION, [
    tenantId,
    quoteCode,
    data.customerId,
    repId,
    data.promisedDeliveryDate || null,
    initialStatus
  ]);
  return result.rows[0];
}

export async function submitQuotationForApprovalStaff(client, quotationId) {
  const result = await client.query(SUBMIT_QUOTATION_FOR_APPROVAL, [quotationId]);
  return result.rows[0];
}

export async function addQuotationItem(client, tenantId, quotationId, itemData) {
  // 1. Insert item (trigger trg_calculate_quotation_item and trg_sync_quotation_totals fire)
  const itemRes = await client.query(INSERT_QUOTATION_ITEM, [
    tenantId,
    quotationId,
    itemData.productId,
    itemData.variantId || null,
    itemData.lineType,
    itemData.quantity,
    itemData.appliedDiscountPct || 0.00,
    itemData.lineNotes || null
  ]);
  const createdItem = itemRes.rows[0];

  // 2. Re-select updated parent quotation totals, margin, risk score, and status
  const summaryRes = await client.query(GET_QUOTATION_SUMMARY, [quotationId]);
  const updatedQuotation = summaryRes.rows[0];

  return { item: createdItem, quotationSummary: updatedQuotation };
}

export async function updateQuotationItem(client, itemId, updateData) {
  // 1. Update item (trigger automatically recalculates item and synchronizes quotation totals)
  const itemRes = await client.query(UPDATE_QUOTATION_ITEM, [
    itemId,
    updateData.quantity,
    updateData.appliedDiscountPct,
    updateData.variantId,
    updateData.lineNotes
  ]);
  const updatedItem = itemRes.rows[0];
  if (!updatedItem) return null;

  // 2. Re-select updated parent quotation state
  const summaryRes = await client.query(GET_QUOTATION_SUMMARY, [updatedItem.quotation_id]);
  const updatedQuotation = summaryRes.rows[0];

  return { item: updatedItem, quotationSummary: updatedQuotation };
}

export async function deleteQuotationItem(client, itemId) {
  const deleteRes = await client.query(DELETE_QUOTATION_ITEM, [itemId]);
  const deletedItem = deleteRes.rows[0];
  if (!deletedItem) return null;

  // Re-select updated parent quotation state
  const summaryRes = await client.query(GET_QUOTATION_SUMMARY, [deletedItem.quotation_id]);
  const updatedQuotation = summaryRes.rows[0];

  return { deletedItemId: itemId, quotationSummary: updatedQuotation };
}

export async function getUpsellRecommendations(client, quotationId) {
  const result = await client.query(GET_UPSELL_SUGGESTIONS, [quotationId]);
  return result.rows;
}

export async function getPortalQuotationDetail(client, quotationId) {
  const result = await client.query(GET_PORTAL_QUOTATION, [quotationId]);
  if (result.rows.length === 0) return null;

  const first = result.rows[0];
  const items = first.item_id
    ? result.rows.map(r => ({
        itemId: r.item_id,
        productId: r.product_id,
        productName: r.product_name,
        productDescription: r.product_description,
        quantity: r.quantity,
        unitListPrice: r.unit_list_price,
        appliedDiscountPct: r.applied_discount_pct,
        calculatedUnitPrice: r.calculated_unit_price,
        lineTotal: r.line_total
      }))
    : [];

  return {
    quotationId: first.quotation_id,
    quotationCode: first.quotation_code,
    status: first.status,
    subtotalAmount: first.subtotal_amount,
    totalAmount: first.total_amount,
    promisedDeliveryDate: first.promised_delivery_date,
    createdAt: first.created_at,
    items
  };
}

export async function getPortalQuotationsList(client) {
  const result = await client.query(LIST_PORTAL_QUOTATIONS);
  return result.rows;
}

export async function getCustomersStaff(client) {
  const result = await client.query(LIST_CUSTOMERS_STAFF);
  return result.rows;
}

export async function sendQuotationStaff(client, quotationId) {
  const result = await client.query(SEND_QUOTATION_TO_CUSTOMER, [quotationId]);
  return result.rows[0];
}

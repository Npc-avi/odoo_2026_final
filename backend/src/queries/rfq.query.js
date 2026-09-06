/**
 * SQL Queries for Quotation Requests (RFQ)
 */

export const INSERT_QUOTATION_REQUEST = `
  INSERT INTO quotation_requests (
    tenant_id, customer_id, portal_user_id, assigned_rep_id,
    status, requested_delivery_date, customer_notes
  )
  VALUES ($1, $2, $3, $4, 'pending', $5, $6)
  RETURNING id, tenant_id, customer_id, portal_user_id, assigned_rep_id, status, requested_delivery_date, customer_notes, created_at;
`;

export const INSERT_QUOTATION_REQUEST_ITEM = `
  INSERT INTO quotation_request_items (
    tenant_id, request_id, product_id, variant_id, requested_qty, line_notes
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, request_id, product_id, variant_id, requested_qty, line_notes;
`;

export const LIST_RFQS_FOR_CUSTOMER = `
  SELECT qr.id, qr.tenant_id, qr.customer_id, qr.status, qr.requested_delivery_date,
         qr.customer_notes, qr.created_at, qr.updated_at,
         COUNT(qri.id) AS item_count
  FROM quotation_requests qr
  LEFT JOIN quotation_request_items qri ON qri.request_id = qr.id
  WHERE qr.customer_id = $1
  GROUP BY qr.id
  ORDER BY qr.created_at DESC;
`;

export const LIST_RFQS_FOR_STAFF = `
  SELECT qr.id, qr.tenant_id, qr.customer_id, qr.portal_user_id, qr.assigned_rep_id,
         qr.status, qr.requested_delivery_date, qr.customer_notes, qr.created_at, qr.updated_at,
         c.company_name AS customer_company_name, c.tier AS customer_tier,
         u.full_name AS assigned_rep_name,
         (
           SELECT COUNT(DISTINCT sub_qri.id)
           FROM quotation_request_items sub_qri
           WHERE sub_qri.request_id = qr.id
         ) AS item_count,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', sub_qri.id,
                 'productId', sub_qri.product_id,
                 'requestedQty', sub_qri.requested_qty,
                 'lineNotes', sub_qri.line_notes,
                 'productName', sub_p.name,
                 'basePrice', sub_p.base_price,
                 'itemType', sub_p.item_type
               )
             )
             FROM quotation_request_items sub_qri
             JOIN products sub_p ON sub_p.id = sub_qri.product_id
             WHERE sub_qri.request_id = qr.id
           ),
           '[]'::json
         ) AS items,
         (
           SELECT id FROM quotations WHERE origin_request_id = qr.id AND status != 'rejected'::quote_status LIMIT 1
         ) AS existing_quote_id
  FROM quotation_requests qr
  JOIN customers c ON c.id = qr.customer_id
  LEFT JOIN users u ON u.id = qr.assigned_rep_id
  WHERE qr.status = 'pending'
  ORDER BY qr.created_at DESC;
`;

export const GET_RFQ_DETAIL = `
  SELECT qr.id, qr.tenant_id, qr.customer_id, qr.portal_user_id, qr.assigned_rep_id,
         qr.status, qr.requested_delivery_date, qr.customer_notes, qr.created_at, qr.updated_at,
         c.company_name AS customer_company_name, c.contact_name AS customer_contact_name,
         c.email AS customer_email, c.tier AS customer_tier,
         u.full_name AS assigned_rep_name,
         (
           SELECT id FROM quotations WHERE origin_request_id = qr.id AND status != 'rejected'::quote_status LIMIT 1
         ) AS existing_quote_id
  FROM quotation_requests qr
  JOIN customers c ON c.id = qr.customer_id
  LEFT JOIN users u ON u.id = qr.assigned_rep_id
  WHERE qr.id = $1;
`;

export const GET_RFQ_ITEMS = `
  SELECT qri.id, qri.request_id, qri.product_id, qri.variant_id, qri.requested_qty, qri.line_notes,
         p.name AS product_name, p.sku AS product_sku, p.base_price, p.item_type
  FROM quotation_request_items qri
  JOIN products p ON p.id = qri.product_id
  WHERE qri.request_id = $1;
`;

export const CALL_CONVERT_RFQ_SP = `
  CALL sp_convert_rfq_to_quotation($1, $2, $3);
`;

export const DECLINE_RFQ = `
  UPDATE quotation_requests
  SET status = 'declined', updated_at = NOW()
  WHERE id = $1
  RETURNING id, status, updated_at;
`;

/**
 * SQL Queries for Quotation Negotiation and Customer Confirmation
 */

export const LIST_NEGOTIATIONS_FOR_QUOTE = `
  SELECT qn.id, qn.quotation_id, qn.quotation_item_id, qn.proposed_discount_pct,
         qn.comments, qn.triggers_approval_reset, qn.created_at,
         qn.author_portal_user_id, qn.author_staff_user_id,
         cpu.email AS portal_author_email, c.contact_name AS portal_author_name,
         u.full_name AS staff_author_name, u.role AS staff_author_role,
         qi.product_id, p.name AS product_name
  FROM quotation_negotiations qn
  LEFT JOIN customer_portal_users cpu ON cpu.id = qn.author_portal_user_id
  LEFT JOIN customers c ON c.id = cpu.customer_id
  LEFT JOIN users u ON u.id = qn.author_staff_user_id
  LEFT JOIN quotation_items qi ON qi.id = qn.quotation_item_id
  LEFT JOIN products p ON p.id = qi.product_id
  WHERE qn.quotation_id = $1
  ORDER BY qn.created_at ASC;
`;

export const INSERT_PORTAL_NEGOTIATION = `
  INSERT INTO quotation_negotiations (
    tenant_id, quotation_id, quotation_item_id, author_portal_user_id,
    proposed_discount_pct, comments
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;

export const INSERT_STAFF_NEGOTIATION = `
  INSERT INTO quotation_negotiations (
    tenant_id, quotation_id, quotation_item_id, author_staff_user_id,
    proposed_discount_pct, comments
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;

export const CALL_CONFIRM_QUOTATION_SP = `
  CALL sp_customer_confirm_quotation($1);
`;

export const GET_QUOTATION_STATUS_AND_CODE = `
  SELECT id, quotation_code, status, blended_risk_score, total_amount, updated_at
  FROM quotations
  WHERE id = $1;
`;

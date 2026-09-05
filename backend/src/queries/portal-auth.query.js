/**
 * SQL Queries for Customer Portal Authentication
 */

export const FIND_PORTAL_USER_BY_EMAIL = `
  SELECT cpu.id, cpu.tenant_id, cpu.customer_id, cpu.email, cpu.password_hash, cpu.is_active,
         c.company_name, c.contact_name, c.tier AS customer_tier,
         t.name AS tenant_name, t.subdomain AS tenant_subdomain, t.is_active AS tenant_is_active
  FROM customer_portal_users cpu
  JOIN customers c ON c.id = cpu.customer_id
  JOIN tenants t ON t.id = cpu.tenant_id
  WHERE LOWER(cpu.email) = LOWER($1)
  LIMIT 1;
`;

export const SET_MAGIC_LINK_TOKEN = `
  UPDATE customer_portal_users
  SET magic_link_token = $1,
      magic_link_expires_at = $2
  WHERE id = $3
  RETURNING id, email, customer_id, tenant_id;
`;

export const FIND_PORTAL_USER_BY_MAGIC_LINK = `
  SELECT cpu.id, cpu.tenant_id, cpu.customer_id, cpu.email, cpu.magic_link_expires_at, cpu.is_active,
         c.company_name, c.contact_name, c.tier AS customer_tier,
         t.name AS tenant_name
  FROM customer_portal_users cpu
  JOIN customers c ON c.id = cpu.customer_id
  JOIN tenants t ON t.id = cpu.tenant_id
  WHERE cpu.magic_link_token = $1
  LIMIT 1;
`;

export const CLEAR_MAGIC_LINK_TOKEN = `
  UPDATE customer_portal_users
  SET magic_link_token = NULL,
      magic_link_expires_at = NULL
  WHERE id = $1;
`;

export const GET_PORTAL_USER_PROFILE = `
  SELECT cpu.id, cpu.tenant_id, cpu.customer_id, cpu.email, cpu.created_at,
         c.company_name, c.contact_name, c.tier AS customer_tier,
         t.name AS tenant_name, t.subdomain AS tenant_subdomain
  FROM customer_portal_users cpu
  JOIN customers c ON c.id = cpu.customer_id
  JOIN tenants t ON t.id = cpu.tenant_id
  WHERE cpu.id = $1 AND cpu.tenant_id = $2;
`;

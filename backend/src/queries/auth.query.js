/**
 * SQL Queries for Internal Staff Authentication and Profile
 */

export const FIND_STAFF_USER_BY_EMAIL = `
  SELECT u.id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role, u.historical_discount_avg, u.is_active,
         t.name AS tenant_name, t.subdomain AS tenant_subdomain, t.is_active AS tenant_is_active
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  WHERE LOWER(u.email) = LOWER($1)
  LIMIT 1;
`;

export const FIND_STAFF_USER_BY_ID = `
  SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, u.historical_discount_avg, u.is_active, u.created_at,
         t.name AS tenant_name, t.subdomain AS tenant_subdomain
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  WHERE u.id = $1 AND u.tenant_id = $2;
`;

export const CREATE_STAFF_USER = `
  INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active)
  VALUES ($1, LOWER($2), $3, $4, $5, TRUE)
  RETURNING id, tenant_id, email, full_name, role, is_active, created_at;
`;

export const FIND_TENANT_BY_ID = `
  SELECT id, name, subdomain, default_currency, is_active
  FROM tenants
  WHERE id = $1;
`;

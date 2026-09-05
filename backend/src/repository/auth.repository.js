import {
  FIND_STAFF_USER_BY_EMAIL,
  FIND_STAFF_USER_BY_ID,
  CREATE_STAFF_USER,
  FIND_TENANT_BY_ID
} from '../queries/auth.query.js';

export async function findStaffUserByEmail(client, email) {
  const result = await client.query(FIND_STAFF_USER_BY_EMAIL, [email]);
  return result.rows[0] || null;
}

export async function findStaffUserById(client, userId, tenantId) {
  const result = await client.query(FIND_STAFF_USER_BY_ID, [userId, tenantId]);
  return result.rows[0] || null;
}

export async function createStaffUser(client, { tenantId, email, passwordHash, fullName, role }) {
  const result = await client.query(CREATE_STAFF_USER, [tenantId, email, passwordHash, fullName, role]);
  return result.rows[0];
}

export async function findTenantById(client, tenantId) {
  const result = await client.query(FIND_TENANT_BY_ID, [tenantId]);
  return result.rows[0] || null;
}

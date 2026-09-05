import {
  FIND_PORTAL_USER_BY_EMAIL,
  SET_MAGIC_LINK_TOKEN,
  FIND_PORTAL_USER_BY_MAGIC_LINK,
  CLEAR_MAGIC_LINK_TOKEN,
  GET_PORTAL_USER_PROFILE
} from '../queries/portal-auth.query.js';

export async function findPortalUserByEmail(client, email) {
  const result = await client.query(FIND_PORTAL_USER_BY_EMAIL, [email]);
  return result.rows[0] || null;
}

export async function setPortalMagicLinkToken(client, portalUserId, token, expiresAt) {
  const result = await client.query(SET_MAGIC_LINK_TOKEN, [token, expiresAt, portalUserId]);
  return result.rows[0] || null;
}

export async function findPortalUserByMagicLink(client, token) {
  const result = await client.query(FIND_PORTAL_USER_BY_MAGIC_LINK, [token]);
  return result.rows[0] || null;
}

export async function clearPortalMagicLink(client, portalUserId) {
  await client.query(CLEAR_MAGIC_LINK_TOKEN, [portalUserId]);
}

export async function getPortalUserProfile(client, portalUserId, tenantId) {
  const result = await client.query(GET_PORTAL_USER_PROFILE, [portalUserId, tenantId]);
  return result.rows[0] || null;
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360_default_jwt_secret_dev_key';
const STAFF_EXPIRES_IN = process.env.STAFF_JWT_EXPIRES_IN || '7d';
const PORTAL_EXPIRES_IN = process.env.PORTAL_JWT_EXPIRES_IN || '24h';

/**
 * Signs a JWT for internal staff members.
 * Payload shape: { actorType: 'staff', userId, tenantId, role }
 */
export function signStaffToken(payload) {
  return jwt.sign(
    {
      actorType: 'staff',
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role
    },
    JWT_SECRET,
    { expiresIn: STAFF_EXPIRES_IN }
  );
}

/**
 * Signs a JWT for external customer portal users.
 * Payload shape: { actorType: 'customer_portal', portalUserId, customerId, tenantId }
 */
export function signPortalToken(payload) {
  return jwt.sign(
    {
      actorType: 'customer_portal',
      portalUserId: payload.portalUserId,
      customerId: payload.customerId,
      tenantId: payload.tenantId
    },
    JWT_SECRET,
    { expiresIn: PORTAL_EXPIRES_IN }
  );
}

/**
 * Verifies a JWT token with the application secret.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

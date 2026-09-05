import { verifyToken } from '../utils/token.util.js';
import { COOKIE_NAMES } from '../utils/cookie.util.js';

/**
 * Extracts auth token from cookie or Authorization header (Bearer token fallback)
 */
function extractToken(req, cookieName) {
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

/**
 * Middleware: Verifies Internal Staff JWT.
 * Sets req.actor = { actorType: 'staff', userId, tenantId, role }
 */
export function verifyStaffToken(req, res, next) {
  try {
    const token = extractToken(req, COOKIE_NAMES.STAFF);
    if (!token) {
      const err = new Error('Authentication required: Missing staff session.');
      err.status = 401;
      return next(err);
    }

    const payload = verifyToken(token);
    if (payload.actorType !== 'staff') {
      const err = new Error('Invalid actor credentials: Staff token required.');
      err.status = 403;
      return next(err);
    }

    req.actor = payload;
    next();
  } catch (err) {
    const error = new Error('Invalid or expired staff session.');
    error.status = 401;
    next(error);
  }
}

/**
 * Middleware: Verifies Customer Portal JWT.
 * Sets req.actor = { actorType: 'customer_portal', portalUserId, customerId, tenantId }
 */
export function verifyPortalToken(req, res, next) {
  try {
    const token = extractToken(req, COOKIE_NAMES.PORTAL);
    if (!token) {
      const err = new Error('Authentication required: Missing customer portal session.');
      err.status = 401;
      return next(err);
    }

    const payload = verifyToken(token);
    if (payload.actorType !== 'customer_portal') {
      const err = new Error('Invalid actor credentials: Customer portal token required.');
      err.status = 403;
      return next(err);
    }

    req.actor = payload;
    next();
  } catch (err) {
    const error = new Error('Invalid or expired customer portal session.');
    error.status = 401;
    next(error);
  }
}

/**
 * Role-Based Access Control Middleware for Staff
 * 
 * @param  {...string} allowedRoles - e.g. 'admin', 'sales_manager', 'finance', 'sales_rep'
 */
export function requireStaffRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.actor || req.actor.actorType !== 'staff') {
      const err = new Error('Unauthorized: Staff access required.');
      err.status = 403;
      return next(err);
    }

    if (!allowedRoles.includes(req.actor.role)) {
      const err = new Error(`Forbidden: Role '${req.actor.role}' is not authorized for this operation.`);
      err.status = 403;
      return next(err);
    }

    next();
  };
}

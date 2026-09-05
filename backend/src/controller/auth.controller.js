import argon2 from 'argon2';
import { withTenantContext, withSystemContext } from '../middleware/tenant-context.middleware.js';
import {
  findStaffUserByEmail,
  findStaffUserById,
  createStaffUser,
  findTenantById
} from '../repository/auth.repository.js';
import { signStaffToken } from '../utils/token.util.js';
import { setStaffCookie, clearStaffCookie } from '../utils/cookie.util.js';

/**
 * Register internal staff member (admin/manager/rep/finance)
 */
export async function registerStaff(req, res, next) {
  try {
    const { tenantId, email, password, fullName, role } = req.body;

    const result = await withSystemContext(async (client) => {
      // 1. Verify tenant exists and is active
      const tenant = await findTenantById(client, tenantId);
      if (!tenant) {
        const err = new Error(`Tenant '${tenantId}' does not exist.`);
        err.status = 404;
        throw err;
      }
      if (!tenant.is_active) {
        const err = new Error(`Tenant is deactivated.`);
        err.status = 403;
        throw err;
      }

      // 2. Hash password with argon2
      const passwordHash = await argon2.hash(password);

      // 3. Create user record
      const newUser = await createStaffUser(client, {
        tenantId,
        email,
        passwordHash,
        fullName,
        role
      });

      return { user: newUser, tenant };
    });

    // 4. Issue JWT and Set Cookie
    const token = signStaffToken({
      userId: result.user.id,
      tenantId: result.user.tenant_id,
      role: result.user.role
    });

    setStaffCookie(res, token);

    return res.status(201).json({
      message: 'Staff user registered successfully.',
      token,
      user: {
        id: result.user.id,
        tenantId: result.user.tenant_id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: result.user.role,
        tenantName: result.tenant.name
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Authenticate internal staff member via email and password
 */
export async function loginStaff(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await withSystemContext(async (client) => {
      return findStaffUserByEmail(client, email);
    });

    if (!user) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      return next(err);
    }

    if (!user.is_active) {
      const err = new Error('Your staff account is currently inactive.');
      err.status = 403;
      return next(err);
    }

    if (!user.tenant_is_active) {
      const err = new Error('Your organization tenant is currently suspended.');
      err.status = 403;
      return next(err);
    }

    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      return next(err);
    }

    // Sign staff JWT
    const token = signStaffToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    });

    setStaffCookie(res, token);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        historicalDiscountAvg: user.historical_discount_avg,
        tenantName: user.tenant_name,
        tenantSubdomain: user.tenant_subdomain
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Re-fetch currently authenticated staff profile from database inside tenant context
 */
export async function getStaffMe(req, res, next) {
  try {
    const profile = await withTenantContext(req.actor, async (client) => {
      return findStaffUserById(client, req.actor.userId, req.actor.tenantId);
    });

    if (!profile) {
      const err = new Error('Staff user not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      user: {
        id: profile.id,
        tenantId: profile.tenant_id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        historicalDiscountAvg: profile.historical_discount_avg,
        isActive: profile.is_active,
        tenantName: profile.tenant_name,
        tenantSubdomain: profile.tenant_subdomain
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear staff session cookie
 */
export function logoutStaff(req, res) {
  clearStaffCookie(res);
  return res.status(200).json({ message: 'Logged out successfully.' });
}

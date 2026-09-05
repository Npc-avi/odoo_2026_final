import argon2 from 'argon2';
import { withTenantContext, withSystemContext } from '../middleware/tenant-context.middleware.js';
import {
  findPortalUserByEmail,
  setPortalMagicLinkToken,
  findPortalUserByMagicLink,
  clearPortalMagicLink,
  getPortalUserProfile
} from '../repository/portal-auth.repository.js';
import { signPortalToken } from '../utils/token.util.js';
import { setPortalCookie, clearPortalCookie } from '../utils/cookie.util.js';
import { generateMagicLinkToken, getMagicLinkExpiry } from '../utils/magic-link.util.js';
import { sendMagicLinkEmail } from '../service/email.service.js';

const FRONTEND_PORTAL_URL = process.env.FRONTEND_PORTAL_URL || 'http://localhost:3001';

/**
 * Customer Portal Login via Email & Password
 */
export async function loginPortal(req, res, next) {
  try {
    const { email, password } = req.body;

    const portalUser = await withSystemContext(async (client) => {
      return findPortalUserByEmail(client, email);
    });

    if (!portalUser) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      return next(err);
    }

    if (!portalUser.is_active) {
      const err = new Error('Your customer portal account is inactive. Please contact support.');
      err.status = 403;
      return next(err);
    }

    if (!portalUser.password_hash) {
      const err = new Error('This account uses passwordless magic-link sign-in. Please request a login link.');
      err.status = 400;
      return next(err);
    }

    const isValid = await argon2.verify(portalUser.password_hash, password);
    if (!isValid) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      return next(err);
    }

    // Sign customer portal JWT
    const token = signPortalToken({
      portalUserId: portalUser.id,
      customerId: portalUser.customer_id,
      tenantId: portalUser.tenant_id
    });

    setPortalCookie(res, token);

    return res.status(200).json({
      message: 'Customer portal login successful.',
      token,
      portalUser: {
        id: portalUser.id,
        email: portalUser.email,
        customerId: portalUser.customer_id,
        companyName: portalUser.company_name,
        contactName: portalUser.contact_name,
        customerTier: portalUser.customer_tier,
        tenantId: portalUser.tenant_id,
        tenantName: portalUser.tenant_name
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Request Passwordless Magic Link
 */
export async function requestMagicLink(req, res, next) {
  try {
    const { email } = req.body;

    const portalUser = await withSystemContext(async (client) => {
      return findPortalUserByEmail(client, email);
    });

    // Always respond with success message to prevent user enumeration
    if (!portalUser || !portalUser.is_active) {
      return res.status(200).json({
        message: 'If an active customer portal account exists for this email, a sign-in link has been sent.'
      });
    }

    const token = generateMagicLinkToken();
    const expiresAt = getMagicLinkExpiry(30);

    await withSystemContext(async (client) => {
      await setPortalMagicLinkToken(client, portalUser.id, token, expiresAt);
    });

    const magicLink = `${FRONTEND_PORTAL_URL}/portal/verify?token=${token}`;

    // Send asynchronously without blocking response
    sendMagicLinkEmail({
      toEmail: portalUser.email,
      magicLink,
      customerCompanyName: portalUser.company_name
    });

    return res.status(200).json({
      message: 'If an active customer portal account exists for this email, a sign-in link has been sent.',
      // Provide dev link in development mode for easy testing
      ...(process.env.NODE_ENV !== 'production' && { devMagicLink: magicLink })
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Magic Link Token and Issue Customer Portal Session
 */
export async function verifyMagicLink(req, res, next) {
  try {
    const { token } = req.query;

    const portalUser = await withSystemContext(async (client) => {
      const user = await findPortalUserByMagicLink(client, token);
      if (!user) return null;

      // Invalidate token (single use)
      await clearPortalMagicLink(client, user.id);
      return user;
    });

    if (!portalUser) {
      const err = new Error('Invalid or already-used magic link.');
      err.status = 401;
      return next(err);
    }

    if (new Date() > new Date(portalUser.magic_link_expires_at)) {
      const err = new Error('Magic link has expired. Please request a new one.');
      err.status = 401;
      return next(err);
    }

    if (!portalUser.is_active) {
      const err = new Error('Customer portal account is inactive.');
      err.status = 403;
      return next(err);
    }

    const jwtToken = signPortalToken({
      portalUserId: portalUser.id,
      customerId: portalUser.customer_id,
      tenantId: portalUser.tenant_id
    });

    setPortalCookie(res, jwtToken);

    return res.status(200).json({
      message: 'Portal session verified successfully.',
      token: jwtToken,
      portalUser: {
        id: portalUser.id,
        email: portalUser.email,
        customerId: portalUser.customer_id,
        companyName: portalUser.company_name,
        contactName: portalUser.contact_name,
        customerTier: portalUser.customer_tier,
        tenantId: portalUser.tenant_id,
        tenantName: portalUser.tenant_name
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Re-fetch customer portal user profile inside tenant context
 */
export async function getPortalMe(req, res, next) {
  try {
    const profile = await withTenantContext(req.actor, async (client) => {
      return getPortalUserProfile(client, req.actor.portalUserId, req.actor.tenantId);
    });

    if (!profile) {
      const err = new Error('Portal user not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      portalUser: {
        id: profile.id,
        email: profile.email,
        customerId: profile.customer_id,
        companyName: profile.company_name,
        contactName: profile.contact_name,
        customerTier: profile.customer_tier,
        tenantId: profile.tenant_id,
        tenantName: profile.tenant_name,
        tenantSubdomain: profile.tenant_subdomain
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout from Customer Portal
 */
export function logoutPortal(req, res) {
  clearPortalCookie(res);
  return res.status(200).json({ message: 'Customer portal logged out successfully.' });
}

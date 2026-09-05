const isProduction = process.env.NODE_ENV === 'production';

export const COOKIE_NAMES = {
  STAFF: 'staff_token',
  PORTAL: 'portal_token'
};

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
};

export const STAFF_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const PORTAL_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Attaches the staff auth token as an httpOnly cookie
 */
export function setStaffCookie(res, token) {
  res.cookie(COOKIE_NAMES.STAFF, token, STAFF_COOKIE_OPTIONS);
}

/**
 * Attaches the customer portal auth token as an httpOnly cookie
 */
export function setPortalCookie(res, token) {
  res.cookie(COOKIE_NAMES.PORTAL, token, PORTAL_COOKIE_OPTIONS);
}

/**
 * Clears the staff auth cookie
 */
export function clearStaffCookie(res) {
  res.clearCookie(COOKIE_NAMES.STAFF, { ...BASE_COOKIE_OPTIONS, maxAge: 0 });
}

/**
 * Clears the customer portal auth cookie
 */
export function clearPortalCookie(res) {
  res.clearCookie(COOKIE_NAMES.PORTAL, { ...BASE_COOKIE_OPTIONS, maxAge: 0 });
}

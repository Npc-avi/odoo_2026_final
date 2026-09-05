import crypto from 'crypto';

/**
 * Generates a high-entropy random token for magic link authentication
 */
export function generateMagicLinkToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes magic link expiration time (default: 30 minutes from now)
 */
export function getMagicLinkExpiry(minutes = 30) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

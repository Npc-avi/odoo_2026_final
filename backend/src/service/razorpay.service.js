import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayInstance = null;

export function getRazorpayClient() {
  const currentKeyId = process.env.RAZORPAY_KEY_ID || keyId;
  const currentKeySecret = process.env.RAZORPAY_KEY_SECRET || keySecret;

  if (!currentKeyId || !currentKeySecret) {
    console.warn('[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set in environment variables.');
  }

  if (!razorpayInstance && currentKeyId && currentKeySecret) {
    razorpayInstance = new Razorpay({
      key_id: currentKeyId,
      key_secret: currentKeySecret,
    });
  }

  return {
    instance: razorpayInstance,
    keyId: currentKeyId,
    keySecret: currentKeySecret,
  };
}

/**
 * Creates a Razorpay Order
 * @param {Object} params
 * @param {number} params.amount - Amount in smallest currency unit (e.g., cents for USD, paise for INR)
 * @param {string} params.currency - Any currency code e.g. USD, INR, EUR
 * @param {string} params.receipt - Short receipt identifier
 * @param {Object} params.notes - Metadata dictionary
 */
export async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const { instance, keyId, keySecret } = getRazorpayClient();

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your backend .env file.'
    );
  }

  const client = instance || new Razorpay({ key_id: keyId, key_secret: keySecret });

  const orderOptions = {
    amount: Math.round(Number(amount)), // smallest unit (e.g. cents/paise)
    currency: (currency || 'INR').toUpperCase(),
    receipt: (receipt || `rcpt_${Date.now()}`).slice(0, 40),
    notes: {
      ...notes,
      platform: 'DealFlow 360',
    },
  };

  const order = await client.orders.create(orderOptions);
  return {
    order,
    keyId,
  };
}

/**
 * Verifies Razorpay payment signature
 * @param {Object} params
 * @param {string} params.orderId - Razorpay order_id
 * @param {string} params.paymentId - Razorpay payment_id
 * @param {string} params.signature - Razorpay signature
 */
export function verifySignature({ orderId, paymentId, signature }) {
  const { keySecret } = getRazorpayClient();

  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured on the server.');
  }

  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${orderId}|${paymentId}`);
  const generatedSignature = hmac.digest('hex');

  return generatedSignature === signature;
}

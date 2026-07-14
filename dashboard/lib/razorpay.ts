import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
export const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function verifyCheckoutSignature(paymentId: string, entityId: string, signature: string): boolean {
  const payload = `${paymentId}|${entityId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const PLAN_LIMITS: Record<string, { leads: number; price: number; seats: number }> = {
  FREE: { leads: 25, price: 0, seats: 1 },
  PRO: { leads: 2000, price: 700, seats: 2 },
  BUSINESS: { leads: 15000, price: 2499, seats: 5 },
};

import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyCheckoutSignature, PLAN_LIMITS } from '../../../../lib/razorpay';

export async function POST(request: Request) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = rawBody;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const isValid = verifyCheckoutSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature);
  
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 });
  }

  // Find the pending subscription
  const sub = await prisma.subscription.findUnique({
    where: { razorpaySubId: razorpay_subscription_id }
  });

  if (!sub) {
    return NextResponse.json({ success: false, error: 'Subscription not found in database' }, { status: 404 });
  }

  // Grant the plan immediately
  const limits = PLAN_LIMITS[sub.plan] || PLAN_LIMITS.PRO;
  const now = new Date();
  const extendedEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'active', currentPeriodEnd: extendedEnd },
  });

  await prisma.organization.update({
    where: { id: sub.organizationId },
    data: {
      plan: sub.plan,
      planLeadsLimit: limits.leads,
      planLeadsUsed: 0,
      planResetDate: extendedEnd,
    },
  });

  return NextResponse.json({ success: true, message: 'Payment verified successfully' });
}

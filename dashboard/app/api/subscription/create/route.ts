import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthedUserWithOrg } from '../../../../lib/subscriptionAuth';
import { PLAN_LIMITS, razorpay } from '../../../../lib/razorpay';
import { authLimiter, getClientIp } from '../../../../lib/ratelimit';
import { subscriptionCreateSchema } from '../../../../lib/validation';

export async function POST(request: Request) {
  // SECURITY: Rate limiting (authLimiter — 5/min per IP).
  const ip = getClientIp(request);
  const { success: rlOk } = await authLimiter.limit(ip);
  if (!rlOk) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const user = await getAuthedUserWithOrg(request);
  if (!user || !user.organizationId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: any;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = subscriptionCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid plan. Must be PRO or BUSINESS.' },
      { status: 400 }
    );
  }
  const { plan } = parsed.data;

  const planId = plan === 'PRO' 
    ? process.env.RAZORPAY_PRO_PLAN_ID 
    : process.env.RAZORPAY_BUSINESS_PLAN_ID;

  if (!planId) {
    return NextResponse.json(
      { success: false, error: `Razorpay Plan ID not configured for ${plan}` },
      { status: 500 }
    );
  }

  try {
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const subscription = await rzp.subscriptions.create({
      plan_id: planId,
      customer_notify: 0,
      total_count: 120,
    });

    // Store the pending subscription in our database
    await prisma.subscription.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        plan,
        status: 'pending',
        razorpaySubId: subscription.id,
      },
      update: {
        plan,
        status: 'pending',
        razorpaySubId: subscription.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('Razorpay subscription error:', JSON.stringify(error, null, 2));
    const msg = error?.error?.description || error?.message || 'Failed to create subscription';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

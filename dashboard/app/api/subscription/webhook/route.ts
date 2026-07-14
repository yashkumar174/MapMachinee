import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyWebhookSignature, PLAN_LIMITS } from '../../../../lib/razorpay';

export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const rawBody = await request.text();

  if (!secret || !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const razorpaySubId: string | undefined =
    event?.payload?.subscription?.entity?.id ||
    event?.payload?.payment?.entity?.subscription_id;

  if (!razorpaySubId) {
    return NextResponse.json({ success: true, message: 'Ignored — no subscription id' });
  }

  const sub = await prisma.subscription.findUnique({ where: { razorpaySubId } });
  if (!sub) {
    return NextResponse.json({ success: true, message: 'Ignored — unknown subscription' });
  }

  const eventName: string = event?.event || '';
  const now = new Date();
  const extendedEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (eventName === 'subscription.activated') {
    const limits = PLAN_LIMITS[sub.plan] || PLAN_LIMITS.PRO;
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
  } else if (eventName === 'subscription.charged') {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'active', currentPeriodEnd: extendedEnd },
    });
    await prisma.organization.update({
      where: { id: sub.organizationId },
      data: { planLeadsUsed: 0, planResetDate: extendedEnd },
    });
  } else if (eventName === 'subscription.cancelled' || eventName === 'subscription.halted') {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled' },
    });
    await prisma.organization.update({
      where: { id: sub.organizationId },
      data: {
        plan: 'FREE',
        planLeadsLimit: PLAN_LIMITS.FREE.leads,
      },
    });
  }

  return NextResponse.json({ success: true });
}

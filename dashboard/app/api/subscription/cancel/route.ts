import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthedUserWithOrg } from '../../../../lib/subscriptionAuth';
import { authLimiter, getClientIp } from '../../../../lib/ratelimit';

export async function POST(request: Request) {
  // SECURITY: Rate limiting (authLimiter — 5/min per IP).
  // Payment-related (subscription mutation) so we use the strictest tier.
  const ip = getClientIp(request);
  const { success } = await authLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const user = await getAuthedUserWithOrg(request);
  if (!user || !user.organizationId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: user.organizationId },
  });

  if (!sub) {
    return NextResponse.json({ success: false, error: 'No active subscription to cancel.' }, { status: 404 });
  }

  await prisma.subscription.update({
    where: { organizationId: user.organizationId },
    data: { status: 'cancelled' },
  });

  const revertDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date();
  const formatted = revertDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return NextResponse.json({
    success: true,
    message: `Your plan will revert to Free on ${formatted}`,
    currentPeriodEnd: sub.currentPeriodEnd,
  });
}

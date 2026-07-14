import { NextResponse } from 'next/server';
import { getAuthedUserWithOrg } from '../../../../lib/subscriptionAuth';

export async function GET(request: Request) {
  const user = await getAuthedUserWithOrg(request);
  if (!user || !user.organization) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const org = user.organization as any;
  const sub = org.subscription;

  const leadsUsed = org.planLeadsUsed ?? 0;
  const leadsLimit = org.planLeadsLimit ?? 25;
  const percentUsed = leadsLimit > 0 ? Math.min(100, Math.round((leadsUsed / leadsLimit) * 100)) : 0;

  const resetAt: Date | null = org.planResetDate || sub?.currentPeriodEnd || null;
  const daysLeft = resetAt
    ? Math.max(0, Math.ceil((new Date(resetAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return NextResponse.json({
    success: true,
    plan: org.plan || 'FREE',
    leadsUsed,
    leadsLimit,
    percentUsed,
    daysLeft,
    status: sub?.status || 'active',
    currentPeriodEnd: sub?.currentPeriodEnd || org.planResetDate || null,
  });
}

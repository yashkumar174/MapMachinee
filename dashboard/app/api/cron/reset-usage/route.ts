import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // SECURITY: Bearer-token auth for cron endpoint (OWASP API2:2023 — Broken
  // Authentication). Previously this URL was completely unprotected — anyone
  // who knew the path could zero out every organization's usage counter and
  // grant themselves unlimited free leads. The cron scheduler (Vercel Cron,
  // GitHub Actions, etc.) must send `Authorization: Bearer <CRON_SECRET>`.
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    // Fail closed: refuse to run if the secret is unconfigured. Better to
    // miss a reset than to leave the endpoint open.
    console.error('[cron:reset-usage] CRON_SECRET is not set — refusing request.');
    return NextResponse.json(
      { success: false, error: 'Server misconfigured' },
      { status: 503 }
    );
  }
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/);
  const presented = match ? match[1] : null;
  if (!presented || presented !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const now = new Date();
  const nextReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const orgs = await prisma.organization.findMany({
    where: { planResetDate: { lt: now } },
    select: { id: true },
  });

  if (orgs.length === 0) {
    return NextResponse.json({ success: true, reset: 0 });
  }

  await prisma.organization.updateMany({
    where: { id: { in: orgs.map((o: { id: string }) => o.id) } },
    data: { planLeadsUsed: 0, planResetDate: nextReset },
  });

  return NextResponse.json({ success: true, reset: orgs.length });
}

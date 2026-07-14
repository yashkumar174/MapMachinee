import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { adminAuth } from '../../../lib/firebaseAdmin';
import { apiLimiter, getClientIp } from '../../../lib/ratelimit';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // SECURITY: Authentication (OWASP API2:2023 — Broken Authentication).
    // Previously this endpoint had NO auth at all and anyone could download
    // every lead in the database as CSV. Now we require a verified Firebase
    // session cookie and scope the query to the caller's organizationId.
    const cookieHeader = request.headers.get('cookie') || '';
    const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
    const token = fbTokenMatch ? fbTokenMatch[1] : null;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    let orgId: string | null = null;
    try {
      const decoded = await adminAuth.verifySessionCookie(token, true);
      const userRecord = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { organizationId: true },
      });
      orgId = userRecord?.organizationId ?? null;
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // SECURITY: Tenant isolation (OWASP API1:2023 — BOLA). The where clause
    // is always pinned to the caller's organizationId so they can never
    // export another tenant's leads via crafted query params.
    const where: any = { organizationId: orgId };
    if (status) {
      if (status === 'new') {
        where.status = { in: ['new', 'New Lead'] };
      } else {
        where.status = status;
      }
    }
    if (category) {
      where.category = category;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // CSV Header
    const headers = [
      'Name', 'Phone', 'Email', 'Website', 'Maps URL',
      'Rating', 'CMS', 'Has Website', 'Mobile Friendly',
      'Booking Enabled', 'Load Time (s)', 'Speed Grade', 'Lead Score',
      'Scraped At'
    ];

    // Helper: speed grade
    const getSpeedGrade = (loadTime: number | null) => {
      if (!loadTime) return 'N/A';
      if (loadTime <= 1.5) return 'A';
      if (loadTime <= 3.0) return 'B';
      if (loadTime <= 5.0) return 'C';
      return 'F';
    };

    // Helper: lead score
    const getLeadScore = (lead: any) => {
      let score = 0;
      if (!lead.has_website) score += 30;
      if (lead.load_time && lead.load_time > 3) score += 15;
      if (!lead.has_booking) score += 20;
      if (!lead.mobile_friendly) score += 10;

      // Review-based bonus: fewer reviews = hotter lead
      if (lead.rating) {
        const match = lead.rating.match(/([\d,]+)\s*reviews?/i);
        if (match) {
          const revCount = parseInt(match[1].replace(',', ''));
          if (revCount < 50) score += 15;
          else if (revCount < 200) score += 5;
        } else {
          score += 15; // No review count = very new business
        }
      } else {
        score += 15;
      }

      return Math.min(score, 100);
    };

    // Escape CSV fields
    const esc = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((lead: any) => [
      esc(lead.name),
      esc(lead.phone),
      esc(lead.emails),
      esc(lead.website),
      esc(lead.maps_url),
      esc(lead.rating),
      esc(lead.cms_type),
      lead.has_website ? 'Yes' : 'No',
      lead.mobile_friendly ? 'Yes' : 'No',
      lead.has_booking ? 'Yes' : 'No',
      lead.load_time ?? '',
      getSpeedGrade(lead.load_time),
      getLeadScore(lead),
      esc(lead.createdAt?.toISOString?.() || lead.createdAt),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

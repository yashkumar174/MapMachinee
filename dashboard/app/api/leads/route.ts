import { NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebaseAdmin';
import prisma from '../../../lib/prisma';
import { apiLimiter, getClientIp } from '../../../lib/ratelimit';

async function getAuthContext(request: Request) {
   const cookieHeader = request.headers.get('cookie') || '';
   const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
   const token = fbTokenMatch ? fbTokenMatch[1] : null;
   
   if (!token) return null;
   
   try {
      const decoded = await adminAuth.verifySessionCookie(token, true);
      const userRecord = await prisma.user.findUnique({
         where: { firebaseUid: decoded.uid }
      });
      return userRecord;
   } catch {
      return null;
   }
}

export async function POST(request: Request) {
  try {
    // SECURITY: Bearer-token auth for the Python scraper callback.
    // Previously this endpoint accepted any unauthenticated payload claiming
    // to be from the scraper, allowing anonymous lead-injection AND quota
    // inflation against arbitrary organizationIds. The Python scraper must
    // send `Authorization: Bearer <SCRAPER_API_SECRET>` (configured on its side).
    const expectedSecret = process.env.SCRAPER_API_SECRET;
    if (expectedSecret) {
      const auth = request.headers.get('authorization') || '';
      const match = auth.match(/^Bearer\s+(.+)$/);
      const presented = match ? match[1] : null;
      if (!presented || presented !== expectedSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      // SECURITY: Refuse to run unauthenticated in prod even if the secret is
      // accidentally not set — fail closed rather than silently accept all.
      console.error('[leads:POST] SCRAPER_API_SECRET is not set in production — refusing request.');
      return NextResponse.json(
        { success: false, error: 'Server misconfigured' },
        { status: 503 }
      );
    }

    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    // Bulk insert path; throttle to limit damage from a leaked secret.
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const leads = Array.isArray(body) ? body : [body];
    let createdCount = 0;
    const orgCreateCounts: Record<string, number> = {};

    for (const leadData of leads) {
       // Validate that python sent an organizationId
       if (!leadData.organizationId) continue;

       const audit = leadData.auditData || leadData.audit_results || {};
       const phone = leadData.phone || null;
       const website = leadData.website || null;
       const name = leadData.name || 'Unknown';

       // DEDUP: Check name, phone, AND website to catch all duplicate variants.
       // Google Maps often returns the same business with slightly different names
       // (e.g. trailing spaces, branch suffixes), but the phone number is always the same.
       const dedupeConditions: any[] = [
         { name, organizationId: leadData.organizationId }
       ];
       if (phone) {
         dedupeConditions.push({ phone, organizationId: leadData.organizationId });
       }
       if (website) {
         dedupeConditions.push({ website, organizationId: leadData.organizationId });
       }

       const existing = await prisma.lead.findFirst({
         where: { OR: dedupeConditions }
       });

       if (existing) {
         continue;
       }

       await prisma.lead.create({
         data: {
           organizationId: leadData.organizationId,
           name,
           phone,
           website,
           maps_url: leadData.maps_url || null,
           emails: audit.emails || null,
           cms_type: audit.cms_type || null,
           rating: leadData.rating || null,
           category: leadData.category || null,
           has_website: audit.has_website || false,
           load_time: audit.load_time || null,
           mobile_friendly: audit.mobile_friendly || false,
           has_booking: audit.has_booking || false,
           error: audit.error || null,
           agent: leadData.agent || null,
           auditData: typeof audit === 'object' ? JSON.stringify(audit) : (audit || null),
           status: 'New Lead'
         }
       });
       createdCount++;
       orgCreateCounts[leadData.organizationId] = (orgCreateCounts[leadData.organizationId] || 0) + 1;
    }

    // Increment subscription usage counters per organization
    await Promise.all(
      Object.entries(orgCreateCounts).map(([orgId, count]) =>
        prisma.organization.update({
          where: { id: orgId },
          data: { planLeadsUsed: { increment: count } },
        })
      )
    );

    return NextResponse.json({ success: true, message: `Created ${createdCount} leads` });

  } catch (error: any) {
    console.error("Error creating leads:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    // Dashboard polls this endpoint, so the limit is generous enough for
    // normal use but caps abusive scraping of all leads.
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // If the python scraper requests this to deduplicate, we use query params
    const { searchParams } = new URL(request.url);
    const queryOrgId = searchParams.get('organizationId');
    
    // Otherwise it's the dashboard asking for their leads
    const authContext = await getAuthContext(request);
    const orgId = authContext?.organizationId;
    const effectiveOrgId = queryOrgId || orgId;

    if (!effectiveOrgId) {
       return NextResponse.json({ success: false, error: 'Unauthorized: missing organization' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: { organizationId: effectiveOrgId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    // Bulk delete is destructive; throttle even though session auth applies below.
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const authContext = await getAuthContext(request);
    const orgId = authContext?.organizationId;

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'Lost';

    let statusCondition: any;
    if (target === 'new') {
      statusCondition = { in: ['new', 'New Lead'] };
    } else {
      statusCondition = { in: ['closed', 'Closed', 'completed', 'Completed', 'lost', 'Lost'] };
    }

    const whereClause: any = {
      organizationId: orgId,
      status: statusCondition
    };

    const result = await prisma.lead.deleteMany({ where: whereClause });
    return NextResponse.json({ success: true, message: `Deleted ${result.count} ${target} leads` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

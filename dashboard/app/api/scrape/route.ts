import { NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebaseAdmin';
import prisma from '../../../lib/prisma';
import { scrapeLimiter, getClientIp } from '../../../lib/ratelimit';
import { scrapeSchema } from '../../../lib/validation';

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limiting (scrapeLimiter — 3/min per IP).
    // This is the most expensive endpoint: each call fans out to the
    // external Python scraper engine. Tight throttle protects compute & cost.
    const ip = getClientIp(request);
    const { success } = await scrapeLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
    const token = fbTokenMatch ? fbTokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized: You must be logged in to trigger a scrape.' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token, true);
    const userId = decodedToken.uid;

    const userRecord = await prisma.user.findUnique({
       where: { firebaseUid: userId },
       include: { organization: true }
    });

    const orgId = userRecord?.organizationId;
    
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: You must belong to an organization to generate leads.' }, { status: 403 });
    }

    // SECURITY: Input validation via Zod (scrapeSchema).
    // Trims/length-bounds the query, clamps max/max_reviews, and `.strict()`
    // rejects unknown fields so an attacker can't smuggle extra props
    // (e.g. organizationId) into the downstream payload.
    const rawBody = await request.json();
    const parsed = scrapeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { query, max, max_reviews } = parsed.data;

    // ── Subscription quota enforcement ──
    const org = userRecord?.organization as any;
    const used = org?.planLeadsUsed ?? 0;
    const limit = org?.planLeadsLimit ?? 25;
    const remaining = Math.max(0, limit - used);

    if (remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: `You've used ${used}/${limit} leads this month. Upgrade to Pro for 2,000 leads/mo.`,
          code: 'QUOTA_EXCEEDED',
          used,
          limit,
        },
        { status: 402 }
      );
    }

    const effectiveMax = Math.min(Number(max) || 10, remaining);

    // Define URLs (should be env variables in production)
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://127.0.0.1:8000/jobs/scrape";
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const CALLBACK_URL = `${APP_URL}/api/leads`;

    console.log(`Submitting job to Scraper AI Engine...`);

    const payload = {
      query,
      max: effectiveMax,
      max_reviews,
      agent: userRecord?.username || userId,
      organizationId: orgId,
      callback_url: CALLBACK_URL,
      niche: userRecord?.organization?.niche
    };
    
    const response = await fetch(SCRAPER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Scraper API returned ${response.status}: ${text}`);
    }

    // We return eagerly to avoid Vercel timeouts! The Python microservice will work in the background.
    return NextResponse.json({ success: true, message: 'Scraping job queued successfully! The results will populate in your dashboard shortly.' });
    
  } catch (error: any) {
    console.error('Error queuing scrape job to', process.env.SCRAPER_API_URL || "http://127.0.0.1:8000/jobs/scrape", ':', error);
    
    // Explicitly check for fetch failed to give a better error message to the client
    if (error.message === 'fetch failed' || error.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json({ 
        success: false, 
        error: 'Backend scraper engine is offline or unreachable. Please ensure the Python server is running on port 8000.' 
      }, { status: 502 });
    }

    return NextResponse.json({ success: false, error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebaseAdmin';
import prisma from '../../../lib/prisma';
import { apiLimiter, getClientIp } from '../../../lib/ratelimit';
import { onboardingSchema } from '../../../lib/validation';

export async function POST(request: Request) {
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

    const cookieHeader = request.headers.get('cookie') || '';
    const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
    const token = fbTokenMatch ? fbTokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token, true);

    // SECURITY: Input validation via Zod (onboardingSchema).
    // Replaces the prior manual niche/username checks. .strict() rejects
    // unknown fields so an attacker can't toggle e.g. `role` / `plan` here.
    const rawBody = await request.json();
    const parsed = onboardingSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { niche, username, serviceLevel, hasTeamManagement } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid }
    });

    if (!user || !user.organizationId) {
       return NextResponse.json({ success: false, error: 'No organization found' }, { status: 404 });
    }

    // Check if username is already taken by someone else
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ success: false, error: 'Username is already taken. Please choose another.' }, { status: 409 });
    }

    // Update both org niche/serviceLevel and user's username
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { 
         niche,
         serviceLevel: serviceLevel === 'SCRAPER_ONLY' ? 'SCRAPER_ONLY' : 'FULL_CRM',
         hasTeamManagement: Boolean(hasTeamManagement)
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { username }
    });

    return NextResponse.json({ success: true, message: 'Onboarding completed' });
  } catch (error: any) {
    console.error('Error in onboarding:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

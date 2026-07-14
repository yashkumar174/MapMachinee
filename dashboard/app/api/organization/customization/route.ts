import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import prisma from '../../../../lib/prisma';
import { apiLimiter, getClientIp } from '../../../../lib/ratelimit';
import { customizationSchema } from '../../../../lib/validation';

// GET: Fetch customization settings for the current user's organization
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
    const token = fbTokenMatch ? fbTokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { organization: true },
    });

    if (!user || !user.organization) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const org = user.organization;
    return NextResponse.json({
      niche: org.niche,
      hasTeamManagement: org.hasTeamManagement,
      customPipelineStages: org.customPipelineStages ? JSON.parse(org.customPipelineStages) : null,
      customStatCards: org.customStatCards ? JSON.parse(org.customStatCards) : null,
      customScoringRules: org.customScoringRules ? JSON.parse(org.customScoringRules) : null,
    });
  } catch (error: any) {
    console.error('GET /api/organization/customization error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Save customization settings + handle stage migration
export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
    const token = fbTokenMatch ? fbTokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { organization: true },
    });

    if (!user || !user.organization) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update customization' }, { status: 403 });
    }

    // SECURITY: Input validation via Zod (customizationSchema).
    // Caps the size of arrays/strings so a malicious admin can't blow up
    // the JSON column with arbitrary payloads. .strict() rejects unknown keys.
    const rawBody = await request.json();
    const parsed = customizationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { customPipelineStages, customStatCards, customScoringRules, stageMappings } = parsed.data;

    // ── Stage Migration ──
    // If the user provided stageMappings (e.g. { "In Discussion": "Demo Booked" }),
    // we remap all existing leads from the old stage to the new stage.
    if (stageMappings && typeof stageMappings === 'object') {
      for (const [oldStage, newStage] of Object.entries(stageMappings)) {
        if (oldStage && newStage && typeof newStage === 'string') {
          await prisma.lead.updateMany({
            where: {
              organizationId: user.organizationId!,
              status: oldStage,
            },
            data: {
              status: newStage,
            },
          });
        }
      }
    }

    // ── Save customization ──
    const updateData: any = {};
    if (customPipelineStages !== undefined) {
      updateData.customPipelineStages = JSON.stringify(customPipelineStages);
    }
    if (customStatCards !== undefined) {
      updateData.customStatCards = JSON.stringify(customStatCards);
    }
    if (customScoringRules !== undefined) {
      updateData.customScoringRules = JSON.stringify(customScoringRules);
    }

    await prisma.organization.update({
      where: { id: user.organizationId! },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Customization saved.' });
  } catch (error: any) {
    console.error('PUT /api/organization/customization error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

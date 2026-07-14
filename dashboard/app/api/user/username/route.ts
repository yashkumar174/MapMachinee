import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import prisma from '../../../../lib/prisma';
import { apiLimiter, getClientIp } from '../../../../lib/ratelimit';
import { usernameSchema } from '../../../../lib/validation';

// GET: Fetch current username
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ username: user.username });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update username
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY: Input validation via Zod (usernameSchema).
    // Replaces the prior manual length/regex checks. .strict() also blocks
    // attackers from injecting fields like `role` to escalate privileges.
    const rawBody = await request.json();
    const parsed = usernameSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const trimmed = parsed.data.username.trim();

    // Check uniqueness
    const existing = await prisma.user.findUnique({
      where: { username: trimmed },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { username: trimmed },
    });

    return NextResponse.json({ success: true, username: trimmed });
  } catch (error: any) {
    console.error('PUT /api/user/username error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

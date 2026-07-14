import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { adminAuth } from '../../../lib/firebaseAdmin';
import { apiLimiter, getClientIp } from '../../../lib/ratelimit';

// SECURITY: Helper — verify the Firebase session cookie and load the actual
// User row from the database. Previously this endpoint trusted the
// `x-user-role` and `x-user-username` request headers, which any client
// could spoof to gain ADMIN access. We now ignore those headers entirely
// and derive role/username from the authenticated DB record.
async function getAdminUserFromSession(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, username: true, role: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // SECURITY: Authn + authz from session cookie + DB lookup, NOT request headers.
  const me = await getAdminUserFromSession(request);
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: users, currentUser: me.username });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // SECURITY: Authn + authz from session cookie + DB lookup, NOT request headers.
  const me = await getAdminUserFromSession(request);
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { username, password, newRole } = await request.json();

    if (!username || !password || !['ADMIN', 'SALES'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: newRole,
      },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

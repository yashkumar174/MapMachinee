import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { apiLimiter, getClientIp } from '../../../../lib/ratelimit';
import { inviteSchema } from '../../../../lib/validation';
import { PLAN_LIMITS } from '../../../../lib/razorpay';
import nodemailer from 'nodemailer';

// Helper: verify session cookie and load user with org
async function getAuthedAdmin(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      include: { organization: true },
    });
    if (!user || user.role !== 'ADMIN' || !user.organizationId) return null;
    return user;
  } catch {
    return null;
  }
}

// GET: List all invites + members for the admin's org
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const admin = await getAuthedAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = admin.organizationId!;
  const plan = admin.organization?.plan || 'FREE';
  const seatLimit = PLAN_LIMITS[plan]?.seats || 1;

  // Get current members
  const members = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, username: true, role: true, firebaseUid: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Get pending invites
  const invites = await prisma.invite.findMany({
    where: { organizationId: orgId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    members,
    invites,
    seatLimit,
    seatsUsed: members.length,
    plan,
    currentUserId: admin.id,
  });
}

// POST: Create a new invite
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const admin = await getAuthedAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: any;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid input';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const orgId = admin.organizationId!;
  const plan = admin.organization?.plan || 'FREE';
  const seatLimit = PLAN_LIMITS[plan]?.seats || 1;

  // Check seat limit (members + pending invites)
  const memberCount = await prisma.user.count({ where: { organizationId: orgId } });
  const pendingCount = await prisma.invite.count({
    where: { organizationId: orgId, status: 'PENDING' },
  });

  if (memberCount + pendingCount >= seatLimit) {
    return NextResponse.json(
      { error: `Seat limit reached (${seatLimit} for ${plan} plan). Upgrade to add more team members.` },
      { status: 403 }
    );
  }

  // Check if email is already a member
  const existingUser = await prisma.user.findFirst({
    where: {
      organizationId: orgId,
      // We need to check by Firebase — look up the user by email in Firebase
    },
  });

  // Check if invite already exists
  const existingInvite = await prisma.invite.findFirst({
    where: { organizationId: orgId, email, status: 'PENDING' },
  });

  if (existingInvite) {
    return NextResponse.json({ error: 'An invite for this email is already pending.' }, { status: 409 });
  }

  // Check if email is already in the org (by checking Firebase users)
  try {
    const fbUser = await adminAuth.getUserByEmail(email);
    const alreadyMember = await prisma.user.findFirst({
      where: { firebaseUid: fbUser.uid, organizationId: orgId },
    });
    if (alreadyMember) {
      return NextResponse.json({ error: 'This user is already a member of your organization.' }, { status: 409 });
    }
  } catch {
    // User doesn't exist in Firebase yet — that's fine, they'll sign up later
  }

  const invite = await prisma.invite.create({
    data: {
      organizationId: orgId,
      email,
      role,
      invitedBy: admin.username,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteLink = `${appUrl}/login`;

  return NextResponse.json({ success: true, invite, inviteLink });
}

// DELETE: Revoke a pending invite
export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const admin = await getAuthedAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get('id');
  if (!inviteId) {
    return NextResponse.json({ error: 'Missing invite ID' }, { status: 400 });
  }

  // Ensure the invite belongs to the admin's org
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, organizationId: admin.organizationId! },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  await prisma.invite.delete({ where: { id: inviteId } });

  return NextResponse.json({ success: true });
}

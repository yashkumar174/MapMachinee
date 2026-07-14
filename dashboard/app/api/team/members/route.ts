import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { apiLimiter, getClientIp } from '../../../../lib/ratelimit';

// Helper: verify session cookie and load admin user
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

// DELETE: Remove a member from the organization
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
  const memberId = searchParams.get('id');
  if (!memberId) {
    return NextResponse.json({ error: 'Missing member ID' }, { status: 400 });
  }

  const memberIdNum = Number(memberId);

  // Prevent self-removal
  if (memberIdNum === admin.id) {
    return NextResponse.json({ error: 'You cannot remove yourself from the organization.' }, { status: 400 });
  }

  // Ensure the target user belongs to the same org
  const targetUser = await prisma.user.findFirst({
    where: { id: memberIdNum, organizationId: admin.organizationId! },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in your organization.' }, { status: 404 });
  }

  // Don't allow removing the last admin
  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { organizationId: admin.organizationId!, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last administrator.' }, { status: 400 });
    }
  }

  // Detach the user from the org (they'll create a new org on next sign-in)
  await prisma.user.update({
    where: { id: memberIdNum },
    data: { organizationId: null, role: 'SALES' },
  });

  return NextResponse.json({ success: true, message: 'Member removed from organization.' });
}

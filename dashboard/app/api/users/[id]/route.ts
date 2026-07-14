import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { apiLimiter, getClientIp } from '../../../../lib/ratelimit';

// SECURITY: Verify session cookie and confirm ADMIN role from the database,
// NOT from request headers (which are trivially spoofable).
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // SECURITY: Session cookie auth — replaces spoofable x-user-role header.
  const me = await getAdminUserFromSession(request);
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    
    // Prevent self-deletion
    if (me.id === Number(id)) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' }});
    const targetUser = await prisma.user.findUnique({ where: { id: Number(id) } });

    if (targetUser?.role === 'ADMIN' && adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the final administrator account.' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: 'User deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // SECURITY: Session cookie auth — replaces spoofable x-user-role header.
  const me = await getAdminUserFromSession(request);
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    
    const updateData: any = {};
    if (body.newRole && ['ADMIN', 'SALES'].includes(body.newRole)) {
      updateData.role = body.newRole;
    }
    
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(body.password, salt);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid update data provided.' }, { status: 400 });
    }

    // Protect final admin from role demotion
    if (updateData.role === 'SALES') {
       const adminCount = await prisma.user.count({ where: { role: 'ADMIN' }});
       const targetUser = await prisma.user.findUnique({ where: { id: Number(id) } });
       if (targetUser?.role === 'ADMIN' && adminCount <= 1) {
         return NextResponse.json({ error: 'Cannot demote the final administrator account.' }, { status: 400 });
       }
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, username: true, role: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

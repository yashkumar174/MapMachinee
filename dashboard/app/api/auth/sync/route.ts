import { NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import prisma from '../../../../lib/prisma';
import { authLimiter, getClientIp } from '../../../../lib/ratelimit';

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limiting (authLimiter — 5/min per IP).
    // Stops abuse of the user-provisioning path (creates Org + User records).
    const ip = getClientIp(request);
    const { success } = await authLimiter.limit(ip);
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
      return NextResponse.json({ success: false, error: 'No token found' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token, true);
    const { uid, email, name } = decodedToken;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: { organization: true }
    });

    if (!user) {
      try {
        // Check if there's a pending invite for this email
        const pendingInvite = email
          ? await prisma.invite.findFirst({
              where: { email: email.toLowerCase(), status: 'PENDING' },
            })
          : null;

        if (pendingInvite) {
          // Invited user: link to the existing organization
          const baseName = name || email?.split('@')[0] || 'user';
          const username = `${baseName}_${uid.slice(0, 5)}`;

          user = await prisma.user.create({
            data: {
              firebaseUid: uid,
              username,
              role: pendingInvite.role,
              organizationId: pendingInvite.organizationId,
            },
            include: { organization: true },
          });

          // Mark invite as accepted
          await prisma.invite.update({
            where: { id: pendingInvite.id },
            data: { status: 'ACCEPTED' },
          });
        } else {
          // No invite: create a fresh organization for the new user
          const orgName = name ? `${name}'s Workspace` : 'My Workspace';
          const newOrg = await prisma.organization.create({
            data: {
              name: orgName,
              plan: 'FREE',
            },
          });

          const baseName = name || email?.split('@')[0] || 'user';
          const username = `${baseName}_${uid.slice(0, 5)}`;

          user = await prisma.user.create({
            data: {
              firebaseUid: uid,
              username,
              role: 'ADMIN',
              organizationId: newOrg.id,
            },
            include: { organization: true },
          });
        }
      } catch (createError: any) {
        // Handle race conditions, SQLite locks (SQLITE_BUSY), or unique constraint violations
        // caused by React StrictMode double-firing the API route.
        user = await prisma.user.findUnique({
          where: { firebaseUid: uid },
          include: { organization: true },
        });
        
        if (!user) {
          throw createError;
        }
      }
    }

    const needsOnboarding = !user.organization?.niche;

    return NextResponse.json({ success: true, needsOnboarding });
  } catch (error: any) {
    console.error('Error in auth sync:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

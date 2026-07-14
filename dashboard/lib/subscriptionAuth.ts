import { adminAuth } from './firebaseAdmin';
import prisma from './prisma';

export async function getAuthedUserWithOrg(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      include: { organization: { include: { subscription: true } } },
    });
    return user;
  } catch {
    return null;
  }
}

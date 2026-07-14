import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(token, true);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid }
    });

    if (!user || decodedToken.email !== 'yashkumar4784@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.inquiry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete inquiry:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

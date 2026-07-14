import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { adminAuth } from '@/lib/firebaseAdmin';
import InquiriesClient from './InquiriesClient';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata = {
  title: 'Platform Inquiries | MapMachine',
};

export default async function InquiriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) redirect('/login');

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifySessionCookie(token, true);
  } catch (error) {
    redirect('/login');
  }

  const userRecord = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
    include: { organization: true }
  });

  if (!userRecord || decodedToken.email !== 'yashkumar4784@gmail.com') {
    redirect('/dashboard');
  }

  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <LayoutWrapper 
      activePath="/inquiries"
      username={userRecord.username}
      email={decodedToken.email || ''}
      isAdmin={userRecord.role === 'ADMIN'}
      hasTeamManagement={userRecord.organization?.hasTeamManagement}
    >
      <InquiriesClient initialInquiries={inquiries} />
    </LayoutWrapper>
  );
}

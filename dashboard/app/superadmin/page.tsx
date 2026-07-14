import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { adminAuth } from '@/lib/firebaseAdmin';
import LayoutWrapper from '@/components/LayoutWrapper';
import SuperAdminClient from './SuperAdminClient';

export const metadata = {
  title: 'Platform Overview | MapMachine Super Admin',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
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

  // Gather platform-wide metrics
  const totalUsers = await prisma.user.count();
  const totalOrganizations = await prisma.organization.count();
  
  // Count by plans
  const orgs = await prisma.organization.findMany({
    select: { plan: true }
  });

  let free = 0;
  let pro = 0;
  let business = 0;

  orgs.forEach(org => {
    if (org.plan === 'PRO') pro++;
    else if (org.plan === 'BUSINESS') business++;
    else free++;
  });

  // Calculate rough MRR in INR
  const mrr = (pro * 999) + (business * 2999);

  return (
    <LayoutWrapper 
      activePath="/superadmin"
      username={userRecord.username}
      email={decodedToken.email || ''}
      isAdmin={true}
      hasTeamManagement={false}
    >
      <SuperAdminClient 
        stats={{
          totalUsers,
          totalOrganizations,
          freeOrgs: free,
          proOrgs: pro,
          businessOrgs: business,
          mrr
        }}
      />
    </LayoutWrapper>
  );
}

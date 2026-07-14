import prisma from '../../../lib/prisma';
import LayoutWrapper from '../../../components/LayoutWrapper';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '../../../lib/firebaseAdmin';
import TeamClient from './TeamClient';
import { PLAN_LIMITS } from '../../../lib/razorpay';

export const metadata = {
  title: 'Team — MapMachine CRM',
  description: 'Manage your team members and invitations.',
};

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) redirect('/login');

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifySessionCookie(token, true);
  } catch {
    redirect('/login');
  }

  const userRecord = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
    include: { organization: true },
  });

  if (!userRecord || !userRecord.organization) {
    redirect('/onboarding');
  }

  if (userRecord.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const niche = userRecord.organization.niche || '';
  const username = userRecord.username || decodedToken.email?.split('@')[0] || 'User';
  const plan = userRecord.organization.plan || 'FREE';
  const seatLimit = PLAN_LIMITS[plan]?.seats || 1;

  return (
    <LayoutWrapper
      username={username}
      email={decodedToken.email || ''}
      niche={niche}
      isAdmin={true}
      isScraperOnly={userRecord.organization.serviceLevel === 'SCRAPER_ONLY'}
      hasTeamManagement={true}
      activePath="/settings/team"
    >
      <div className="flex flex-col min-h-screen font-sans bg-surface-page">
        <div className="bg-surface-card border-b border-b-default shrink-0 pt-10 pb-6 px-6 sm:px-10">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <h1 className="text-3xl font-black text-t-primary tracking-tight">Team</h1>
            <p className="text-sm font-medium text-t-muted">Manage your workspace members and invitations.</p>
          </div>
        </div>

        <main className="flex-1 w-full max-w-4xl mx-auto px-6 sm:px-10 py-10 pb-20">
          <TeamClient plan={plan} seatLimit={seatLimit} />
        </main>
      </div>
    </LayoutWrapper>
  );
}

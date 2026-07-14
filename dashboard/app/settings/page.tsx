import prisma from '../../lib/prisma';
import LayoutWrapper from '../../components/LayoutWrapper';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '../../lib/firebaseAdmin';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Account Info — MapMachine CRM',
  description: 'Manage your user profile and application settings.',
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  if (!userRecord || !userRecord.organization || !userRecord.organization.niche) {
    redirect('/onboarding');
  }

  const niche = userRecord.organization.niche;
  const username = userRecord.username || decodedToken.email?.split('@')[0] || 'User';
  const isAdmin = userRecord.role === 'ADMIN';

  return (
    <LayoutWrapper 
      username={username} 
      email={decodedToken.email || ''} 
      niche={niche} 
      isAdmin={isAdmin} 
      isScraperOnly={userRecord.organization.serviceLevel === 'SCRAPER_ONLY'} 
      hasTeamManagement={userRecord.organization.hasTeamManagement} 
      activePath="/settings"
    >
      <div className="flex flex-col min-h-screen font-sans bg-surface-page">
        {/* Header */}
        <div className="bg-surface-card border-b border-b-default shrink-0 pt-10 pb-6 px-6 sm:px-10">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <h1 className="text-3xl font-black text-t-primary tracking-tight">Account Information</h1>
            <p className="text-sm font-medium text-t-muted">Overview of your profile, workspace details, and subscription usage.</p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-6 sm:px-10 py-10 pb-20">
          <SettingsClient 
            initialUsername={username} 
            email={decodedToken.email || ''} 
            isAdmin={isAdmin}
            organizationName={userRecord.organization.name}
            niche={niche}
            plan={userRecord.organization.plan}
            planLeadsUsed={userRecord.organization.planLeadsUsed}
            planLeadsLimit={userRecord.organization.planLeadsLimit}
          />
        </main>
      </div>
    </LayoutWrapper>
  );
}

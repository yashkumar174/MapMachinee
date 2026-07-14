import { adminAuth } from '../../../lib/firebaseAdmin';
import prisma from '../../../lib/prisma';
import { cookies } from 'next/headers';
import LayoutWrapper from '../../../components/LayoutWrapper';
import UpgradePage from '../../../components/UpgradePage';

export default async function UpgradeRoute() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return <div>Unauthorized</div>;
  }

  const decodedToken = await adminAuth.verifySessionCookie(token, true);
  const userRecord = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
    include: { organization: { include: { subscription: true } } },
  });

  if (!userRecord?.organization) {
    return <div>No organization found</div>;
  }

  const org = userRecord.organization as any;
  const plan = org.plan || 'FREE';
  const niche = org.niche || 'DIGITAL_AGENCY';
  const role = userRecord.role || 'SALES';
  const isAdmin = role === 'ADMIN';
  const isScraperOnly = org.serviceLevel === 'SCRAPER_ONLY';
  const username = userRecord.username || decodedToken.email?.split('@')[0] || 'User';

  return (
    <LayoutWrapper
      username={username}
      email={decodedToken.email || ''}
      niche={niche}
      isAdmin={isAdmin}
      isScraperOnly={isScraperOnly}
      hasTeamManagement={org.hasTeamManagement}
      activePath="/dashboard/upgrade"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10 pb-8">
        <UpgradePage currentPlan={plan} />
      </div>
    </LayoutWrapper>
  );
}

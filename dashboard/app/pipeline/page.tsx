import prisma from '../../lib/prisma';
import PipelineList from '../../components/PipelineList';
import Link from 'next/link';
import LogoutButton from '../../components/LogoutButton';
import ThemeToggle from '../../components/ThemeToggle';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '../../lib/firebaseAdmin';

import { getPipelineStages } from '../../lib/customization';
import UsernameEditor from '../../components/UsernameEditor';
import LayoutWrapper from '../../components/LayoutWrapper';

export const metadata = {
  title: 'Lead Pipeline — Hyper-Local Leads',
  description: 'Drag-and-drop Kanban pipeline to manage your scraped leads through the sales funnel.',
};

// Force dynamic rendering so leads are always fresh
export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
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

  if (userRecord.organization.serviceLevel === 'SCRAPER_ONLY') {
    redirect('/dashboard');
  }

  const niche = userRecord.organization.niche;
  const role = userRecord.role;
  const username = userRecord.username || decodedToken.email?.split('@')[0] || 'User';
  const isAdmin = role === 'ADMIN';
  const plan = (userRecord.organization.plan || 'FREE') as 'FREE' | 'PRO' | 'BUSINESS';

  // Strict Row-Level Security: Sales only see their own assigned leads. Admins see all.
  const queryFilter: any = { inPipeline: true };
  if (!isAdmin && username) {
    queryFilter.agent = username;
  }

  const rawLeads = await prisma.lead.findMany({
    where: queryFilter,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, phone: true, emails: true, category: true,
      status: true, rating: true, agent: true, propertyName: true,
      visitTime: true, notes: true, updatedAt: true,
      website: true, maps_url: true, cms_type: true, has_website: true,
      load_time: true, mobile_friendly: true, has_booking: true, error: true,
      createdAt: true,
      dealValue: true, probability: true, lastContactedAt: true, nextFollowUp: true,
    },
  });

  // Dynamic pipeline stages from org customization or niche defaults
  const COLUMNS = getPipelineStages(userRecord.organization);

  // Map any legacy or incorrect lowercase statuses into the exact CRM columns
  const leads = rawLeads.map((l: any) => {
    let s = l.status;
    // Map standard scrape inputs to the FIRST actual customized pipeline stage.
    // 'New Leads' is the canonical entry stage and must land in COLUMNS[0] cleanly.
    if (
      s === 'new' ||
      s === 'New Leads' ||
      s === 'New Lead' ||
      s === 'contacted' ||
      s === 'Contacted' ||
      s === 'Attempting Contact' ||
      s === 'interested'
    ) {
      s = COLUMNS[0];
    } else if (s === 'closed' || s === 'Booked') {
      s = 'Completed';
    }

    // Explicitly enforce valid columns to avoid data disappearing from stage tabs
    if (!COLUMNS.includes(s) && s !== 'Lost' && s !== 'Completed') {
      s = COLUMNS[0];
    }

    return { ...l, status: s };
  });

  const totalPipeline = leads.length;
  const active = leads.filter((l: any) => !['Completed', 'Lost'].includes(l.status)).length;
  const completed = leads.filter((l: any) => l.status === 'Completed').length;
  const lost = leads.filter((l: any) => l.status === 'Lost').length;

  return (
    <LayoutWrapper username={username} email={decodedToken.email || ''} niche={userRecord.organization.niche || ''} isAdmin={isAdmin} isScraperOnly={false} hasTeamManagement={userRecord.organization.hasTeamManagement} activePath="/pipeline">
      <div className="flex flex-col min-h-screen font-mono">

      {/* Summary Stats Grid */}
      <section className="bg-surface-base border-b border-b-default shrink-0 pt-8 pb-4">
        <div className="max-w-[1800px] w-full mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                label: 'Total Leads', 
                value: totalPipeline, 
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              },
              { 
                label: 'Active Deals', 
                value: active, 
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              },
              {
                label: 'Completed',
                value: completed,
                icon: <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              },
              {
                label: 'Lost',
                value: lost,
                icon: <svg className="w-5 h-5 text-[#FD551D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="p-4 rounded-xl border border-b-default bg-surface-card flex flex-col justify-between hover:border-accent/30 hover:bg-surface-card-hover transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors bg-surface-badge text-accent group-hover:bg-accent/10">
                    {icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-t-muted uppercase tracking-widest">{label}</h3>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-black text-t-primary leading-none transition-transform group-hover:scale-105 origin-left">
                        {value}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CRM Data Table Container */}
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 py-6 pb-20">
        <PipelineList initialLeads={leads as any} isAdmin={isAdmin} stages={COLUMNS} plan={plan} />
      </main>
      </div>
    </LayoutWrapper>
  );
}

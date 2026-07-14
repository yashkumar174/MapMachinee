import prisma from '../../lib/prisma';
import { adminAuth } from '../../lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LayoutWrapper from '../../components/LayoutWrapper';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
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

  const role = userRecord.role;
  const username = userRecord.username || decodedToken.email?.split('@')[0] || 'User';
  const isAdmin = role === 'ADMIN';
  const serviceLevel = userRecord.organization.serviceLevel || 'FULL_CRM';
  const isScraperOnly = serviceLevel === 'SCRAPER_ONLY';
  const niche = userRecord.organization.niche;

  const leads = await prisma.lead.findMany({
    where: { organizationId: userRecord.organizationId! },
    orderBy: { createdAt: 'desc' }
  });

  const totalLeads = leads.length;
  const crmLeads = leads.filter((l: any) => l.inPipeline).length;
  const rawLeads = totalLeads - crmLeads;

  // History Extraction (Group by date and category)
  const historyMap: Record<string, { date: Date, category: string, count: number }> = {};
  
  leads.forEach(lead => {
    const d = new Date(lead.createdAt);
    // Group by Year-Month-Day-Hour to capture distinct scrape runs roughly
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    const key = `${dateKey}_${lead.category || 'Unknown'}`;
    
    if (!historyMap[key]) {
      historyMap[key] = { date: d, category: lead.category || 'Unknown Search', count: 0 };
    }
    historyMap[key].count += 1;
  });

  const historyLogs = Object.values(historyMap)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 15); // Top 15 recent scrapes

  return (
    <LayoutWrapper 
      username={username} 
      email={decodedToken.email || ''} 
      niche={niche} 
      isAdmin={isAdmin} 
      isScraperOnly={isScraperOnly} 
      hasTeamManagement={userRecord.organization.hasTeamManagement} 
      activePath="/overview"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10 pb-8 space-y-8 font-mono">
        <div>
          <h1 className="text-2xl font-black text-t-primary uppercase tracking-tight">Analytics Overview</h1>
          <p className="text-sm font-bold text-t-muted mt-1 uppercase tracking-widest">Global Statistics & History</p>
        </div>

        {/* Math Summaries (Stat Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-surface-card border border-b-muted rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <h3 className="text-[10px] font-bold text-t-faint uppercase tracking-widest mb-2">Total Leads Scraped</h3>
            <p className="text-4xl font-black text-t-primary tabular-nums">{totalLeads}</p>
          </div>
          <div className="p-6 bg-surface-card border border-b-muted rounded-xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <h3 className="text-[10px] font-bold text-t-faint uppercase tracking-widest mb-2">Saved to CRM Pipeline</h3>
            <p className="text-4xl font-black text-emerald-500 tabular-nums">{crmLeads}</p>
          </div>
          <div className="p-6 bg-surface-card border border-b-muted rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <h3 className="text-[10px] font-bold text-t-faint uppercase tracking-widest mb-2">Pending In Raw Data</h3>
            <p className="text-4xl font-black text-amber-500 tabular-nums">{rawLeads}</p>
          </div>
        </div>

        {/* History Logs */}
        <div className="bg-surface-card border border-b-muted rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-b-divider bg-surface-header/50">
            <h2 className="text-xs font-black text-t-primary uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Scrape Logs
            </h2>
          </div>
          
          <div className="divide-y divide-b-divider">
            {historyLogs.length === 0 ? (
              <div className="p-8 text-center text-t-muted text-sm font-bold">No scrape history found.</div>
            ) : (
              historyLogs.map((log, i) => {
                const timeStr = log.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = log.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div key={i} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-card-hover transition-colors">
                    <div>
                      <p className="text-sm font-bold text-t-primary truncate max-w-md">{log.category}</p>
                      <p className="text-[10px] font-bold text-t-faint uppercase tracking-widest mt-0.5">{dateStr} at {timeStr}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-xs font-black text-accent bg-accent/10 px-3 py-1.5 rounded uppercase tracking-wider">
                      +{log.count} Leads
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </LayoutWrapper>
  );
}

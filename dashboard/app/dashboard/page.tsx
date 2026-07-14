import prisma from '../../lib/prisma';
import SearchForm from '../../components/SearchForm';
import ClearDataButton from '../../components/ClearDataButton';
import ExportButton from '../../components/ExportButton';
import CategoryFilter from '../../components/CategoryFilter';
import NotesEditor from '../../components/NotesEditor';
import LogoutButton from '../../components/LogoutButton';
import BfcacheFix from '../../components/BfcacheFix';
import SendToCRMButton from '../../components/SendToCRMButton';
import ThemeToggle from '../../components/ThemeToggle';
import Link from 'next/link';
import DeleteLeadButton from '../../components/DeleteLeadButton';
import CopyButton from '../../components/CopyButton';
import { adminAuth } from '../../lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStatCards, getScoringRules, computeStatValue, computeLeadScore, computeFilterMap } from '../../lib/customization';
import UsernameEditor from '../../components/UsernameEditor';
import LayoutWrapper from '../../components/LayoutWrapper';
import LeadAuditCard from '../../components/LeadAuditCard';
import { StatFilterProvider, StatCardFilter, LeadRowHighlight } from '../../components/StatFilter';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
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

  if (!userRecord || !userRecord.organization) {
    redirect('/onboarding');
  }

  if (!userRecord.organization.niche) {
    redirect('/onboarding');
  }
  const niche = userRecord.organization.niche;
  const serviceLevel = userRecord.organization.serviceLevel || 'FULL_CRM';
  const isScraperOnly = serviceLevel === 'SCRAPER_ONLY';

  const role = userRecord.role;
  const username = userRecord.username || decodedToken.email?.split('@')[0] || 'User';
  const isAdmin = role === 'ADMIN';
  const plan = (userRecord.organization.plan || 'FREE') as 'FREE' | 'PRO' | 'BUSINESS';
  const planLeadsUsed = (userRecord.organization as any).planLeadsUsed ?? 0;
  const planLeadsLimit = (userRecord.organization as any).planLeadsLimit ?? 25;

  const params = await searchParams;
  
  // Strict Row-Level Security: Sales only see their own assigned leads. Admins see all.
  const queryFilter: any = { 
    inPipeline: false,
    organizationId: userRecord.organizationId
  };
  
  if (!isAdmin && username) {
    queryFilter.agent = username;
  }

  const allLeads = await prisma.lead.findMany({
    where: queryFilter,
    orderBy: { createdAt: 'desc' },
  });

  // Extract unique categories
  const categories = [...new Set(allLeads.map((l: any) => l.category).filter(Boolean))] as string[];

  // Filter by category only — scraper is a raw database, no status partitioning
  const selectedCategory = params.category || '';
  const leads = selectedCategory
    ? allLeads.filter((l: any) => l.category === selectedCategory)
    : allLeads;

  // ── Dynamic Customization Engine ──
  const statCards = getStatCards(userRecord.organization);
  const scoringRules = getScoringRules(userRecord.organization);

  function getLeadScore(lead: any): number {
    return computeLeadScore(lead, scoringRules);
  }



  function getScoreColor(score: number): string {
    if (score >= 70) return 'bg-accent text-white shadow-md shadow-accent/20 border-transparent';
    if (score >= 40) return 'bg-surface-badge text-t-primary border-b-muted';
    return 'bg-surface-input text-t-muted border-b-default opacity-70';
  }

  function getScoreLabel(score: number): string {
    if (score >= 70) return 'HOT';
    if (score >= 40) return 'WARM';
    return 'COOL';
  }

  // ── Duplicate Detection ──
  const duplicateMap = new Map<string, number[]>();
  leads.forEach((lead: any) => {
    const keys: string[] = [];
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/[^\d]/g, '').slice(-10);
      if (cleanPhone.length >= 7) keys.push(`p:${cleanPhone}`);
    }
    if (lead.emails) {
      const primaryEmail = lead.emails.split(',')[0].trim().toLowerCase();
      if (primaryEmail) keys.push(`e:${primaryEmail}`);
    }
    keys.forEach(k => {
      if (!duplicateMap.has(k)) duplicateMap.set(k, []);
      duplicateMap.get(k)!.push(lead.id);
    });
  });
  const duplicateIds = new Set<number>();
  duplicateMap.forEach((ids) => {
    if (ids.length > 1) ids.forEach(id => duplicateIds.add(id));
  });

  const totalLeads = leads.length;

  // Build a filter map: stat key -> array of matching lead IDs
  const filterMap = computeFilterMap(statCards.map((c: any) => c.key), leads);

  return (
    <>
      <BfcacheFix />
      <LayoutWrapper username={username} email={decodedToken.email || ''} niche={niche} isAdmin={isAdmin} isScraperOnly={isScraperOnly} hasTeamManagement={userRecord.organization.hasTeamManagement} activePath="/dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10 pb-8 space-y-6 relative font-mono">
        
        <section>
          <SearchForm niche={niche} totalLeads={totalLeads} plan={plan} planLeadsUsed={planLeadsUsed} planLeadsLimit={planLeadsLimit} />
        </section>

        <StatFilterProvider filterMap={filterMap}>
        {/* Stats Grid - Dynamically rendered from org config */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card: any) => (
            <StatCardFilter key={card.key} title={card.label} value={computeStatValue(card.key, leads)} icon={card.icon} filterKey={card.key} />
          ))}
        </section>

        {/* Data Table */}
        <section className="bg-surface-card shadow-lg ring-1 ring-b-default rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-b-divider bg-surface-card flex justify-between items-center">
            <h2 className="text-sm font-bold text-t-primary uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              All Scraped Results
            </h2>
            <div className="flex items-center gap-3">
              <CategoryFilter categories={categories} />
              <ExportButton category={selectedCategory || undefined} plan={plan} />
              <ClearDataButton leadCount={totalLeads} target="new" />
              <span className="text-xs font-semibold text-t-muted bg-surface-badge px-3 py-1 rounded-full border border-b-default">{totalLeads} Results</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-b-divider">
              <thead className="bg-surface-table-stripe">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest">Business</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest hidden sm:table-cell">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest">
                    {niche === 'B2B_SALES' ? 'Corporate Data' : niche === 'REAL_ESTATE' ? 'Brokerage Data' : 'Audit'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-[10px] font-bold text-t-faint uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-surface-card divide-y divide-b-divider-light">
                {leads.map((lead: any, index: number) => (
                  <LeadRowHighlight key={lead.id} leadId={lead.id} index={index}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <a 
                          href={lead.maps_url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title={lead.name}
                          className="text-sm font-bold text-t-primary group-hover:text-accent transition-colors block max-w-[200px] sm:max-w-[250px] lg:max-w-[350px] truncate"
                        >
                          {(() => {
                            const words = lead.name.split(' ');
                            return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : lead.name;
                          })()}
                        </a>
                        {lead.category && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-bg text-accent border border-accent-border tracking-wide uppercase mt-1 w-fit">
                            {lead.category}
                          </span>
                        )}
                        {duplicateIds.has(lead.id) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/25 tracking-wide uppercase mt-1 w-fit">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                            DUPLICATE
                          </span>
                        )}
                        {niche === 'DIGITAL_AGENCY' && lead.cms_type && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-badge text-t-muted border border-b-default tracking-wide uppercase mt-1 w-fit">
                            {lead.cms_type}
                          </span>
                        )}
                        {isAdmin && userRecord.organization.hasTeamManagement && lead.agent && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9.5px] font-black bg-pink-500/10 text-pink-500 border border-pink-500/20 shadow-sm tracking-widest mt-1.5 w-fit uppercase">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {lead.agent}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1 sm:hidden">
                           <span className="text-xs font-medium text-t-muted bg-surface-badge px-2 py-0.5 rounded">{lead.phone ? lead.phone.replace(/[^\d\s\-\+()]/g, '').trim() : 'No Phone'}</span>
                        </div>
                        {lead.rating && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            <span className="text-[11px] text-t-secondary font-medium font-mono">{lead.rating} stars</span>
                            {lead.reviews_count && <span className="text-[11px] text-t-faint font-mono">· {lead.reviews_count} reviews</span>}
                          </div>
                        )}
                        {niche === 'DIGITAL_AGENCY' && (() => {
                          const score = getLeadScore(lead);
                          const label = getScoreLabel(score);
                          const gradient = getScoreColor(score);
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black ${gradient} uppercase tracking-wider`}>
                                {label} {score}
                              </div>
                            </div>
                          );
                        })()}
                        {niche === 'B2B_SALES' && (() => {
                          let pct = 0;
                          if (lead.emails) pct += 25;
                          if (lead.phone) pct += 25;
                          if (lead.website || lead.has_website) pct += 15;
                          if (lead.rating) pct += 10;
                          if (lead.emails && lead.emails.includes(',')) pct += 10;
                          if (lead.category) pct += 15;
                          const color = 'bg-accent';
                          const textColor = 'text-accent';
                          return (
                            <div className="flex items-center gap-2 mt-2 w-full max-w-[140px]" title={`Data completeness: ${pct}%`}>
                              <div className="flex-1 h-1.5 bg-surface-badge rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-[10px] font-black ${textColor} tabular-nums font-mono`}>{pct}%</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 hidden sm:table-cell align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-sm font-semibold text-t-secondary flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-t-ghost shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {lead.phone ? lead.phone.replace(/[^\d\s\-\+()]/g, '').trim() : 'N/A'}
                          {lead.phone && <CopyButton text={lead.phone.replace(/[^\d\s\-\+()]/g, '').trim()} label="phone" />}
                        </div>
                        {lead.emails && (
                          <div className="text-sm text-t-muted font-medium flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 text-t-ghost shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="break-all leading-tight" title={lead.emails}>
                              {[...new Set<string>(lead.emails.split(',').map((e: string) => e.trim().toLowerCase()))].map((email, i) => (
                                <span key={i} className="flex items-center gap-1">{email}<CopyButton text={email} label="email" /></span>
                              ))}
                            </span>
                          </div>
                        )}
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:text-accent-hover font-bold flex items-center gap-2 transition-colors">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Visit Website
                          </a>
                        ) : (
                          <span className="text-sm text-t-ghost font-medium flex items-center gap-2">
                             <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                             No Website
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 align-top">
                      <LeadAuditCard lead={lead} niche={niche} />
                    </td>
                    
                     <td className="px-6 py-4 align-top text-right">
                       <div className="flex flex-col items-end gap-2">
                         {!isScraperOnly ? (
                           <>
                             <SendToCRMButton leadId={lead.id} inPipeline={lead.inPipeline || false} />
                             <DeleteLeadButton leadId={lead.id} />
                             <NotesEditor leadId={lead.id} initialNotes={lead.notes} />
                           </>
                         ) : (
                           <span className="text-xs font-semibold text-t-muted">Raw Data Extracted</span>
                         )}
                       </div>
                    </td>
                  </LeadRowHighlight>
                ))}
                
                {leads.length === 0 && (
                  <tr>
                     <td colSpan={4} className="px-6 py-20 text-center">
                       <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-badge mb-4">
                         <svg className="w-7 h-7 text-t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                       </div>
                       <h3 className="text-base font-bold text-t-primary">No Leads Found</h3>
                       <p className="text-t-muted mt-1 max-w-sm mx-auto text-sm">Use the search tool above to scrape Google Maps and discover leads.</p>
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </StatFilterProvider>
        </div>
      </LayoutWrapper>
    </>
  );
}





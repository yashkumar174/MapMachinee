'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LeadAuditCardProps {
  lead: {
    id: number;
    name: string;
    phone?: string | null;
    emails?: string | null;
    website?: string | null;
    maps_url?: string | null;
    cms_type?: string | null;
    rating?: string | null;
    has_website?: boolean;
    load_time?: number | null;
    mobile_friendly?: boolean;
    has_booking?: boolean;
    category?: string | null;
    auditData?: string | null;
    error?: string | null;
  };
  niche: string;
  scoreFn?: (lead: any) => number;
}

function getSpeedGrade(loadTime: number | null): { grade: string; color: string } {
  if (!loadTime) return { grade: 'N/A', color: 'text-t-ghost' };
  if (loadTime <= 1.5) return { grade: 'A', color: 'text-emerald-400' };
  if (loadTime <= 3.0) return { grade: 'B', color: 'text-t-primary' };
  if (loadTime <= 5.0) return { grade: 'C', color: 'text-amber-400' };
  return { grade: 'F', color: 'text-accent' };
}

function InfoTooltip({ label, tooltip }: { label: string, tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5 relative group/info">
      <span className="text-xs text-t-secondary font-medium">{label}</span>
      <svg className="w-3 h-3 text-t-ghost cursor-help hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/info:block w-max max-w-[200px] bg-surface-header border border-b-divider p-2.5 rounded-lg shadow-xl z-[100] text-[10px] font-medium text-t-secondary whitespace-normal leading-relaxed font-sans">
        {tooltip}
      </div>
    </div>
  );
}

export default function LeadAuditCard({ lead, niche, scoreFn }: LeadAuditCardProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Parse audit data
  let auditParsed: any = null;
  let b2bData: any = null;
  try {
    if (lead.auditData) {
      auditParsed = JSON.parse(lead.auditData);
      if (auditParsed.b2b_data) b2bData = auditParsed.b2b_data;
    }
  } catch (e) {}

  // Compute domain from website
  let domain = '';
  try {
    if (lead.website) {
      domain = new URL(lead.website).hostname.replace('www.', '');
    }
  } catch (e) {
    domain = lead.website || '';
  }

  // Compute pitch-ready score
  let score = 0;
  if (scoreFn) {
    score = scoreFn(lead);
  } else {
    // Simple fallback scoring
    if (!lead.has_website || !lead.website) score += 30;
    if (!lead.mobile_friendly) score += 25;
    if (lead.load_time && lead.load_time > 3) score += 20;
    if (!lead.has_booking) score += 15;
    if (lead.cms_type) score += 10;
  }

  const scoreLabel = score >= 70 ? 'high opportunity' : score >= 40 ? 'moderate opportunity' : 'low opportunity';

  // Determine email status
  const emailList = lead.emails ? [...new Set(lead.emails.split(',').map((e: string) => e.trim().toLowerCase()))].filter(Boolean) : [];
  const hasEmail = emailList.length > 0;

  const { grade: speedGrade, color: speedColor } = getSpeedGrade(lead.load_time ?? null);

  return (
    <div className="relative" ref={ref}>
      {/* Audit trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all font-mono border cursor-pointer ${
          open
            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
            : 'bg-accent/10 text-accent border-accent/20 hover:bg-accent hover:text-white hover:border-accent'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Audit
      </button>

      {/* Full-screen modal overlay */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-surface-header/60 backdrop-blur-md cursor-pointer" 
            onClick={() => setOpen(false)} 
          />

          {/* Card */}
          <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-surface-card border border-b-default rounded-xl shadow-2xl font-mono">
              
              {/* Header with traffic lights */}
              <div className="px-5 py-3 bg-surface-header flex items-center justify-between border-b border-b-divider rounded-t-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 cursor-pointer hover:bg-red-400" onClick={() => setOpen(false)}></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
                </div>
                <span className="text-[10px] text-t-on-dark-muted font-medium tracking-wide uppercase">
                  {domain || lead.name.slice(0, 24)} · audit
                </span>
                <button onClick={() => setOpen(false)} className="text-t-on-dark-muted hover:text-accent transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body — key-value rows */}
              <div className="divide-y divide-b-divider-light">

                {/* Website / LCP */}
                {lead.load_time != null && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="LCP" tooltip="Largest Contentful Paint. Measures loading speed. Good: < 2.5s." />
                    <span className={`text-sm font-bold tabular-nums ${speedColor}`}>
                      {lead.load_time}s
                    </span>
                  </div>
                )}

                {/* CLS - from auditData if available */}
                {auditParsed?.cls != null && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="CLS" tooltip="Cumulative Layout Shift. Measures visual stability. Good: < 0.1." />
                    <span className={`text-sm font-bold tabular-nums ${auditParsed.cls > 0.25 ? 'text-accent' : auditParsed.cls > 0.1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {auditParsed.cls}
                    </span>
                  </div>
                )}

                {/* Mobile */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <InfoTooltip label="Mobile" tooltip="Whether the site is optimized for mobile devices." />
                  <span className={`text-sm font-bold ${lead.mobile_friendly ? 'text-emerald-400' : 'text-accent'}`}>
                    {lead.mobile_friendly ? 'pass' : 'fail'}
                  </span>
                </div>

                {/* Website */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <InfoTooltip label="Website" tooltip="Whether a valid domain was found for this business." />
                  <span className={`text-sm font-bold ${lead.has_website || lead.website ? 'text-emerald-400' : 'text-accent'}`}>
                    {lead.has_website || lead.website ? 'found' : 'none'}
                  </span>
                </div>

                {/* CMS */}
                {lead.cms_type && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="CMS" tooltip="The underlying Content Management System (e.g. WordPress, Webflow)." />
                    <span className="text-sm font-bold text-t-primary">
                      {lead.cms_type}
                    </span>
                  </div>
                )}

                {/* Booking */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <InfoTooltip label="Booking" tooltip="Whether an online booking or calendar link was detected." />
                  <span className={`text-sm font-bold ${lead.has_booking ? 'text-emerald-400' : 'text-t-ghost'}`}>
                    {lead.has_booking ? 'found' : 'none'}
                  </span>
                </div>

                {/* Speed Grade */}
                {lead.load_time != null && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="Speed Grade" tooltip="Overall performance grade based on site load time." />
                    <span className={`text-sm font-black ${speedColor}`}>
                      {speedGrade}
                    </span>
                  </div>
                )}

                {/* Email */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <InfoTooltip label="Email" tooltip="Whether any public contact emails were found for outreach." />
                  <span className={`text-sm font-bold ${hasEmail ? 'text-emerald-400' : 'text-t-ghost'}`}>
                    {hasEmail ? 'verified' : 'none'}
                  </span>
                </div>

                {/* Phone */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <InfoTooltip label="Phone" tooltip="Whether a contact phone number is available." />
                  <span className={`text-sm font-bold ${lead.phone ? 'text-emerald-400' : 'text-t-ghost'}`}>
                    {lead.phone ? 'found' : 'none'}
                  </span>
                </div>

                {/* B2B specific rows */}
                {b2bData?.employee_count && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="Employees" tooltip="Estimated company size based on B2B data sources." />
                    <span className="text-sm font-bold text-t-primary">{b2bData.employee_count}</span>
                  </div>
                )}
                {b2bData?.industry && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="Industry" tooltip="Primary B2B industry category." />
                    <span className="text-sm font-bold text-t-primary truncate max-w-[180px]">{b2bData.industry}</span>
                  </div>
                )}
                {b2bData?.linkedin_url && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="LinkedIn" tooltip="Link to the company's verified LinkedIn profile." />
                    <a href={b2bData.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#0077b5] hover:underline">
                      profile →
                    </a>
                  </div>
                )}

                {/* Rating */}
                {lead.rating && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <InfoTooltip label="Rating" tooltip="Average star rating on Google Maps." />
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      {lead.rating}
                    </span>
                  </div>
                )}
              </div>

              {/* Pitch-Ready Score footer */}
              {niche === 'DIGITAL_AGENCY' && (
                <div className="px-5 py-4 bg-surface-badge border-t border-b-divider">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-t-primary uppercase tracking-widest">Pitch-Ready Score</p>
                      <p className="text-[10px] text-t-muted mt-0.5">{scoreLabel}</p>
                    </div>
                    <span className={`text-3xl font-black tabular-nums ${score >= 60 ? 'text-accent' : score >= 30 ? 'text-amber-400' : 'text-t-muted'}`}>
                      {score}
                    </span>
                  </div>
                </div>
              )}
              {/* Footer */}
              <div className="px-5 py-4 bg-surface-header/50 border-t border-b-divider flex justify-end rounded-b-xl">
                <button onClick={() => setOpen(false)} className="px-5 py-1.5 bg-surface-card hover:bg-surface-card-hover border border-b-default text-t-primary text-xs font-bold rounded shadow-sm transition-colors uppercase tracking-widest">
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

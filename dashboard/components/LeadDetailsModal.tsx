import { X, Globe, MapPin, Smartphone, Zap, CalendarCheck, Clock, CheckCircle2, User, Phone, Mail, FileText, Briefcase, Loader2, Send, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PipelineLead } from './PipelineList';
import NotesEditor from './NotesEditor';
import UpgradeModal from './UpgradeModal';

type PlanKey = 'FREE' | 'PRO' | 'BUSINESS';

interface Props {
  lead: PipelineLead;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  canPrev?: boolean;
  plan?: PlanKey;
}

function getSpeedGrade(loadTime: number | null | undefined): { grade: string; color: string } {
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

export function LeadDetailsModal({ lead, onClose, onNext, onPrev, canNext, canPrev, plan = 'FREE' }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftPitch, setDraftPitch] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const coldEmailLocked = plan === 'FREE';

  // Domain extraction
  let domain = '';
  try {
    if (lead.website) {
      domain = new URL(lead.website).hostname.replace('www.', '');
    }
  } catch (e) {
    domain = lead.website || '';
  }

  // Speed grade
  const { grade: speedGrade, color: speedColor } = getSpeedGrade(lead.load_time);

  // Email status
  const emailList = lead.emails ? [...new Set(lead.emails.split(',').map((e: string) => e.trim().toLowerCase()))].filter(Boolean) : [];
  const hasEmail = emailList.length > 0;

  // Pitch-ready score (simple fallback)
  let score = 0;
  if (!lead.has_website || !lead.website) score += 30;
  if (!lead.mobile_friendly) score += 25;
  if (lead.load_time && lead.load_time > 3) score += 20;
  if (!lead.has_booking) score += 15;
  if (lead.cms_type) score += 10;
  const scoreLabel = score >= 70 ? 'high opportunity' : score >= 40 ? 'moderate opportunity' : 'low opportunity';

  // --- Keyboard Speed-Run Mode ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text area or input
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
      
      if (e.key === 'ArrowRight' && canNext && onNext) onNext();
      if (e.key === 'ArrowLeft' && canPrev && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNext, canPrev, onNext, onPrev]);

  // --- 1-Click Cold Email Generator (AI Powered) ---
  const handleGeneratePitch = async () => {
    if (coldEmailLocked) {
      setShowUpgrade(true);
      return;
    }
    setIsGenerating(true);
    setDraftPitch(null);
    try {
      const res = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setDraftPitch(data.pitch);
    } catch (err) {
      console.error(err);
      alert('Failed to generate pitch. Check API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 1-Click Follow-Up Generator ---
  const handleGenerateFollowUp = () => {
    const subject = encodeURIComponent(`Following up on our conversation`);
    let bodyLines = [
      `Hi there,`, 
      ``, 
      `Just wanted to float this to the top of your inbox. We had previously looked at ${domain || 'your website'} together and I wanted to see if you had any time this week to connect?`,
      ``,
      `As a reminder, I'd love to help you fix the technical roadblocks throttling your mobile traffic.`,
      ``, 
      `Let me know!`, 
      ``, 
      `Best,`, 
      `- Your local developer`
    ];
    
    const body = encodeURIComponent(bodyLines.join('\n'));
    const targetEmail = lead.emails ? lead.emails.split(',')[0].trim() : '';
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} currentPlan={plan} />
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-header/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-surface-page rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-b-default">
        
        {/* Header Ribbon */}
        <div className="bg-surface-header p-5 sm:px-6 flex items-start justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-3 h-3 rounded-full bg-red-400/80 cursor-pointer hover:bg-red-400 transition-colors" onClick={onClose}></span>
              <span className="w-3 h-3 rounded-full bg-amber-400/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400/80"></span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-t-on-dark truncate mb-1">{lead.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-t-on-dark-muted">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                {lead.status}
              </span>
              {lead.category && (
                <>
                  <span className="opacity-30">•</span>
                  <span className="text-accent-hover">{lead.category}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 -m-1.5 rounded-lg bg-surface-input hover:bg-surface-input-focus text-t-on-dark-muted hover:text-t-on-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-6 text-t-primary">
          
          {/* Main Grid split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Contact & Basic Info */}
            <div className="space-y-6">
              <section className="bg-surface-card rounded-xl p-4 border border-b-default shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-t-faint mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Contact Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-accent mt-0.5 opacity-60" />
                    <span className="text-sm font-semibold">{lead.phone ? lead.phone.replace(/[^\d\s\-\+()]/g, '').trim() : '—'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-accent mt-0.5 opacity-60" />
                    <span className="text-sm font-semibold break-words flex flex-col items-start gap-2">
                      {lead.emails || '—'}
                      {lead.emails && (
                        ['New Leads', 'New Lead', 'new'].includes(lead.status) ? (
                          <div className="flex flex-col gap-2 w-full mt-1">
                            <button
                              onClick={handleGeneratePitch}
                              disabled={isGenerating}
                              title={coldEmailLocked ? 'Cold Email AI is a Pro feature — click to upgrade' : 'Generate AI pitch'}
                              className={`inline-flex items-center w-fit gap-1.5 px-2.5 py-1.5 shadow-sm rounded text-[10px] font-black uppercase tracking-widest transition-all scale-95 origin-left disabled:opacity-50 ${coldEmailLocked ? 'bg-surface-badge text-t-muted border border-b-default' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'}`}
                            >
                              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : coldEmailLocked ? <Lock className="w-3 h-3 text-accent" /> : <Zap className="w-3 h-3" />}
                              {isGenerating ? 'Writing...' : coldEmailLocked ? 'Cold Email · Pro' : '1-Click Cold Email'}
                            </button>
                            {/* AI Generated Draft Box is now overlaid full-screen below */}
                          </div>
                        ) : (
                          <button 
                            onClick={handleGenerateFollowUp}
                            className="inline-flex items-center w-fit gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 shadow-sm rounded text-[10px] font-black uppercase tracking-widest transition-colors scale-95 origin-left"
                          >
                            <Zap className="w-3 h-3" /> 1-Click Follow-Up
                          </button>
                        )
                      )}
                    </span>
                  </div>
                  {lead.maps_url && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-accent mt-0.5 opacity-60" />
                      <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-t-primary hover:text-accent underline decoration-t-ghost hover:decoration-accent/60 underline-offset-2 transition-all truncate">
                        View on Google Maps
                      </a>
                    </div>
                  )}
                  {lead.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-accent mt-0.5 opacity-60" />
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-t-primary hover:text-accent underline decoration-t-ghost hover:decoration-accent/60 underline-offset-2 transition-all truncate">
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* General Notes */}
              <section className="bg-surface-card rounded-xl p-4 border border-b-default shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-t-faint mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> General Notes
                </h3>
                <NotesEditor
                  leadId={lead.id}
                  initialNotes={lead.notes || null}
                  variant="expanded"
                  onSave={(newNotes) => {
                    // Updating locally in the modal
                    lead.notes = newNotes;
                  }}
                />
              </section>
            </div>

            {/* Right Column: Audit Card (row-based design) */}
            <div className="space-y-6">
              
              {/* Audit Card — matching scraper dashboard design */}
              <section className="bg-surface-card rounded-xl border border-b-default shadow-sm font-mono">
                
                {/* Audit Header */}
                <div className="px-5 py-3 bg-surface-header flex items-center justify-center border-b border-b-divider rounded-t-xl">
                  <span className="text-[10px] text-t-on-dark-muted font-medium tracking-wide uppercase">
                    {domain || lead.name.slice(0, 24)} · audit
                  </span>
                </div>

                {/* Key-value audit rows */}
                <div className="divide-y divide-b-divider-light">

                  {/* LCP */}
                  {lead.load_time != null && (
                    <div className="px-5 py-3.5 flex items-center justify-between">
                      <InfoTooltip label="LCP" tooltip="Largest Contentful Paint. Measures loading speed. Good: < 2.5s." />
                      <span className={`text-sm font-bold tabular-nums ${speedColor}`}>
                        {lead.load_time}s
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
                <div className="px-5 py-4 bg-surface-badge border-t border-b-divider rounded-b-xl">
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
              </section>

            </div>
          </div>
          
        </div>
      </div>

      {/* Full-Screen Focus Mode AI Editor Overlay */}
      {draftPitch !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDraftPitch(null)} />
          <div className="relative w-full max-w-2xl bg-surface-page border border-emerald-500/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setDraftPitch(null)}
              className="absolute top-4 right-4 text-t-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm text-emerald-500 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> AI Draft Complete
            </h3>
            <textarea
              value={draftPitch}
              onChange={(e) => setDraftPitch(e.target.value)}
              className="w-full h-[300px] sm:h-[400px] text-sm bg-surface-input border border-b-default rounded-xl p-4 text-t-primary focus:outline-none focus:border-accent font-medium leading-relaxed resize-none no-scrollbar shadow-inner"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDraftPitch(null)}
                className="px-4 py-2 text-xs font-bold text-t-secondary hover:text-white transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Quick question about ${domain || 'your website'}`);
                  const body = encodeURIComponent(draftPitch);
                  const targetEmail = lead.emails ? lead.emails.split(',')[0].trim() : '';
                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${targetEmail}&su=${subject}&body=${body}`;
                  window.open(gmailUrl, '_blank');
                }}
                className="inline-flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5"
              >
                <Send className="w-4 h-4" /> Send via Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


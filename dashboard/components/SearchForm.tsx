'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './scraper-overlay.css';
import UpgradeModal from './UpgradeModal';

const SCANNER_PINS = [
  { x: 12, y: 30, d: '0s' },
  { x: 26, y: 62, d: '0.4s' },
  { x: 44, y: 22, d: '0.8s' },
  { x: 58, y: 48, d: '1.2s' },
  { x: 72, y: 28, d: '1.6s' },
  { x: 84, y: 60, d: '2.0s' },
  { x: 38, y: 72, d: '2.4s' },
  { x: 18, y: 68, d: '2.8s' },
];

interface SearchFormProps {
  niche?: string;
  totalLeads?: number;
  plan?: 'FREE' | 'PRO' | 'BUSINESS';
  planLeadsUsed?: number;
  planLeadsLimit?: number;
}

export default function SearchForm({ niche, totalLeads = 0, plan = 'FREE', planLeadsUsed = 0, planLeadsLimit = 25 }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [max, setMax] = useState<number | ''>(10);
  const [maxReviews, setMaxReviews] = useState('');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollElapsed, setPollElapsed] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const leadsRemaining = Math.max(0, planLeadsLimit - planLeadsUsed);
  const quotaExhausted = leadsRemaining <= 0;
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetLeadCountRef = useRef<number>(0);
  const router = useRouter();

  const POLL_INTERVAL_MS = 5000;   // refresh every 5 seconds
  const POLL_MAX_MS = 5 * 60 * 1000; // stop after 5 minutes

  const stopPolling = useCallback((closeOverlay: boolean = true) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    setPolling(false);
    setPollElapsed(0);
    if (closeOverlay) {
      setShowOverlay(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling(false); // clear any existing poll, but DON'T dismiss overlay
    setPolling(true);
    setPollElapsed(0);

    const startTime = Date.now();

    // Refresh the server component every POLL_INTERVAL_MS
    pollingRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= POLL_MAX_MS) {
        stopPolling();
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    // Update the elapsed counter every second for the UI
    elapsedRef.current = setInterval(() => {
      setPollElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, [router, stopPolling]);

  const prevLeadsRef = useRef(totalLeads);

  // Auto-stop polling when we hit the target lead count or receive ANY new leads
  useEffect(() => {
    if (polling) {
      if (totalLeads > prevLeadsRef.current || (targetLeadCountRef.current > 0 && totalLeads >= targetLeadCountRef.current)) {
        // Background job finished! Output batch received. Fast-forward to 100%
        setActiveStep(SCRAPE_STEPS.length);
        
        // Show 100% completed status briefly before dismissing
        setTimeout(() => stopPolling(true), 1500);
      }
    }
    prevLeadsRef.current = totalLeads;
  }, [totalLeads, polling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const SCRAPE_STEPS = [
    { label: 'Initializing Playwright engine', delay: 0 },
    { label: 'Launching headless browser', delay: 3000 },
    { label: `Searching Google Maps for "${scrapeQuery || '...'}"`, delay: 7000 },
    { label: 'Extracting business listings', delay: 15000 },
    { label: 'Parsing contact information', delay: 30000 },
    { label: 'Auditing websites with Lighthouse', delay: 60000 },
    { label: 'Enriching lead data', delay: 100000 },
    { label: 'Uploading results to database', delay: 140000 },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [scrapeElapsed, setScrapeElapsed] = useState(0);
  const scrapeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Start/stop the scraping step animation
  useEffect(() => {
    if (showOverlay) {
      setActiveStep(0);
      setScrapeElapsed(0);
      
      // Elapsed counter
      const start = Date.now();
      scrapeTimerRef.current = setInterval(() => {
        setScrapeElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);

      // Step progression timers
      SCRAPE_STEPS.forEach((step, i) => {
        if (i > 0) {
          const t = setTimeout(() => {
             setActiveStep(prev => prev < SCRAPE_STEPS.length ? Math.max(prev, i) : prev);
          }, step.delay);
          stepTimersRef.current.push(t);
        }
      });
      
      // Let the animation reach the final step, but DO NOT close the overlay!
      // The overlay will be closed automatically by the useEffect below when 
      // polling detects an increase in totalLeads from the database.
      const tEnd = setTimeout(() => {
        setActiveStep(SCRAPE_STEPS.length - 1); // Keep it highlighted on the last step
      }, SCRAPE_STEPS[SCRAPE_STEPS.length - 1].delay);
      stepTimersRef.current.push(tEnd);
    } else {
      // Cleanup
      if (scrapeTimerRef.current) clearInterval(scrapeTimerRef.current);
      stepTimersRef.current.forEach(t => clearTimeout(t));
      stepTimersRef.current = [];
    }
    return () => {
      if (scrapeTimerRef.current) clearInterval(scrapeTimerRef.current);
      stepTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, [showOverlay]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (quotaExhausted) {
      setShowUpgrade(true);
      return;
    }

    setScrapeQuery(query);
    setShowOverlay(true);
    setLoading(true);
    try {
      const payload: any = { query, max: Number(max) || 1 };
      if (maxReviews) payload.max_reviews = Number(maxReviews);

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 402 || data?.code === 'QUOTA_EXCEEDED') {
        setShowOverlay(false);
        setShowUpgrade(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || `Scrape failed (${res.status})`);
      }

      setQuery('');

      // Store the exact target we expect so polling stops automatically
      targetLeadCountRef.current = totalLeads + Math.min(max, leadsRemaining);

      // Make sure the dashboard views the new category being scraped
      // This ensures totalLeads accurately tracks the incoming results!
      router.push(`/dashboard?category=${encodeURIComponent(query)}`);

      // Start auto-polling so leads appear without manual refresh
      startPolling();
    } catch (err: any) {
      console.error(err);
      setShowOverlay(false);
      alert(err.message || 'Error running scraper. Check terminal console for details.');
    } finally {
      setLoading(false);
    }
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
  };

  const maxNum = Number(max) || 1;
  const estimatedSeconds = Math.ceil(maxNum * (3 + (maxReviews ? Math.min(Number(maxReviews), 100) * 0.1 : 0)));
  const estimatedTimeText = estimatedSeconds < 60 
    ? `~${estimatedSeconds} sec` 
    : `~${Math.floor(estimatedSeconds / 60)} min ${estimatedSeconds % 60} sec`;

  return (
    <>
    <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} currentPlan={plan} />
    {/* ── Full-screen Scraping Overlay ── */}
    {showOverlay && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Heavy blur backdrop covering the whole screen */}
        <div className="absolute inset-0 bg-background/75 backdrop-blur-2xl" />

        {/* Modal */}
        <div className="so-modal relative z-10 w-full max-w-xl">
          <div className="bg-surface-card border border-b-muted rounded-2xl shadow-2xl overflow-hidden">
            {/* Chrome */}
            <div className="px-4 py-3 bg-surface-header flex items-center justify-between border-b border-b-divider">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400/80"></span>
              </div>
              <span className="text-[11px] text-t-on-dark-muted font-mono font-medium tracking-wide">
                mapmachine — scraper
              </span>
              <span className="text-[10px] text-accent font-mono font-bold tabular-nums">
                {formatElapsed(scrapeElapsed)}
              </span>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 font-mono">
              {/* Central animated scanner */}
              <div className="so-map">
                <div className="so-query">
                  <span className="so-query-prompt">&gt;</span>
                  <span className="so-query-text">{scrapeQuery || '...'}</span>
                  <span className="so-caret" />
                </div>
                <div className="so-scan" />
                {SCANNER_PINS.map((p, i) => (
                  <div
                    key={i}
                    className="so-pin"
                    style={{ left: p.x + '%', top: p.y + '%', animationDelay: p.d }}
                  />
                ))}
                <div className="so-counter">
                  <span className="so-counter-dot" />
                  scanning · {max} leads
                </div>
              </div>

              {/* Step timeline */}
              <div className="space-y-1.5">
                {SCRAPE_STEPS.map((step, i) => {
                  const isCurrent = i === activeStep;
                  const isDone = i < activeStep;
                  const isPending = i > activeStep;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 py-0.5 transition-all duration-300 ${
                        isPending ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      {/* Indicator */}
                      <span className="w-4 h-4 shrink-0 mt-0.5 relative flex items-center justify-center">
                        {isDone && (
                          <span className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                        {isCurrent && (
                          <>
                            <span className="absolute w-4 h-4 rounded-full bg-accent/30 animate-ping" />
                            <span className="w-2 h-2 rounded-full bg-accent" />
                          </>
                        )}
                        {isPending && (
                          <span className="w-3 h-3 rounded-full border border-dashed border-t-faint/60" />
                        )}
                      </span>

                      {/* Step text */}
                      <span
                        className={`text-[11px] ${
                          isDone
                            ? 'text-t-muted'
                            : isCurrent
                            ? 'text-t-primary font-semibold'
                            : 'text-t-faint'
                        }`}
                      >
                        <span className="text-t-faint/70 mr-2 tabular-nums">
                          [{String(i + 1).padStart(2, '0')}]
                        </span>
                        {step.label}
                        {isCurrent && (
                          <span className="animate-pulse ml-1 text-accent">█</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress */}
              <div className="pt-4 border-t border-b-divider">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-t-faint uppercase tracking-widest">
                    Progress
                  </span>
                  <span className="text-[10px] text-accent font-bold tabular-nums">
                    {activeStep >= SCRAPE_STEPS.length
                      ? '100'
                      : Math.min(Math.round(((activeStep + 1) / SCRAPE_STEPS.length) * 90), 90)}%
                  </span>
                </div>
                <div className="h-1.5 bg-surface-badge rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${activeStep >= SCRAPE_STEPS.length
                        ? 100
                        : Math.min(((activeStep + 1) / SCRAPE_STEPS.length) * 90, 90)}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-t-faint font-mono tabular-nums">
                    {formatElapsed(scrapeElapsed)} elapsed
                  </span>
                  <button
                    onClick={() => setShowOverlay(false)}
                    className="text-[10px] text-t-faint hover:text-accent transition-colors uppercase tracking-widest cursor-pointer font-mono"
                  >
                    Dismiss ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="bg-surface-card border border-b-default rounded-xl shadow-lg overflow-hidden relative">
      <div className="px-6 py-3 bg-surface-header flex justify-between items-center font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400/80"></span>
          </div>
        </div>
        <span className="text-[11px] text-t-on-dark-muted font-medium tracking-wide">app.mapmachine.run / directory</span>
        <div className="hidden sm:flex items-center gap-2">
           {polling ? (
             <button
               onClick={() => stopPolling()}
               className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold text-accent border border-accent/30 uppercase tracking-widest hover:bg-accent/10 transition-colors cursor-pointer font-mono"
             >
               <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
               Scanning… {formatElapsed(pollElapsed)}
               <svg className="w-3 h-3 ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           ) : (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold text-accent border border-accent/30 uppercase tracking-widest font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                live
             </span>
           )}
        </div>
      </div>

      {/* Mobile polling indicator */}
      {polling && (
        <div className="sm:hidden px-6 py-2 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            Scanning… {formatElapsed(pollElapsed)}
          </span>
          <button onClick={() => stopPolling()} className="text-[10px] font-bold text-accent/70 hover:text-accent uppercase tracking-widest">
            Stop
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="p-6 flex flex-col gap-4 bg-surface-card">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end w-full">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-t-faint uppercase tracking-widest mb-1.5 ml-1">Niche & Location</label>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Roofers in Austin, Texas" 
              className="w-full px-4 py-3 bg-surface-input border border-b-muted rounded-lg focus:bg-surface-input-focus focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-t-primary text-sm font-semibold placeholder:text-t-ghost"
              required
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-[10px] font-bold text-t-faint uppercase tracking-widest mb-1.5 ml-1">Max Leads</label>
            <input 
              type="number" 
              value={max}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') setMax('');
                else setMax(Math.min(50, Number(val)));
              }}
              onBlur={() => {
                if (max === '' || Number(max) < 1) setMax(1);
              }}
              min="1"
              max="50"
              className="w-full px-4 py-3 bg-surface-input border border-b-muted rounded-lg focus:bg-surface-input-focus focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-t-primary text-sm font-bold font-mono text-center appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-[10px] font-bold text-t-faint uppercase tracking-widest mb-1.5 ml-1">Max Reviews</label>
            <input 
              type="number" 
              value={maxReviews}
              onChange={(e) => setMaxReviews(e.target.value)}
              placeholder="e.g. 50"
              min="1"
              className="w-full px-4 py-3 bg-surface-input border border-b-muted rounded-lg focus:bg-surface-input-focus focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-t-primary text-sm font-bold font-mono text-center placeholder:font-normal placeholder:text-t-ghost appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <span className={`text-[10px] font-bold uppercase tracking-widest tabular-nums font-mono ${quotaExhausted ? 'text-red-500' : leadsRemaining <= Math.max(5, Math.floor(planLeadsLimit * 0.1)) ? 'text-amber-500' : 'text-t-muted'}`}>
              {leadsRemaining}/{planLeadsLimit} leads left
            </span>
            {quotaExhausted ? (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="w-full md:w-auto h-[46px] px-8 bg-accent rounded-lg shadow-md text-sm font-bold text-white hover:bg-accent-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2 min-w-[220px] uppercase tracking-wider"
              >
                Upgrade to continue scraping
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto h-[46px] px-8 bg-accent rounded-lg shadow-md text-sm font-bold text-white hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 min-w-[160px] uppercase tracking-wider"
              >
                Search
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-t-faint tracking-widest uppercase">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Estimated Scrape Time: <span className="text-accent font-black tracking-wider ml-1">{estimatedTimeText}</span> 
          <span className="text-t-muted/40 ml-1 text-[9px]"> (based on dataset depth)</span>
        </div>
      </form>
    </div>
    </>
  );
}

'use client';

import { useEffect, useState, useRef, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './landing.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Patch anchor links for lenis smooth scroll
    const anchors = document.querySelectorAll('a[href^="#"]');
    const handleAnchorClick = (e: Event) => {
      e.preventDefault();
      const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
      if (targetId && targetId !== '#') {
        const target = document.querySelector(targetId) as HTMLElement;
        if (target) {
          lenis.scrollTo(target);
        }
      } else if (targetId === '#top' || targetId === '#') {
        lenis.scrollTo(0);
      }
    };

    anchors.forEach(anchor => anchor.addEventListener('click', handleAnchorClick));

    return () => {
      anchors.forEach(anchor => anchor.removeEventListener('click', handleAnchorClick));
      lenis.destroy();
    };
  }, []);
}

type Theme = 'dark' | 'light';

type LogLine = { t: string; tag: string; msg: string; cls?: 'ok' | 'warn' | 'err' };

const LOG_SCRIPT: LogLine[] = [
  { t: '[00:01]', tag: '→',       msg: 'Query accepted: "dental clinics in Chicago"' },
  { t: '[00:02]', tag: 'scrape',  msg: 'Spawning Playwright → maps.google.com' },
  { t: '[00:04]', tag: 'scrape',  msg: 'Page 1/7 — found 20 listings' },
  { t: '[00:07]', tag: 'enrich',  msg: 'Brightside Dental → Hunter.io lookup…' },
  { t: '[00:08]', tag: 'enrich',  msg: 'hello@brightsidedental.com  confidence 94%', cls: 'ok' },
  { t: '[00:09]', tag: 'audit',   msg: 'LCP 4.2s  CLS 0.31  TBT 980ms', cls: 'warn' },
  { t: '[00:10]', tag: 'audit',   msg: 'CMS detected: WordPress 5.9 (outdated)', cls: 'warn' },
  { t: '[00:12]', tag: 'dedupe',  msg: 'Phone +1-312-555-0131 matches 2 listings', cls: 'err' },
  { t: '[00:14]', tag: '→',       msg: '12 qualified leads → "Web & SEO Agency" board' },
  { t: '[00:15]', tag: 'done',    msg: 'Run complete. 7m 42s · 127 enriched · 4 flagged' },
];

export function useCursor() {
  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) return;
    const dot = document.getElementById('mm-cursor-dot');
    const ring = document.getElementById('mm-cursor-ring');
    if (!dot || !ring) return;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    };
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('mousemove', onMove);

    const hoverSelector = 'a, button, .mm-step, .mm-problem-card, input, textarea, select';
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(hoverSelector)) ring.classList.add('hover');
    };
    const onOut = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(hoverSelector)) ring.classList.remove('hover');
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.mm-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in');
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function LogoMark() {
  return (
    <span className="mm-logo-mark">
      <span className="mm-logo-pin" />
    </span>
  );
}

function Nav({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <nav className="mm-nav">
      <div className="mm-shell mm-nav-inner">
        <Link href="#top" className="mm-logo">
          <LogoMark />
          MapMachine
        </Link>
        <div className="mm-nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="mm-nav-cta">
          <button className="mm-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            )}
          </button>
          <Link href="/login" className="mm-btn mm-btn-ghost">Sign in</Link>
          <Link href="/login" className="mm-btn mm-btn-primary">Start free →</Link>
        </div>
      </div>
    </nav>
  );
}

function LiveConsole() {
  const [lines, setLines] = useState<LogLine[]>([]);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setLines((prev) => {
        const next = [...prev, LOG_SCRIPT[i % LOG_SCRIPT.length]];
        if (next.length > 10) next.shift();
        return next;
      });
      i += 1;
      if (i > LOG_SCRIPT.length * 3) clearInterval(id);
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mm-console mm-reveal">
      <div className="mm-console-head">
        <div className="mm-dots"><span /><span /><span /></div>
        <span style={{ marginLeft: 8 }}>mapmachine.run — live</span>
        <span style={{ marginLeft: 'auto', color: 'var(--mm-accent)' }}>● RUNNING</span>
      </div>
      <div className="mm-console-body">
        {lines.map((l, idx) => (
          <div className="mm-log-line" key={idx}>
            <span className="mm-log-time">{l.t}</span>
            <span className={`mm-log-tag ${l.cls ?? ''}`}>{l.tag}</span>
            <span className="mm-log-msg">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="mm-hero" id="top">
      <div className="mm-hero-bg" />
      <div className="mm-shell mm-hero-grid">
        <div>
          <div className="mm-hero-eyebrow mm-reveal">
            <span className="mm-dot" />
            LOCAL PROSPECTING · BUILT FOR CLOSERS
          </div>
          <h1 className="mm-reveal">
            Type a query.<br />
            Get <em>closable</em> leads.<br />
            Skip the lists.
          </h1>
          <p className="mm-lead mm-reveal">
            MapMachine scrapes Google Maps live, verifies every email, audits every website, and drops qualified
            leads into a CRM that actually fits your niche.
          </p>
          <div className="mm-hero-ctas mm-reveal">
            <Link href="/register" className="mm-btn mm-btn-primary">Start prospecting — free →</Link>
          </div>
          <div className="mm-hero-meta mm-reveal">
            <span><strong>Live data</strong>, not lists</span>
            <span>·</span>
            <span><strong>Built for</strong> modern closers</span>
          </div>
        </div>
        <LiveConsole />
      </div>
    </section>
  );
}

function Niches() {
  const sectors = [
    {
      id: '01',
      title: 'Web & SEO Agencies',
      about: 'Target local businesses with outdated websites, poor SEO, or failing performance metrics.',
      help: 'We scrape Google Maps and run our tech footprint auditor in parallel. Instantly surface high-ticket prospects who are failing Core Web Vitals or running on outdated CMS platforms, giving you the perfect pitch.'
    },
    {
      id: '02',
      title: 'Real Estate Brokers',
      about: 'Find off-market commercial properties or actively growing local businesses to lease spaces.',
      help: 'Harvest massive local directories of specific business types. We automatically enrich them with direct owner phone numbers and verified decision-maker emails so you can easily skip the gatekeepers.'
    },
    {
      id: '03',
      title: 'B2B Sales Teams',
      about: 'High-volume outbound prospecting across hyper-specific localized and regional niches.',
      help: 'Turn a simple query like "HVAC companies in Texas" into a fresh, pitch-ready CRM board. Stop buying stale, recycled lead databases and generate proprietary lead lists with 95%+ accurate contact intel.'
    }
  ];

  return (
    <section className="mm-block" id="sectors" style={{ borderTop: '1px solid var(--mm-line)' }}>
      <div className="mm-shell">
        <div className="mm-section-label mm-reveal">Who we serve</div>
        <h2 className="mm-section-title mm-reveal">Built for the pipelines that actually <em>close</em>.</h2>
        
        <div className="mm-sector-list">
          {sectors.map(s => (
            <div key={s.id} className="mm-sector-row mm-reveal">
              <div className="mm-sector-left">
                <div className="mm-sector-num">{s.id} // SEC</div>
                <h3 className="mm-sector-title">{s.title}</h3>
              </div>
              <div className="mm-sector-right">
                <p className="mm-sector-use"><strong>The Use Case:</strong> {s.about}</p>
                <p className="mm-sector-help">
                  <strong style={{ color: 'var(--mm-accent)', fontWeight: 500 }}>How MapMachine Helps:</strong> <br/>{s.help}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const cards = [
    {
      num: '01',
      title: 'Lead lists are stale before you buy them',
      body: 'You pay for a spreadsheet of 10,000 rows. Half the emails bounce. A third of the numbers are disconnected. You email people who closed two years ago.',
      fix: 'MapMachine scrapes live — every run is fresh',
    },
    {
      num: '02',
      title: 'Enrichment lives in six different tabs',
      body: 'Copy a name. Paste into Hunter. Run PageSpeed. Open Wappalyzer. Check LinkedIn. Back to the sheet. Repeat 400 times. Your day is gone.',
      fix: 'All enrichment runs in parallel, automatically',
    },
    {
      num: '03',
      title: 'Generic CRMs were not built for your niche',
      body: "Salesforce doesn't care that the lead's Core Web Vitals are in the red. HubSpot won't surface the CMS. You lose the pitch because the pitch is buried.",
      fix: 'Directory cards adapt to what you actually sell',
    },
  ];
  return (
    <section className="mm-block">
      <div className="mm-shell">
        <div className="mm-section-label mm-reveal">The problem</div>
        <h2 className="mm-section-title mm-reveal">Prospecting is broken. <em>Everyone</em> knows it. Nobody fixed it.</h2>
        <p className="mm-section-sub mm-reveal">Three failures, stacked on top of each other, that quietly burn your week.</p>
        <div className="mm-problem-grid">
          {cards.map((c) => (
            <div key={c.num} className="mm-problem-card mm-reveal">
              <div className="mm-problem-num">{c.num} / 03</div>
              <h3 className="mm-problem-title">{c.title}</h3>
              <p className="mm-problem-body">{c.body}</p>
              <div className="mm-problem-fix">→ {c.fix}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'center center',
        end: '+=2000',
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          let next = 0;
          if (self.progress >= 0.66) next = 2;
          else if (self.progress >= 0.33) next = 1;

          setActive((curr) => {
            if (curr !== next) return next;
            return curr;
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const steps = [
    { title: 'Harvest', desc: 'Type plain-English queries — "wedding photographers in Austin", "hvac companies zip 10001". Playwright scrapes Google Maps live, not a cached list.' },
    { title: 'Investigate', desc: 'Every lead runs through Hunter, Apollo, Lighthouse, and our tech-stack fingerprinter in parallel. Emails verified, sites audited, duplicates flagged.' },
    { title: 'Close', desc: 'Qualified leads land in a directory tuned to your niche. Update status from a dropdown, dial, close. No spreadsheet spelunking, no tab graveyards.' },
  ];

  const pins = [
    { x: 20, y: 35 }, { x: 60, y: 20 }, { x: 75, y: 55 },
    { x: 35, y: 70 }, { x: 85, y: 30 }, { x: 15, y: 80 },
    { x: 55, y: 65 },
  ];

  return (
    <section className="mm-block" id="how" ref={sectionRef}>
      <div className="mm-shell">
        <div className="mm-section-label mm-reveal">How it works</div>
        <h2 className="mm-section-title mm-reveal">From query to <em>closed</em> in three stages.</h2>
        <div className="mm-how">
          <div className="mm-steps">
            {steps.map((s, i) => (
              <button
                type="button"
                key={i}
                className={`mm-step ${active === i ? 'active' : ''}`}
                onClick={() => setActive(i)}
              >
                <div className="mm-step-num">0{i + 1} / 03</div>
                <div>
                  <h3 className="mm-step-title">{s.title}</h3>
                  <div className="mm-step-detail">
                    <p className="mm-step-desc">{s.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mm-how-visual">
            <div className={`mm-how-stage ${active === 0 ? 'on' : ''}`}>
              <div className="mm-map-viz">
                <div className="mm-map-query">
                  &quot;dental clinics in Chicago&quot;<span className="mm-caret" />
                </div>
                <div className="mm-map-scan" />
                {active === 0 && pins.map((p, i) => (
                  <div
                    key={i}
                    className="mm-map-pin"
                    style={{ left: p.x + '%', top: p.y + '%', animationDelay: i * 0.2 + 's' }}
                  />
                ))}
              </div>
            </div>
            <div className={`mm-how-stage ${active === 1 ? 'on' : ''}`}>
              <div className="mm-audit-box">
                <div style={{ fontFamily: 'var(--mm-mono)', fontSize: 11, color: 'var(--mm-fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  brightsidedental.com · audit
                </div>
                <div className="mm-audit-row"><span className="mm-audit-key">LCP</span><span className="mm-audit-val bad">4.2s</span></div>
                <div className="mm-audit-row"><span className="mm-audit-key">CLS</span><span className="mm-audit-val bad">0.31</span></div>
                <div className="mm-audit-row"><span className="mm-audit-key">Mobile</span><span className="mm-audit-val bad">fail</span></div>
                <div className="mm-audit-row"><span className="mm-audit-key">CMS</span><span className="mm-audit-val">WP 5.9</span></div>
                <div className="mm-audit-row"><span className="mm-audit-key">Email</span><span className="mm-audit-val ok">verified</span></div>
                <div className="mm-audit-score">
                  <div>
                    <div className="mm-audit-score-label">Pitch-ready score</div>
                    <div style={{ fontFamily: 'var(--mm-mono)', fontSize: 10, color: 'var(--mm-fg-dim)', marginTop: 4 }}>low site quality = high opportunity</div>
                  </div>
                  <div className="mm-audit-score-val">32</div>
                </div>
              </div>
            </div>
            <div className={`mm-how-stage ${active === 2 ? 'on' : ''}`}>
              <div className="mm-mini-dir">
                <div className="mm-mini-dir-head">LEAD DIRECTORY · 4 results</div>
                {[
                  { n: 'Brightside Dental', s: 'Chicago · 94% email',  label: 'NEW',        active: false },
                  { n: 'Lakeshore Ortho',   s: 'Evanston · 88% email', label: 'FOLLOW UP',  active: true },
                  { n: 'Northside Smiles',  s: 'Chicago · 96% email',  label: 'INTERESTED', active: false },
                  { n: 'Oak Park Dental',   s: 'Oak Park · $4,800/mo', label: 'CLOSED',     active: false },
                ].map((r) => (
                  <div className="mm-mini-row" key={r.n}>
                    <div>
                      <div className="mm-mini-name">{r.n}</div>
                      <div className="mm-mini-sub">{r.s}</div>
                    </div>
                    <div className={`mm-mini-select ${r.active ? 'active' : ''}`}>{r.label} ▾</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="mm-block" id="features">
      <div className="mm-shell">
        <div className="mm-features-head">
          <div>
            <div className="mm-section-label mm-reveal">Features</div>
            <h2 className="mm-section-title mm-reveal">Everything a closer <em>actually</em> needs.</h2>
          </div>
          <p className="mm-section-sub mm-reveal">Nothing they don&apos;t.</p>
        </div>

        <div className="mm-features-grid">
          <div className="mm-feature big mm-reveal">
            <div>
              <div className="mm-feature-tag">SCRAPING ENGINE</div>
              <h3 className="mm-feature-title">Live Google Maps scraping, in plain English.</h3>
              <p className="mm-feature-body">Playwright-backed workers harvest listings in real time. We calculate estimated scrape times dynamically based on your parameters. No cached lists.</p>
            </div>
            <div className="mm-fviz">
              <div style={{ fontFamily: 'var(--mm-mono)', fontSize: 12, color: 'var(--mm-fg-dim)', marginBottom: 10 }}>QUERY</div>
              <div style={{ fontFamily: 'var(--mm-mono)', fontSize: 16, padding: 14, background: 'var(--mm-bg)', border: '1px solid var(--mm-line)', borderRadius: 8 }}>
                web agencies in Mumbai
                <span className="mm-caret" />
              </div>
              <div className="mm-fviz-bars">
                {[40, 65, 85, 72, 95, 60, 78, 88, 55, 92].map((h, i) => (
                  <div key={i} className="mm-fviz-bar" style={{ height: h + '%', opacity: 0.4 + (i / 10) * 0.6 }} />
                ))}
              </div>
            </div>
          </div>



          <div className="mm-feature sm mm-reveal">
            <div className="mm-feature-tag">SITE AUDITOR</div>
            <h3 className="mm-feature-title">Core Web Vitals.</h3>
            <p className="mm-feature-body" style={{ fontSize: 11, marginTop: 4, marginBottom: 8, color: 'var(--mm-fg-dim)' }}>Interactive tooltips explain every metric to your clients.</p>
            <div className="mm-fviz" style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <div style={{ flex: 1, padding: 8, background: 'var(--mm-bg)', border: '1px solid var(--mm-line)', borderRadius: 6, fontFamily: 'var(--mm-mono)', fontSize: 11, textAlign: 'center' }}>
                <div style={{ color: 'var(--mm-danger)', fontSize: 18, fontWeight: 600 }}>4.2s</div>
                <div style={{ color: 'var(--mm-fg-dim)' }}>LCP</div>
              </div>
              <div style={{ flex: 1, padding: 8, background: 'var(--mm-bg)', border: '1px solid var(--mm-line)', borderRadius: 6, fontFamily: 'var(--mm-mono)', fontSize: 11, textAlign: 'center' }}>
                <div style={{ color: '#ffb547', fontSize: 18, fontWeight: 600 }}>.31</div>
                <div style={{ color: 'var(--mm-fg-dim)' }}>CLS</div>
              </div>
            </div>
          </div>

          <div className="mm-feature sm mm-reveal">
            <div className="mm-feature-tag">TECH FINGERPRINT</div>
            <h3 className="mm-feature-title">Know their stack.</h3>
            <div className="mm-fviz-stack">
              <div>WP 5.9</div><div>React</div><div>Next.js</div>
              <div>Shopify</div><div>Tailwind</div><div>Stripe</div>
            </div>
          </div>

          <div className="mm-feature med mm-reveal">
            <div>
              <div className="mm-feature-tag">PIPELINE INTELLIGENCE</div>
              <h3 className="mm-feature-title">Visual "Rotting Deal" indicators.</h3>
              <p className="mm-feature-body">Never let a warm lead go cold. Leads that sit untouched for over 7 days are automatically flagged.</p>
            </div>
            <div className="mm-fviz-dup" style={{ gap: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mm-danger)' }}></span>
                <span style={{ fontFamily: 'var(--mm-mono)', fontSize: 12 }}>Lakeshore Ortho</span>
                <span style={{ marginLeft: 'auto', color: 'var(--mm-danger)', fontSize: 10, fontFamily: 'var(--mm-mono)', fontWeight: 'bold' }}>8d stale</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mm-accent)' }}></span>
                <span style={{ fontFamily: 'var(--mm-mono)', fontSize: 12 }}>Northside Smiles</span>
                <span style={{ marginLeft: 'auto', color: 'var(--mm-fg-dim)', fontSize: 10, fontFamily: 'var(--mm-mono)' }}>2d active</span>
              </div>
            </div>
          </div>

          <div className="mm-feature med mm-reveal">
            <div>
              <div className="mm-feature-tag">DYNAMIC CRM</div>
              <h3 className="mm-feature-title">Cards that adapt to your industry.</h3>
              <p className="mm-feature-body">Select your niche during onboarding. The directory and data points instantly reshape to surface what closes deals for you.</p>
            </div>
            <div className="mm-fviz-niche">
              <span className="active">Web &amp; SEO</span>
              <span>B2B Sales</span>
              <span>Real Estate</span>
              <span>Freelance</span>
            </div>
          </div>

          <div
            className="mm-feature med mm-reveal"
            style={{ background: 'var(--mm-accent)', color: 'var(--mm-accent-ink)', borderColor: 'var(--mm-accent)' }}
          >
            <div>
              <div className="mm-feature-tag" style={{ color: 'var(--mm-accent-ink)', opacity: 0.7 }}>
                STATUS · CONTACT · EXPORT
              </div>
              <h3 className="mm-feature-title">A directory, not a spreadsheet.</h3>
              <p className="mm-feature-body" style={{ color: 'var(--mm-accent-ink)', opacity: 0.8 }}>
                Update status inline. View rich modals. Export to CSV in one click. Built for the rhythm of actual sales.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
              {['NEW', 'FOLLOW UP', 'INTERESTED', 'CLOSED'].map((s, i) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: `rgba(10,11,10,${0.2 + i * 0.18})`,
                    borderRadius: 4,
                    fontFamily: 'var(--mm-mono)',
                    fontSize: 10,
                    textAlign: 'center',
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Lead = {
  name: string;
  niche: string;
  rating: string;
  confidence: number;
  phone: string;
  emails: string[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  status: string;
};

function LeadIcon({ name }: { name: 'users' | 'mail' | 'phone' | 'globe' }) {
  switch (name) {
    case 'users':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'mail':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'phone':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case 'globe':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}

function Showcase() {
  const tabs = [
    { id: 'new', label: 'New', count: 10 },
    { id: 'followup', label: 'Follow Up', count: 1 },
    { id: 'interested', label: 'Interested', count: 0 },
    { id: 'closed', label: 'Closed', count: 0 },
  ];
  const [activeTab, setActiveTab] = useState('new');
  const [leads, setLeads] = useState<Lead[]>([
    {
      name: 'Nishiazabu International Clinic', niche: 'Clinic in Tokyo',
      rating: '4.3 stars · 111 reviews', confidence: 100,
      phone: '+81 3-6447-5966',
      emails: ['online@nic-med.com', 'info@nic-med.com'],
      hasEmail: true, hasPhone: true, hasWebsite: true, status: 'NEW',
    },
    {
      name: 'Hiroo International Clinic', niche: 'Clinic in Tokyo',
      rating: '3.8 stars · 63 reviews', confidence: 65,
      phone: '+81 3-5789-8861',
      emails: [],
      hasEmail: false, hasPhone: true, hasWebsite: true, status: 'NEW',
    },
    {
      name: 'Tokyo Midtown Medical Center', niche: 'Clinic in Tokyo',
      rating: '4.6 stars · 248 reviews', confidence: 92,
      phone: '+81 3-5413-7911',
      emails: ['reception@tmmc.jp'],
      hasEmail: true, hasPhone: true, hasWebsite: true, status: 'NEW',
    },
    {
      name: 'Roppongi Medical Clinic', niche: 'Clinic in Tokyo',
      rating: '4.1 stars · 87 reviews', confidence: 78,
      phone: '+81 3-3408-2221',
      emails: ['contact@roppongi-med.jp'],
      hasEmail: true, hasPhone: true, hasWebsite: true, status: 'NEW',
    },
  ]);

  const updateStatus = (idx: number, next: string) => {
    setLeads((prev) => prev.map((l, i) => (i === idx ? { ...l, status: next } : l)));
  };

  const stats: Array<{ label: string; val: number; icon: 'users' | 'mail' | 'phone' | 'globe' }> = [
    { label: 'Total Leads', val: 10, icon: 'users' },
    { label: 'Has Emails', val: 7, icon: 'mail' },
    { label: 'Has Phone', val: 10, icon: 'phone' },
    { label: 'Has Website', val: 10, icon: 'globe' },
  ];

  return (
    <section className="mm-block" style={{ paddingTop: 0, borderTop: 'none' }}>
      <div className="mm-shell">
        <div className="mm-showcase mm-reveal">
          <div className="mm-showcase-head">
            <div className="mm-dots"><span /><span /><span /></div>
            <div className="mm-showcase-url">app.mapmachine.run / directory</div>
            <span style={{ color: 'var(--mm-accent)' }}>● live</span>
          </div>
          <div className="mm-showcase-body">
            <div className="mm-lead-search">
              <div className="mm-lsf">
                <label>NICHE &amp; LOCATION</label>
                <input placeholder="e.g. Roofers in Austin, Texas" defaultValue="Clinics in Tokyo" />
              </div>
              <div className="mm-lsf">
                <label>MAX LEADS</label>
                <input defaultValue="10" />
              </div>
              <div className="mm-lsf">
                <label>MAX REVIEWS</label>
                <input placeholder="e.g. 50" />
              </div>
              <button type="button" className="mm-btn mm-btn-primary mm-lead-search-btn">SEARCH →</button>
            </div>

            <div className="mm-lead-tabs">
              {tabs.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`mm-lead-tab ${activeTab === t.id ? 'on' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label.toUpperCase()} <span className="mm-lead-tab-count">{t.count}</span>
                </button>
              ))}
            </div>

            <div className="mm-lead-stats">
              {stats.map((s) => (
                <div key={s.label} className="mm-lead-stat">
                  <div className="mm-lead-stat-icon">
                    <LeadIcon name={s.icon} />
                  </div>
                  <div>
                    <div className="mm-lead-stat-label">{s.label.toUpperCase()}</div>
                    <div className="mm-lead-stat-val">{s.val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mm-lead-dir-head">
              <div className="mm-lead-dir-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                LEAD DIRECTORY
              </div>
              <div className="mm-lead-dir-ctrls">
                <select className="mm-lead-sel">
                  <option>All Categories</option>
                  <option>Clinics</option>
                  <option>Dental</option>
                </select>
                <button type="button" className="mm-lead-btn ghost">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  EXPORT CSV
                </button>
                <button type="button" className="mm-lead-btn danger">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                  CLEAR NEW
                </button>
                <span className="mm-lead-results">{leads.length} Results</span>
              </div>
            </div>

            <div className="mm-lead-cols">
              <div>BUSINESS</div>
              <div>CONTACT</div>
              <div>CORPORATE DATA</div>
              <div style={{ textAlign: 'right' }}>ACTION</div>
            </div>

            <div className="mm-lead-rows">
              {leads.map((l, i) => (
                <div className="mm-lead-row" key={l.name}>
                  <div>
                    <div className="mm-lead-name">{l.name}</div>
                    <div className="mm-lead-tag">{l.niche.toUpperCase()}</div>
                    <div className="mm-lead-rating">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {l.rating}
                    </div>
                    <div className="mm-lead-bar-wrap">
                      <div className="mm-lead-bar">
                        <div
                          className="mm-lead-bar-fill"
                          style={{
                            width: l.confidence + '%',
                            background:
                              l.confidence >= 90
                                ? 'var(--mm-accent)'
                                : l.confidence >= 70
                                ? '#ffb547'
                                : 'var(--mm-danger)',
                          }}
                        />
                      </div>
                      <span className="mm-lead-bar-val">{l.confidence}%</span>
                    </div>
                  </div>

                  <div className="mm-lc-contact">
                    <select
                      className="mm-lead-status"
                      value={l.status}
                      onChange={(e) => updateStatus(i, e.target.value)}
                    >
                      <option>NEW</option>
                      <option>FOLLOW UP</option>
                      <option>INTERESTED</option>
                      <option>CLOSED</option>
                    </select>
                    <div className="mm-lead-contact-row">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      {l.phone}
                      <button type="button" className="mm-lead-copy" aria-label="Copy phone">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    {l.emails.map((em) => (
                      <div className="mm-lead-contact-row" key={em}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        {em}
                        <button type="button" className="mm-lead-copy" aria-label="Copy email">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <a className="mm-lead-visit" href="#">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      Visit Website
                    </a>
                  </div>

                  <div className="mm-lc-data">
                    {l.hasEmail && (
                      <div className="mm-lead-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        HAS EMAIL
                      </div>
                    )}
                    {l.hasPhone && (
                      <div className="mm-lead-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        HAS PHONE
                      </div>
                    )}
                    {l.hasWebsite && (
                      <div className="mm-lead-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        LISTED WEBSITE
                      </div>
                    )}
                  </div>

                  <div className="mm-lc-action">
                    <button type="button" className="mm-lead-btn danger solid">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                      DELETE
                    </button>
                    <button type="button" className="mm-lead-btn muted">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      ADD FOLLOW-UP NOTE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers: Array<{
    name: string;
    amt: string;
    per: string;
    desc: string;
    feats: string[];
    cta: string;
    href: string;
    featured?: boolean;
  }> = [
    {
      name: 'Free',
      amt: '₹0',
      per: 'forever',
      desc: 'Kick the tyres. 25 leads a month is enough to prove MapMachine prints real pipeline before you pay a rupee.',
      feats: ['25 leads / month', 'Basic site audit', '1 team seat', 'Lead directory · all niches'],
      cta: 'Start free',
      href: '/login',
    },
    {
      name: 'Pro',
      amt: '₹999',
      per: '/month',
      desc: 'For freelancers and closers running daily outreach. Full AI, verified emails, 2,000 qualified leads every month.',
      feats: ['2,000 leads / month', 'Cold Email AI (GPT-powered)', 'CSV export', 'Email verification', 'Full Lighthouse audits', '2 team seats'],
      cta: 'Go Pro',
      href: '/login?upgrade=pro',
      featured: true,
    },
    {
      name: 'Business',
      amt: '₹2,999',
      per: '/month',
      desc: 'For teams running prospecting at scale. 15,000 leads, tech-stack fingerprinting, and five seats on one shared CRM.',
      feats: ['15,000 leads / month', 'Everything in Pro', 'Full audits + tech stack', '5 team seats', 'Priority support'],
      cta: 'Go Business',
      href: '/login?upgrade=business',
    },
  ];

  return (
    <section className="mm-block" id="pricing">
      <div className="mm-shell">
        <div className="mm-section-label mm-reveal">Pricing</div>
        <h2 className="mm-section-title mm-reveal">Priced like a tool, not a <em>tax</em>.</h2>
        <p className="mm-section-sub mm-reveal">Fair monthly pricing in INR. Cancel in two clicks. No &ldquo;book a demo&rdquo; gate.</p>
        <div className="mm-pricing-grid">
          {tiers.map((t) => (
            <div key={t.name} className={`mm-price-card mm-reveal ${t.featured ? 'featured' : ''}`}>
              <div className="mm-price-name">{t.name}</div>
              <div className="mm-price-amt">
                {t.amt}<small> {t.per}</small>
              </div>
              <p className="mm-price-desc">{t.desc}</p>
              <ul className="mm-price-feat">
                {t.feats.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link
                href={t.href}
                className={`mm-btn ${t.featured ? 'mm-btn-primary' : 'mm-btn-ghost'}`}
                style={{ alignSelf: 'stretch', justifyContent: 'center', padding: '14px' }}
              >
                {t.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', niche: 'Web & SEO Agency', msg: '' });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.msg) return;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSent(true);
        setForm({ name: '', email: '', niche: 'Web & SEO Agency', msg: '' });
      }
    } catch (err) {
      console.error('Failed to submit', err);
    }
  };
  return (
    <section className="mm-block" id="contact">
      <div className="mm-shell">
        <div className="mm-section-label mm-reveal">Contact</div>
        <h2 className="mm-section-title mm-reveal">Talk to a human. <em>Actual</em> one.</h2>
        <p className="mm-section-sub mm-reveal">Got a weird niche? Unsure if MapMachine covers your geography? Say hi.</p>
        <div className="mm-contact-wrap">
          <form className="mm-contact-form mm-reveal" onSubmit={submit}>
            <div className="mm-field">
              <label>Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="mm-field">
              <label>Work email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@agency.com" />
            </div>
            <div className="mm-field">
              <label>What do you sell?</label>
              <select value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}>
                <option>Web &amp; SEO Agency</option>
                <option>B2B Sales / Freelance</option>
                <option>Real Estate / Property</option>
                <option>Something else</option>
              </select>
            </div>
            <div className="mm-field">
              <label>Tell us more</label>
              <textarea
                value={form.msg}
                onChange={(e) => setForm({ ...form, msg: e.target.value })}
                placeholder="Niches, geographies, volume — whatever matters."
              />
            </div>
            <button
              type="submit"
              className="mm-btn mm-btn-primary"
              style={{ alignSelf: 'flex-start', padding: '14px 24px' }}
            >
              {sent ? '✓ Sent — we\u2019ll reply within 4h' : 'Send message →'}
            </button>
          </form>
          <div className="mm-contact-info mm-reveal">
            <h4>We reply in hours, not days.</h4>
            <p>MapMachine is built by a founder who got tired of bad lead lists and built the tool he wanted. No SDR gauntlet, no &ldquo;please hold.&rdquo; Just direct access.</p>
            <div className="mm-info-row">
              <span className="mm-k">Email</span>
              <span className="mm-v">yashkumar4784@gmail.com</span>
            </div>
            <div className="mm-info-row">
              <span className="mm-k">Office</span>
              <span className="mm-v">Remote</span>
            </div>
            <div className="mm-info-row">
              <span className="mm-k">Support window</span>
              <span className="mm-v">Mon–Fri · 9am–11pm UTC</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <>
      <div className="mm-shell">
        <div className="mm-giant-word mm-reveal">
          MAP<em>Machine</em>
        </div>
      </div>
      <div className="mm-foot-wrap">
        <div className="mm-shell">
          <div className="mm-foot-top">
            <div className="mm-foot-brand">
              <h5>MapMachine</h5>
              <p>Local lead prospecting on autopilot. The CRM engine built for modern closers.</p>
            </div>
            <div className="mm-foot-col">
              <h6>Product</h6>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="mm-foot-col">
              <h6>Use Cases</h6>
              <a href="#niches">For Web Agencies</a>
              <a href="#niches">For Real Estate</a>
              <a href="#niches">For B2B Sales</a>
              <a href="#niches">For Freelancers</a>
            </div>
            <div className="mm-foot-col">
              <h6>Account</h6>
              <Link href="/login">Login</Link>
              <Link href="/register">Create Account</Link>
            </div>
            <div className="mm-foot-col">
              <h6>Socials</h6>
              <a href="https://x.com" target="_blank" rel="noreferrer">X (Twitter)</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
            </div>
          </div>
          <div className="mm-foot-bottom">
            <span>© 2026 MapMachine Labs</span>
            <span>Type · find · verify · close</span>
            <span>v4.2.0 — fresh data since 2024</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LandingPageClient() {
  const [theme, setTheme] = useState<Theme>('dark');
  useCursor();
  useReveal();
  useSmoothScroll();

  return (
    <div className="mm" data-theme={theme}>
      <div className="mm-cursor-dot" id="mm-cursor-dot" />
      <div className="mm-cursor-ring" id="mm-cursor-ring" />
      <Nav theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      <Hero />
      <Problem />
      <Niches />
      <HowItWorks />
      <Features />
      <Showcase />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
}

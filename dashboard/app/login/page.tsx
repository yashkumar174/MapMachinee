"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../components/AuthProvider";
import { useCursor } from "../../components/LandingPageClient";
import Link from "next/link";
import "../../components/landing.css";

const FAKE_LOGS = [
  '[SYS] Initializing Maps worker pool... OK',
  '[SYS] Connecting to proxy network... 12/12 active',
  '[JOB] Received query: "HVAC companies in Chicago"',
  '[SCRAPE] Found 142 local entities. Parsing maps data...',
  '[ENRICH] Scraping domain: aircare-chicago.com',
  '[TECH] Detected WP 5.9 | React | Node',
  '[VITAL] Core Web Vitals failing. LCP: 4.2s',
  '[ENRICH] Prospecting decision maker... Found: john@aircare-chicago.com',
  '[SYS] Storing lead payload in database...',
  '[SCRAPE] Scraping domain: coldfront-hvac.net',
  '[TECH] Detected Shopify | Tailwind',
  '[VITAL] Core Web Vitals passing. LCP: 1.1s',
  '[ENRICH] Gatekeeper bypassed. Found phone: +1-312-555-0922',
  '[SYS] Storing lead payload in database...',
  '[JOB] Iteration complete. 142 records enriched.',
  '[SYS] Awaiting next command...'
];

function LiveTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentIndex = 0;
    
    // Initial boot sequence styling
    setLogs(['> MAPMACHINE TERMINAL v1.0.0', '> SYSTEM READY', '> AWAITING AUTHENTICATION...', '']);

    const interval = setInterval(() => {
      setLogs((prev) => {
        const nextLog = FAKE_LOGS[currentIndex % FAKE_LOGS.length];
        const newLogs = [...prev, `[${new Date().toISOString().split('T')[1].slice(0,8)}] ${nextLog}`];
        if (newLogs.length > 50) newLogs.shift();
        return newLogs;
      });
      currentIndex++;
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      fontFamily: 'var(--mm-mono)', fontSize: 13, color: 'var(--mm-fg-dim)', 
      lineHeight: 1.6, padding: '40px', height: '100%', width: '100%', 
      overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: 'var(--mm-bg)', borderLeft: '1px solid var(--mm-line)'
    }}>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {logs.map((log, i) => {
          let color = 'inherit';
          if (log.includes('[TECH]') || log.includes('[ENRICH]')) color = 'var(--mm-accent)';
          if (log.includes('[VITAL]') || log.includes('[SCRAPE]')) color = '#fff';
          return (
            <div key={i} style={{ opacity: Math.max(0.15, 1 - (logs.length - i) * 0.05) }}>
              <span style={{ color }}>{log}</span>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 24 }} />
      </div>
      <div style={{ borderTop: '1px solid var(--mm-line)', paddingTop: 16, marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span>STATUS: IDLE_MONITORING</span>
        <span style={{ color: 'var(--mm-accent)', animation: 'pulse 2s infinite' }}>CONNECTION_SECURE</span>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      `}} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  useCursor();

  useEffect(() => {
    const syncUser = async () => {
      if (user && !loading && !isSyncing) {
        setIsSyncing(true);
        try {
          // Exchange client token for 14-day server session cookie
          const idToken = await user.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });

          const res = await fetch('/api/auth/sync', { method: 'POST' });
          const data = await res.json();
          if (data.needsOnboarding) {
            router.push('/onboarding');
          } else {
            router.push('/dashboard');
          }
        } catch (e) {
          console.error("Sync error", e);
          router.push('/dashboard');
        }
      }
    };
    syncUser();
  }, [user, loading, router, isSyncing]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const ignorable = ['auth/cancelled-popup-request', 'auth/popup-closed-by-user'];
      if (ignorable.includes(error?.code)) return;
      console.error("Firebase Login Error", error);
      alert("Failed to login with Google.");
    }
  };

  if (loading) {
    return (
      <div className="mm" data-theme="dark">
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mm-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mm-fg-dim)' }}>
          Authenticating secure connection...
        </div>
      </div>
    );
  }

  return (
    <div className="mm" data-theme="dark" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="mm-cursor-dot" id="mm-cursor-dot" />
      <div className="mm-cursor-ring" id="mm-cursor-ring" />
      <div style={{ display: 'flex', height: '100%', maxHeight: '100vh', background: 'var(--mm-bg)', overflow: 'hidden' }}>
        
        {/* Left Side: Brutalist Login Interface */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 20 }}>
            <Link href="/" style={{ fontFamily: 'var(--mm-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mm-fg-dim)', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--mm-fg)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mm-fg-dim)'}>
              ← Return to Site
            </Link>
          </div>

          {/* Deep Ambient Glow */}
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 600, height: 600, background: 'var(--mm-accent)', opacity: 0.1, filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px', position: 'relative', zIndex: 10 }}>
            <div style={{ width: '100%', maxWidth: '380px' }}>
              
              <div style={{ marginBottom: 48 }}>
                <h1 className="mm-section-title" style={{ fontSize: 'clamp(56px, 5vw, 72px)', margin: '0 0 16px', letterSpacing: '-0.05em' }}>Sign <em>in.</em></h1>
                <div style={{ fontFamily: 'var(--mm-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mm-fg-dim)' }}>
                  // Authentication Gateway required
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                className="mm-btn mm-btn-primary" 
                style={{ width: '100%', padding: '24px 24px', fontSize: 13, gap: 12, justifyContent: 'center', background: 'var(--mm-bg-2)', color: 'var(--mm-fg)', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mm-accent)'; e.currentTarget.style.color = 'var(--mm-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mm-bg-2)'; e.currentTarget.style.color = 'var(--mm-fg)'; }}
              >
                <svg className="w-5 h-5" style={{ width: 18, height: 18 }} viewBox="0 0 48 48">
                  <path fill="currentColor" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="currentColor" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="currentColor" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="currentColor" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Google Protocol</span>
              </button>

            </div>
          </div>
        </div>

        {/* Right Side: The Machine (Live Terminal) */}
        <div className="hidden lg:flex" style={{ flex: '1', position: 'relative' }}>
          <LiveTerminal />
        </div>

      </div>
    </div>
  );
}

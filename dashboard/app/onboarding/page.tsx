"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../components/AuthProvider";
import { useCursor } from "../../components/LandingPageClient";
import "../../components/landing.css";

const NICHES = [
  { id: "DIGITAL_AGENCY", name: "Web & SEO Agency", desc: "Audit page speed, mobile gaps, missing websites, and low review counts." },
  { id: "B2B_SALES", name: "B2B Sales", desc: "Scrape thousands of verified business emails and phone numbers." },
  { id: "REAL_ESTATE", name: "Real Estate", desc: "Find motivated property managers and off-market commercial listings." }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useCursor();
  
  const [selectedNiche, setSelectedNiche] = useState<string>("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [serviceLevel, setServiceLevel] = useState<'SCRAPER_ONLY' | 'FULL_CRM'>('FULL_CRM');
  const [hasTeamManagement, setHasTeamManagement] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mm" data-theme="dark">
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--mm-bg)', fontFamily: 'var(--mm-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mm-fg-dim)' }}>
          Validating authorization...
        </div>
      </div>
    );
  }

  const validateUsername = (val: string) => {
    if (val.length < 3) return "Username must be at least 3 characters";
    if (val.length > 24) return "Username must be under 24 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return "Only letters, numbers, and underscores";
    return "";
  };

  const handleNextStep1 = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameError("Please choose a username.");
      return;
    }
    const err = validateUsername(trimmed);
    if (err) {
      setUsernameError(err);
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleFinish = async () => {
    if (!selectedNiche) return alert("Please select a target niche.");
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: selectedNiche, username: username.trim(), serviceLevel, hasTeamManagement })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      } else {
        alert("Failed to save. " + data.error);
        setIsSubmitting(false);
      }
    } catch (e) {
      alert("Error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mm" data-theme="dark">
      <div className="mm-cursor-dot" id="mm-cursor-dot" />
      <div className="mm-cursor-ring" id="mm-cursor-ring" />
      
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--mm-bg)', overflow: 'hidden' }}>
        
        {/* Background ambient elements */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 800, height: 800, background: 'var(--mm-accent)', opacity: 0.1, filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none', transform: 'translate(-50%, -50%)' }} />

        {/* Outer Container */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 10 }}>
          
          {/* Brutalist Onboarding Block */}
          <div style={{ width: '100%', maxWidth: '640px', background: 'var(--mm-bg)', border: '1px solid var(--mm-line)', padding: '56px 48px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
              <div>
                <h1 className="mm-section-title" style={{ fontSize: '40px', margin: '0 0 8px', letterSpacing: '-0.04em' }}>
                  {step === 1 && <>Initialize <em>workspace.</em></>}
                  {step === 2 && <>Configure <em>payload.</em></>}
                  {step === 3 && <>Target <em>protocol.</em></>}
                </h1>
                <p style={{ fontFamily: 'var(--mm-mono)', fontSize: 13, color: 'var(--mm-fg-dim)', margin: 0 }}>
                  {step === 1 && "// Set your operator identity"}
                  {step === 2 && "// Define your workspace permissions"}
                  {step === 3 && "// Assign enrichment vertical"}
                </p>
              </div>
              
              <button 
                onClick={async () => {
                  await signOut(auth);
                  router.push('/login');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--mm-fg-dim)', fontFamily: 'var(--mm-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'none', padding: 4 }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--mm-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mm-fg-dim)'}
              >
                [Abort]
              </button>
            </div>

            {/* Auth validation tag */}
            {step === 1 && user?.email && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--mm-bg-2)', border: '1px solid var(--mm-line)', marginBottom: 40 }}>
                <span style={{ display: 'block', width: 8, height: 8, background: 'var(--mm-accent)' }} />
                <span style={{ fontFamily: 'var(--mm-mono)', fontSize: 11, color: 'var(--mm-fg-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Secure handshake: <strong style={{ color: 'var(--mm-fg)', fontWeight: 'normal' }}>{user.email}</strong>
                </span>
              </div>
            )}

            <div style={{ minHeight: '200px' }}>
              {/* Step 1: Username */}
              {step === 1 && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mm-mono)', fontSize: 11, color: 'var(--mm-fg-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Select operator handle
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: 18, left: 18, fontFamily: 'var(--mm-mono)', fontSize: 14, color: 'var(--mm-fg-dim)' }}>&gt;</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameError("");
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleNextStep1()}
                      placeholder="operator_alias"
                      maxLength={24}
                      style={{ 
                        width: '100%', background: 'var(--mm-bg-2)', border: '1px solid var(--mm-line)', padding: '16px 16px 16px 40px', 
                        fontFamily: 'var(--mm-mono)', fontSize: 14, color: 'var(--mm-fg)', outline: 'none'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--mm-accent)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--mm-line)'}
                    />
                  </div>
                  {usernameError && (
                    <p style={{ fontFamily: 'var(--mm-mono)', fontSize: 12, color: 'var(--mm-accent)', marginTop: 12, margin: '12px 0 0' }}>[ERR] {usernameError}</p>
                  )}
                  <p style={{ fontFamily: 'var(--mm-mono)', fontSize: 10, color: 'var(--mm-fg-dim)', marginTop: 12 }}>SYS_REQ: [a-zA-Z0-9_] 3-24 CHARS.</p>
                </div>
              )}

              {/* Step 2: Service Tier */}
              {step === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                  <button
                    onClick={() => setServiceLevel('SCRAPER_ONLY')}
                    style={{ textAlign: 'left', padding: '24px', background: serviceLevel === 'SCRAPER_ONLY' ? 'var(--mm-bg-2)' : 'var(--mm-bg)', border: `1px solid ${serviceLevel === 'SCRAPER_ONLY' ? 'var(--mm-accent)' : 'var(--mm-line)'}`, cursor: 'none', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--mm-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: serviceLevel === 'SCRAPER_ONLY' ? 'var(--mm-accent)' : 'var(--mm-fg)' }}>Raw Scraper</h3>
                      {serviceLevel === 'SCRAPER_ONLY' && <span style={{ width: 6, height: 6, background: 'var(--mm-accent)' }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--mm-fg-dim)', lineHeight: 1.5 }}>Headless extraction engines and CSV exports. No pipeline UI.</p>
                  </button>

                  <button
                    onClick={() => setServiceLevel('FULL_CRM')}
                    style={{ textAlign: 'left', padding: '24px', background: serviceLevel === 'FULL_CRM' ? 'var(--mm-bg-2)' : 'var(--mm-bg)', border: `1px solid ${serviceLevel === 'FULL_CRM' ? 'var(--mm-accent)' : 'var(--mm-line)'}`, cursor: 'none', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--mm-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: serviceLevel === 'FULL_CRM' ? 'var(--mm-accent)' : 'var(--mm-fg)' }}>Full CRM Suite</h3>
                      {serviceLevel === 'FULL_CRM' && <span style={{ width: 6, height: 6, background: 'var(--mm-accent)' }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--mm-fg-dim)', lineHeight: 1.5 }}>Scraper engine bundled with visual pipelines, analytics, and CRM views.</p>
                  </button>
                </div>
              )}

              {/* Step 3: Niche */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {NICHES.map((niche) => (
                    <button
                      key={niche.id}
                      onClick={() => setSelectedNiche(niche.id)}
                      style={{ textAlign: 'left', padding: '20px', background: selectedNiche === niche.id ? 'var(--mm-bg-2)' : 'var(--mm-bg)', border: `1px solid ${selectedNiche === niche.id ? 'var(--mm-accent)' : 'var(--mm-line)'}`, cursor: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                    >
                      <div style={{ width: 24, paddingRight: 16 }}>
                        {selectedNiche === niche.id ? <span style={{ display: 'block', width: 6, height: 6, background: 'var(--mm-accent)' }} /> : <span style={{ display: 'block', width: 6, height: 6, border: '1px solid var(--mm-line)' }} />}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--mm-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: selectedNiche === niche.id ? 'var(--mm-accent)' : 'var(--mm-fg)' }}>{niche.name}</h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--mm-fg-dim)', lineHeight: 1.4 }}>{niche.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer progress & controls */}
            <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--mm-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              
              {/* Progress Squares */}
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 24, height: 4, background: step >= 1 ? 'var(--mm-accent)' : 'var(--mm-line)', transition: 'background 0.3s' }} />
                <div style={{ width: 24, height: 4, background: step >= 2 ? 'var(--mm-accent)' : 'var(--mm-line)', transition: 'background 0.3s' }} />
                <div style={{ width: 24, height: 4, background: step >= 3 ? 'var(--mm-accent)' : 'var(--mm-line)', transition: 'background 0.3s' }} />
              </div>
              
              <div style={{ display: 'flex', gap: 16 }}>
                {step > 1 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="mm-btn"
                    style={{ background: 'transparent', color: 'var(--mm-fg-dim)', border: '1px solid var(--mm-line)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mm-bg-2)'; e.currentTarget.style.color = 'var(--mm-fg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mm-fg-dim)'; }}
                  >
                    RETURN
                  </button>
                )}
                {step === 1 && (
                  <button 
                    onClick={handleNextStep1}
                    className="mm-btn mm-btn-primary"
                  >
                    CONTINUE
                  </button>
                )}
                {step === 2 && (
                  <button 
                    onClick={handleNextStep2}
                    className="mm-btn mm-btn-primary"
                  >
                    CONTINUE
                  </button>
                )}
                {step === 3 && (
                  <button 
                    onClick={handleFinish} 
                    disabled={!selectedNiche || isSubmitting}
                    className="mm-btn mm-btn-primary"
                    style={{ opacity: (!selectedNiche || isSubmitting) ? 0.5 : 1, pointerEvents: (!selectedNiche || isSubmitting) ? 'none' : 'auto' }}
                  >
                    {isSubmitting ? 'SYNCING...' : 'INITIALIZE'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

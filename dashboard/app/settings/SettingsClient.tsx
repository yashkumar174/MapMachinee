"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsClient({ 
  initialUsername, 
  email, 
  isAdmin,
  organizationName,
  niche,
  plan,
  planLeadsUsed,
  planLeadsLimit
}: { 
  initialUsername: string;
  email: string;
  isAdmin: boolean;
  organizationName: string;
  niche: string;
  plan: string;
  planLeadsUsed: number;
  planLeadsLimit: number;
}) {
  const router = useRouter();

  // Username State
  const [username, setUsername] = useState(initialUsername);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const handleUpdateUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === initialUsername) return;
    if (trimmed.length < 3) { setUsernameError('Min 3 characters'); return; }
    if (trimmed.length > 24) { setUsernameError('Max 24 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setUsernameError('Letters, numbers, _ only'); return; }

    setSavingUsername(true);
    setUsernameError('');
    try {
      const res = await fetch('/api/user/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsernameSuccess(true);
        setTimeout(() => setUsernameSuccess(false), 3000);
        router.refresh();
      } else {
        setUsernameError(data.error || 'Failed to update');
      }
    } catch {
      setUsernameError('Network error');
    } finally {
      setSavingUsername(false);
    }
  };

  const usagePercent = Math.min(100, Math.round((planLeadsUsed / planLeadsLimit) * 100)) || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* SECTION: Profile Details */}
      <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-b-divider bg-surface-header">
          <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
             <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
             Profile Details
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2">Google Email</label>
              <div className="bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl opacity-70">
                {email}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2">Account Role</label>
              <div className="bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl flex items-center gap-2 opacity-70">
                {isAdmin ? (
                  <><span className="w-2 h-2 rounded-full bg-accent"></span> Administrator</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Sales Member</>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-b-divider">
            <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2 mt-4">Display Username</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <input 
                type="text" 
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameError(''); setUsernameSuccess(false); }}
                className={`w-full sm:max-w-md bg-surface-input border text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl outline-none transition-all ${usernameError ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-b-muted focus:border-accent focus:ring-1 focus:ring-accent'}`}
                placeholder="e.g. iAlwaysPlay"
              />
              <button 
                onClick={handleUpdateUsername}
                disabled={savingUsername || username === initialUsername}
                className="flex-shrink-0 px-5 py-2.5 bg-surface-header border border-b-default text-t-primary text-xs font-bold rounded-xl hover:bg-surface-card hover:border-b-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingUsername ? 'Saving...' : 'Update Username'}
              </button>
            </div>
            {usernameError && <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{usernameError}</p>}
            {usernameSuccess && <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Profile successfully updated!</p>}
          </div>
        </div>
      </div>

      {/* SECTION: Workspace Details */}
      <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-b-divider bg-surface-header">
          <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
             <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
             Workspace Details
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2">Organization Name</label>
              <div className="bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl opacity-70">
                {organizationName}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2">Workspace Niche</label>
              <div className="bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl opacity-70">
                {niche === 'B2B_SALES' ? 'B2B Sales' : niche === 'DIGITAL_AGENCY' ? 'Web & SEO Agency' : niche === 'REAL_ESTATE' ? 'Real Estate' : 'General'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Subscription Usage */}
      <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-b-divider bg-surface-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
             <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             Subscription Usage
          </h2>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
            {plan} PLAN
          </span>
        </div>
        <div className="p-6">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-t-muted uppercase tracking-widest">Leads Scraped This Month</span>
            <span className="text-t-primary">{planLeadsUsed.toLocaleString()} / {planLeadsLimit.toLocaleString()}</span>
          </div>
          <div className="w-full h-3 bg-surface-badge rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${usagePercent > 90 ? 'bg-red-500' : 'bg-accent'}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent > 90 && (
            <p className="text-xs font-bold text-red-500 mt-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              You are approaching your lead limit.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}

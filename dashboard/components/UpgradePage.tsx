'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

type PlanKey = 'FREE' | 'PRO' | 'BUSINESS';

interface StatusData {
  plan: PlanKey;
  leadsUsed: number;
  leadsLimit: number;
  daysLeft: number;
  currentPeriodEnd: string | null;
}

const TIERS = [
  {
    key: 'FREE' as PlanKey,
    name: 'Free Plan',
    sub: 'For getting started',
    price: '₹0',
    feats: ['25 leads / month', 'Basic site audit', 'Lead directory', 'CRM Pipeline', '1 team seat'],
  },
  {
    key: 'PRO' as PlanKey,
    name: 'Pro Plan',
    sub: 'For freelancers & closers',
    price: '₹999',
    popular: true,
    feats: ['2,000 leads / month', 'Cold Email AI (GPT)', 'CSV Export', 'Email verification', 'Full Lighthouse audits', '2 team seats'],
  },
  {
    key: 'BUSINESS' as PlanKey,
    name: 'Business Plan',
    sub: 'Built for scale',
    price: '₹2,999',
    feats: ['15,000 leads / month', 'Everything in Pro', 'Tech-stack fingerprint', 'Priority support', '5 team seats'],
  },
];

interface Props {
  currentPlan: string;
}

export default function UpgradePage({ currentPlan }: Props) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'ok' | 'err'>('ok');
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/status', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setStatus(json);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleUpgrade = async (plan: PlanKey) => {
    if (plan === currentPlan || plan === 'FREE') return;
    setBusyPlan(plan);
    setToast(null);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'MapMachine',
        description: `Upgrade to ${plan} Plan`,
        handler: async function (response: any) {
          setToastKind('ok');
          setToast('Verifying payment...');
          try {
            const verifyRes = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setToastKind('ok');
              setToast(`Upgraded to ${plan}! Redirecting…`);
              setTimeout(() => { router.push('/dashboard'); router.refresh(); }, 1000);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            setToastKind('err');
            setToast(err.message || 'Verification failed.');
            setBusyPlan(null);
          }
        },
        theme: {
          color: '#FD551D',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setToastKind('err');
        setToast(response.error.description);
        setBusyPlan(null);
      });
      rzp.open();
    } catch (e: any) {
      setToastKind('err');
      setToast(e.message);
      setBusyPlan(null);
    }
  };

  const activeSince = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const renewsAt = status?.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const activeTier = TIERS.find(t => t.key === currentPlan) || TIERS[0];

  return (
    <div className="space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-t-primary uppercase font-mono">Subscription</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[11px] text-t-on-dark-muted hover:text-accent uppercase tracking-widest transition-colors font-bold font-mono"
        >
          ← Dashboard
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`text-xs px-4 py-3 rounded-lg border font-bold ${
          toastKind === 'ok'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-red-500/10 text-red-400 border-red-500/30'
        }`}>
          {toast}
        </div>
      )}

      {/* Active Plan Card */}
      <div className="border border-b-divider rounded-xl bg-surface-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-b-divider bg-surface-header/50">
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <span className="text-xs font-black uppercase tracking-widest text-t-primary font-mono">Active Plan</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Plan name & price row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded font-mono ${
                currentPlan === 'BUSINESS' ? 'bg-accent text-white' :
                currentPlan === 'PRO' ? 'bg-accent/20 text-accent border border-accent/40' :
                'bg-surface-badge text-t-on-dark-muted border border-b-divider'
              }`}>
                {currentPlan}
              </span>
              <span className="text-sm text-t-on-dark-muted">|</span>
              <span className="text-sm text-t-primary font-bold font-mono">{activeTier.price} / month</span>
            </div>
            <div className="text-[11px] text-t-on-dark-muted tabular-nums">
              Active Since: {activeSince}&nbsp;&nbsp;|&nbsp;&nbsp;Renews: {renewsAt}
            </div>
          </div>

          {/* Usage bar */}
          {status && (
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-t-on-dark-muted shrink-0">
                Leads: {status.leadsUsed.toLocaleString()} / {status.leadsLimit.toLocaleString()}
              </span>
              <div className="flex-1 h-1.5 bg-surface-badge rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    status.leadsUsed / status.leadsLimit < 0.6 ? 'bg-emerald-500' :
                    status.leadsUsed / status.leadsLimit < 0.9 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (status.leadsUsed / status.leadsLimit) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-t-on-dark-faint tabular-nums">{status.daysLeft}d left</span>
            </div>
          )}

          {/* Current features row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-t-on-dark-muted">
            {activeTier.feats.map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="text-accent">✓</span> {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const isActive = tier.key === currentPlan;
          const busy = busyPlan === tier.key;

          return (
            <div
              key={tier.key}
              className={`border rounded-xl flex flex-col transition-all ${
                isActive ? 'border-accent bg-accent/5' :
                tier.popular ? 'border-b-muted bg-surface-card' :
                'border-b-divider bg-surface-card'
              }`}
            >
              {/* Card Header */}
              <div className="px-5 pt-5 pb-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wide text-t-primary font-mono">{tier.name}</h3>
                  {tier.popular && !isActive && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-accent text-white font-mono">
                      Popular
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-accent text-white font-mono">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-t-on-dark-muted">{tier.sub}</p>
              </div>

              {/* Price */}
              <div className="px-5 pt-3 pb-4">
                <span className="text-3xl font-black text-t-primary font-mono">{tier.price}</span>
                <span className="text-xs text-t-on-dark-muted ml-1">/ month</span>
              </div>

              {/* Features */}
              <div className="px-5 pb-4 flex-1">
                <ul className="space-y-2.5">
                  {tier.feats.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-t-secondary">
                      <span className="text-accent mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Button */}
              <div className="px-5 pb-5">
                <button
                  type="button"
                  disabled={isActive || busy || tier.key === 'FREE'}
                  onClick={() => handleUpgrade(tier.key)}
                  className={`w-full py-2.5 text-xs font-black uppercase tracking-widest rounded-lg border transition-all font-mono ${
                    isActive
                      ? 'border-accent/30 text-accent bg-transparent cursor-default'
                      : tier.key === 'FREE'
                      ? 'border-b-divider text-t-on-dark-muted bg-transparent cursor-default opacity-50'
                      : 'border-b-muted text-t-primary bg-transparent hover:border-accent hover:text-accent'
                  } disabled:cursor-not-allowed`}
                >
                  {busy ? 'Processing…' : isActive ? '✓ Active' : tier.key === 'FREE' ? 'Free forever' : 'Upgrade'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

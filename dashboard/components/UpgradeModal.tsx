'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

type PlanKey = 'FREE' | 'PRO' | 'BUSINESS';

interface Tier {
  key: PlanKey;
  name: string;
  price: string;
  priceSuffix: string;
  leads: string;
  features: Array<{ label: string; on: boolean }>;
  ctaFree: string;
  ctaUpgrade: string;
}

const TIERS: Tier[] = [
  {
    key: 'FREE',
    name: 'FREE',
    price: '₹0',
    priceSuffix: 'forever',
    leads: '25 leads / month',
    features: [
      { label: '25 leads / month', on: true },
      { label: 'Cold Email AI', on: false },
      { label: 'CSV Export', on: false },
      { label: 'Email verification', on: false },
      { label: 'Basic site audit', on: true },
      { label: '1 team seat', on: true },
    ],
    ctaFree: 'Current plan',
    ctaUpgrade: 'Start free',
  },
  {
    key: 'PRO',
    name: 'PRO',
    price: '₹999',
    priceSuffix: '/ month',
    leads: '2,000 leads / month',
    features: [
      { label: '2,000 leads / month', on: true },
      { label: 'Cold Email AI', on: true },
      { label: 'CSV Export', on: true },
      { label: 'Email verification', on: true },
      { label: 'Full Lighthouse audits', on: true },
      { label: '2 team seats', on: true },
    ],
    ctaFree: 'Upgrade to Pro — ₹999/mo',
    ctaUpgrade: 'Upgrade to Pro — ₹999/mo',
  },
  {
    key: 'BUSINESS',
    name: 'BUSINESS',
    price: '₹2,999',
    priceSuffix: '/ month',
    leads: '15,000 leads / month',
    features: [
      { label: '15,000 leads / month', on: true },
      { label: 'Cold Email AI', on: true },
      { label: 'CSV Export', on: true },
      { label: 'Email verification', on: true },
      { label: 'Full audits + tech stack', on: true },
      { label: '5 team seats', on: true },
    ],
    ctaFree: 'Go Business — ₹2,999/mo',
    ctaUpgrade: 'Go Business — ₹2,999/mo',
  },
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: PlanKey;
}

export default function UpgradeModal({ open, onClose, currentPlan = 'FREE' }: UpgradeModalProps) {
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'warn' | 'err'; msg: string } | null>(null);
  const router = useRouter();

  if (!open) return null;

  const isDowngrade = (target: PlanKey): boolean => {
    const rank = { FREE: 0, PRO: 1, BUSINESS: 2 };
    return rank[target] < rank[currentPlan];
  };

  const handleUpgrade = async (plan: PlanKey) => {
    if (plan === 'FREE' || plan === currentPlan) return;

    if (isDowngrade(plan)) {
      setToast({ kind: 'warn', msg: 'Downgrades apply at the end of your current billing period. Cancel your subscription from Settings to downgrade.' });
      return;
    }

    setBusyPlan(plan);
    setToast(null);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upgrade failed');
      }

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'MapMachine',
        description: `Upgrade to ${plan} Plan`,
        handler: async function (response: any) {
          setToast({ kind: 'ok', msg: 'Verifying payment...' });
          try {
            const verifyRes = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setToast({ kind: 'ok', msg: `Upgraded to ${plan}. Refreshing…` });
              setTimeout(() => {
                onClose();
                router.refresh();
              }, 900);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            setToast({ kind: 'err', msg: err.message || 'Verification failed.' });
            setBusyPlan(null);
          }
        },
        theme: {
          color: '#FD551D',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setToast({ kind: 'err', msg: response.error.description });
        setBusyPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      setToast({ kind: 'err', msg: err.message || 'Upgrade failed.' });
      setBusyPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-mono">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="bg-surface-card border border-b-muted rounded-2xl shadow-2xl overflow-hidden">
          {/* Chrome */}
          <div className="px-5 py-3 bg-surface-header flex items-center justify-between border-b border-b-divider">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <span className="text-[11px] text-t-on-dark-muted tracking-wide">mapmachine — upgrade</span>
            <button
              onClick={onClose}
              className="text-[10px] text-t-on-dark-muted hover:text-accent uppercase tracking-widest transition-colors"
            >
              Dismiss ×
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">pricing / tiers</div>
              <h2 className="text-2xl sm:text-3xl font-black text-t-primary">Upgrade MapMachine</h2>
              <p className="text-xs text-t-muted">Monthly billing. Cancel anytime. Prices in INR.</p>
            </div>

            {toast && (
              <div
                className={`text-[11px] px-3 py-2 rounded border uppercase tracking-wider text-center ${
                  toast.kind === 'ok'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : toast.kind === 'warn'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                }`}
              >
                {toast.msg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map((tier) => {
                const isActive = tier.key === currentPlan;
                const isFree = tier.key === 'FREE';
                const downgrade = isDowngrade(tier.key);
                const busy = busyPlan === tier.key;

                return (
                  <div
                    key={tier.key}
                    className={`relative flex flex-col gap-4 p-5 rounded-xl border ${
                      isActive
                        ? 'border-accent bg-accent/5 shadow-[0_0_0_1px_var(--color-accent)]'
                        : tier.key === 'PRO'
                        ? 'border-b-muted bg-surface-page'
                        : 'border-b-default bg-surface-page'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-accent text-white text-[9px] font-black uppercase tracking-widest rounded">
                        Active
                      </span>
                    )}
                    <div className="flex items-baseline justify-between">
                      <div className="text-sm font-black tracking-widest text-t-primary uppercase">{tier.name}</div>
                      <div className="text-[10px] text-t-faint uppercase tracking-widest">{tier.leads}</div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-t-primary">{tier.price}</span>
                      <span className="text-[11px] text-t-muted">{tier.priceSuffix}</span>
                    </div>

                    <ul className="space-y-1.5 flex-1">
                      {tier.features.map((f) => (
                        <li key={f.label} className={`flex items-center gap-2 text-[11px] ${f.on ? 'text-t-secondary' : 'text-t-ghost line-through opacity-60'}`}>
                          <span
                            className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[9px] font-black ${
                              f.on ? 'bg-accent text-white' : 'bg-surface-badge text-t-ghost'
                            }`}
                          >
                            {f.on ? '✓' : '×'}
                          </span>
                          {f.label}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      disabled={isActive || busy || (isFree && currentPlan !== 'FREE' ? false : isFree)}
                      onClick={() => {
                        if (isFree) {
                          onClose();
                          return;
                        }
                        handleUpgrade(tier.key);
                      }}
                      className={`w-full px-3 py-2.5 text-[11px] font-black uppercase tracking-widest rounded border transition-all ${
                        isActive
                          ? 'border-accent/30 text-accent bg-accent/10 cursor-default'
                          : downgrade
                          ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                          : tier.key === 'PRO' || tier.key === 'BUSINESS'
                          ? 'border-accent bg-accent text-white hover:bg-accent-hover'
                          : 'border-b-muted text-t-primary hover:bg-surface-card-hover'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {busy
                        ? 'Processing…'
                        : isActive
                        ? 'Current plan'
                        : isFree
                        ? 'Start free'
                        : downgrade
                        ? 'Downgrade at period end'
                        : tier.key === 'PRO'
                        ? 'Upgrade to Pro — ₹999/mo'
                        : 'Go Business — ₹2,999/mo'}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-t-ghost text-center uppercase tracking-widest">
              Razorpay · secure payments · Test mode active
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

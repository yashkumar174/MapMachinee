'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type PlanKey = 'FREE' | 'PRO' | 'BUSINESS';

interface StatusPayload {
  success: boolean;
  plan: PlanKey;
  leadsUsed: number;
  leadsLimit: number;
  percentUsed: number;
  daysLeft: number;
  status: string;
  currentPeriodEnd: string | null;
}

export default function UsageWidget() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/status', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setData(json);
    } catch {
      // silent fail — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  if (loading || !data) {
    return (
      <div className="p-3 border border-b-divider rounded-lg bg-surface-card-hover/20 text-[10px] text-t-on-dark-faint font-mono uppercase tracking-widest">
        Loading usage…
      </div>
    );
  }

  const pct = data.percentUsed;
  const barColor = pct < 60 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';
  const plan = data.plan;

  const ctaLabel =
    plan === 'FREE' ? 'UPGRADE →' : plan === 'PRO' ? 'UPGRADE TO BUSINESS →' : null;

  return (
    <div
      className={`font-mono rounded-lg border ${
        pct >= 90 ? 'border-red-500/40' : 'border-b-divider'
      } bg-surface-header/80 p-3 space-y-2.5 text-t-on-dark`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] rounded ${
            plan === 'BUSINESS'
              ? 'bg-accent text-white'
              : plan === 'PRO'
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'bg-surface-badge text-t-on-dark-muted border border-b-divider'
          }`}
        >
          {plan}
        </span>
        <span className="text-[9px] text-t-on-dark-faint uppercase tracking-widest tabular-nums">
          {data.daysLeft}d left
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-t-on-dark-muted tabular-nums">
            {data.leadsUsed.toLocaleString()}/{data.leadsLimit.toLocaleString()} leads
          </span>
          <span className="text-[10px] font-bold text-t-on-dark tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-surface-badge rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {ctaLabel && (
        <Link
          href="/dashboard/upgrade"
          className={`w-full block text-center px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${
            plan === 'FREE'
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'border border-accent/40 text-accent hover:bg-accent/10'
          }`}
        >
          {ctaLabel}
        </Link>
      )}
      {plan === 'BUSINESS' && (
        <div className="text-[9px] text-t-on-dark-faint uppercase tracking-widest text-center">
          top tier · unlimited features
        </div>
      )}
    </div>
  );
}

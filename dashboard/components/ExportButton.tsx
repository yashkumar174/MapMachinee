'use client';

import { useState } from 'react';
import UpgradeModal from './UpgradeModal';

type PlanKey = 'FREE' | 'PRO' | 'BUSINESS';

interface ExportButtonProps {
  status?: string;
  category?: string;
  plan?: PlanKey;
}

export default function ExportButton({ status, category, plan = 'FREE' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const locked = plan === 'FREE';

  const handleExport = async () => {
    if (locked) {
      setShowUpgrade(true);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      const query = params.toString();

      const res = await fetch(`/api/export${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = [status, category].filter(Boolean).join('_') || 'all';
      a.download = `leads_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export leads.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={loading}
        title={locked ? 'CSV Export is a Pro feature — click to upgrade' : status ? `Export ${status} leads` : 'Export all leads'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg shadow-sm hover:opacity-80 transition-all disabled:opacity-50 uppercase tracking-widest font-mono relative ${
          locked
            ? 'bg-surface-badge text-t-muted border border-b-default'
            : 'bg-surface-header text-t-on-dark'
        }`}
      >
        {locked ? (
          <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        {loading ? 'Exporting...' : locked ? 'Export CSV · Pro' : 'Export CSV'}
      </button>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} currentPlan={plan} />
    </>
  );
}

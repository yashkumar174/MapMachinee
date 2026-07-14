'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SendToCRMButton({ leadId, inPipeline }: { leadId: number, inPipeline: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (inPipeline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-badge text-t-muted text-[10px] font-bold rounded-lg border border-transparent uppercase tracking-widest whitespace-nowrap opacity-60">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        In Pipeline
      </span>
    );
  }

  const handleSend = async () => {
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inPipeline: true, status: 'New Leads' }),
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      title="Promote this lead to your CRM Kanban Board"
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white hover:bg-accent-hover text-[11px] font-black rounded-lg border border-accent/60 transition-all uppercase tracking-widest whitespace-nowrap disabled:opacity-50 shadow-md shadow-accent/25"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      )}
      Add to CRM
    </button>
  );
}

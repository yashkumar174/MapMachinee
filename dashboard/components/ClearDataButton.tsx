'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearDataButton({ leadCount, target = 'Lost' }: { leadCount: number, target?: 'new' | 'Lost' }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (leadCount === 0) return null;

  const handleClear = async () => {
    const stageName = target === 'new' ? 'NEW' : 'LOST';
    if (!confirm(`Are you sure you want to permanently delete all ${stageName} leads? Leads in other stages will not be affected.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?target=${target}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete leads');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to clear database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClear}
      disabled={loading}
      className="text-[10px] font-bold text-[#FD551D] hover:text-[#ff7a4d] hover:bg-[#ff7a4d]/5 px-3 py-1.5 rounded-lg border border-transparent hover:border-[#ff7a4d]/20 transition-colors uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
    >
      {loading ? 'Clearing...' : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Clear {target}
        </>
      )}
    </button>
  );
}

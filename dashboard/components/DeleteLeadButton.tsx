'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteLeadButton({ leadId }: { leadId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this lead? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      console.error("Failed to delete lead", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Permanently delete this lead"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 hover:bg-accent hover:text-white text-[10px] font-bold text-accent rounded-md uppercase tracking-wider transition-all mt-auto disabled:opacity-50"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-surface-badge border-t-white rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      )}
      Delete
    </button>
  );
}

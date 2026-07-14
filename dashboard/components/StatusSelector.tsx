'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-surface-input text-t-primary border-transparent hover:border-b-muted' },
  { value: 'follow up', label: 'Follow Up', color: 'bg-surface-badge text-t-primary border-transparent border-l-2 hover:border-l-accent' },
  { value: 'interested', label: 'Interested', color: 'bg-surface-input text-t-primary border-transparent' },
  { value: 'closed', label: 'Closed', color: 'bg-surface-badge opacity-60 text-t-muted border-transparent' },
];

export default function StatusSelector({ leadId, currentStatus }: { leadId: number; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus || 'new');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = async (newStatus: string) => {
    setSaving(true);
    setStatus(newStatus);
    setOpen(false);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err) {
      setStatus(currentStatus);
    } finally {
      setSaving(false);
    }
  };

  const current = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${current.color} uppercase tracking-wider cursor-pointer transition-all hover:ring-1 hover:ring-accent/20 disabled:opacity-50 min-w-[100px] justify-between shadow-sm`}
      >
        {current.label}
        <svg className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-surface-card rounded-lg shadow-xl border border-b-default py-1 z-20 min-w-[130px] animate-in fade-in zoom-in-95 duration-200">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleChange(opt.value)}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                opt.value === status ? 'bg-surface-header text-accent' : 'text-t-secondary hover:bg-surface-hover hover:text-t-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

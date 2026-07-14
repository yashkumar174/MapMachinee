'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CategoryFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('category') || '';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('category', val);
    } else {
      params.delete('category');
    }
    router.push(`/dashboard?${params.toString()}`);
    setIsOpen(false);
  };

  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-t-faint uppercase tracking-widest hidden sm:block">Filter:</label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 bg-surface-base border rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-accent min-w-[180px] max-w-[240px] text-left ${
          isOpen ? 'border-accent ring-1 ring-accent/30' : 'border-b-muted hover:border-t-muted'
        }`}
      >
        <span className="truncate text-t-primary">{current || 'All Categories'}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-accent' : 'text-t-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 min-w-[220px] max-h-[300px] overflow-y-auto bg-surface-card border border-b-muted rounded-xl shadow-2xl shadow-black/80 z-[100] py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleChange('')}
            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${
              !current ? 'bg-accent/15 text-accent border-l-4 border-l-accent' : 'text-t-primary hover:bg-surface-header border-l-4 border-l-transparent'
            }`}
          >
            All Categories
          </button>
          
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleChange(cat)}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors truncate ${
                current === cat ? 'bg-accent/15 text-accent border-l-4 border-l-accent' : 'text-t-primary hover:bg-surface-header border-l-4 border-l-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

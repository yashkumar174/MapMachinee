'use client';

import { useState, createContext, useContext, useRef } from 'react';

interface FilterContextType {
  activeFilter: string | null;
  setActiveFilter: (filter: string | null) => void;
  highlightedIds: Set<number>;
}

const FilterContext = createContext<FilterContextType>({
  activeFilter: null,
  setActiveFilter: () => {},
  highlightedIds: new Set(),
});

export function useStatFilter() {
  return useContext(FilterContext);
}

// ── Provider that wraps the stats grid + table ──
interface StatFilterProviderProps {
  children: React.ReactNode;
  filterMap: Record<string, number[]>; // key => array of lead IDs that match
}

export function StatFilterProvider({ children, filterMap }: StatFilterProviderProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const highlightedIds = activeFilter && filterMap[activeFilter]
    ? new Set(filterMap[activeFilter])
    : new Set<number>();

  const handleSetFilter = (filter: string | null) => {
    setActiveFilter(prev => prev === filter ? null : filter); // toggle
  };

  return (
    <FilterContext.Provider value={{ activeFilter, setActiveFilter: handleSetFilter, highlightedIds }}>
      {children}
    </FilterContext.Provider>
  );
}


// ── Clickable Stat Card ──
interface StatCardFilterProps {
  title: string;
  value: number;
  icon: string;
  filterKey: string;
}

export function StatCardFilter({ title, value, icon, filterKey }: StatCardFilterProps) {
  const { activeFilter, setActiveFilter } = useStatFilter();
  const isActive = activeFilter === filterKey;

  return (
    <button
      onClick={() => setActiveFilter(filterKey)}
      className={`bg-surface-card border rounded-xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md cursor-pointer text-left w-full ${
        isActive
          ? 'border-accent ring-2 ring-accent/20 shadow-lg shadow-accent/10'
          : 'border-b-default hover:border-b-muted'
      }`}
    >
      <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-accent text-white' : 'bg-accent-bg text-accent'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-[10px] font-bold text-t-faint uppercase tracking-widest">{title}</p>
        <p className={`text-2xl font-black tracking-tight mt-0.5 transition-colors ${isActive ? 'text-accent' : 'text-t-primary'}`}>{value}</p>
      </div>
      {isActive && (
        <div className="ml-auto">
          <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
            Active
          </span>
        </div>
      )}
    </button>
  );
}

// ── Lead Row Wrapper that applies highlight ──
interface LeadRowHighlightProps {
  leadId: number;
  children: React.ReactNode;
  index: number;
}

export function LeadRowHighlight({ leadId, children, index }: LeadRowHighlightProps) {
  const { activeFilter, highlightedIds } = useStatFilter();

  const isHighlighted = activeFilter ? highlightedIds.has(leadId) : false;
  const isDimmed = activeFilter ? !highlightedIds.has(leadId) : false;

  const rowRef = useRef<HTMLTableRowElement>(null);

  return (
    <tr
      ref={rowRef}
      id={`lead-row-${leadId}`}
      className={`transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2 fill-mode-both ${
        isHighlighted
          ? 'bg-accent/5 ring-1 ring-inset ring-accent/20 hover:bg-accent/10'
          : isDimmed
          ? 'opacity-30 hover:opacity-60 hover:bg-surface-card-hover'
          : 'hover:bg-surface-card-hover'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {children}
    </tr>
  );
}

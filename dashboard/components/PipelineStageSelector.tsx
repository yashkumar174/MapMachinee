'use client';

import { useState, useRef, useEffect } from 'react';

const STAGE_COLORS: Record<string, string> = {
  'interested': 'bg-surface-badge text-t-primary border-b-muted hover:border-t-muted',
  'Attempting Contact': 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:border-sky-500/40',
  'In Discussion': 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/40',
  'Meeting Booked': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40',
  'In Development': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/40',
  'Client Review': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 hover:border-fuchsia-500/40',
  'Completed': 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
  'Lost': 'bg-[#FD551D]/20 text-[#FD551D] border-[#FD551D]/30 hover:border-[#FD551D]/50',
  'Nurturing': 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:border-slate-500/40',
};

const DEFAULT_COLOR = 'bg-surface-badge text-t-primary border-b-muted hover:border-t-muted';

interface PipelineStageSelectorProps {
  currentStage: string;
  stages: string[];
  onChange: (newStage: string) => void;
  disabled?: boolean;
}

export default function PipelineStageSelector({
  currentStage,
  stages,
  onChange,
  disabled = false
}: PipelineStageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; dropUp: boolean }>({ top: 0, left: 0, width: 180, dropUp: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleScroll() {
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldDropUp = spaceBelow < 300;
      setMenuPos({
        top: shouldDropUp ? rect.top : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 180),
        dropUp: shouldDropUp,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (stage: string) => {
    onChange(stage);
    setIsOpen(false);
  };

  const activeColorClass = STAGE_COLORS[currentStage] || DEFAULT_COLOR;

  return (
    <div className="relative inline-block w-full max-w-[180px]" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${activeColorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate flex-1 text-left">{currentStage}</span>
        <svg 
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="fixed z-[9999] bg-surface-card border border-b-divider rounded-lg shadow-2xl overflow-y-auto max-h-[260px] animate-in fade-in duration-150"
          style={{
            top: menuPos.dropUp ? undefined : `${menuPos.top}px`,
            bottom: menuPos.dropUp ? `${window.innerHeight - menuPos.top + 4}px` : undefined,
            left: `${menuPos.left}px`,
            width: `${menuPos.width}px`,
          }}
        >
          <div className="p-1">
            {stages.map((stage) => {
              const isSelected = stage === currentStage;
              const styleClass = STAGE_COLORS[stage] || DEFAULT_COLOR;
              
              return (
                <button
                  key={stage}
                  onClick={() => handleSelect(stage)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors text-left
                    ${isSelected ? 'bg-surface-card-hover' : 'hover:bg-surface-card-hover text-t-muted hover:text-t-primary'}
                  `}
                >
                  <div className={`w-2 h-2 rounded-full border ${styleClass.replace('bg-', 'bg-').split(' ')[0]} ${styleClass.split(' ').find(c => c.startsWith('border-'))}`} />
                  
                  <span className="flex-1 truncate">{stage}</span>
                  
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-t-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

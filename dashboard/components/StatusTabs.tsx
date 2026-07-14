'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import gsap from 'gsap';

const TABS = [
  { key: 'new', label: 'New' },
  { key: 'follow up', label: 'Follow Up' },
  { key: 'interested', label: 'Interested' },
  { key: 'Lost', label: 'Lost' },
];

export default function StatusTabs({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('status') || '';
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleClick = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key) {
      params.set('status', key);
    } else {
      params.delete('status');
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTab !== key) setDragOverTab(key);
  };

  const handleDragLeave = () => {
    setDragOverTab(null);
  };

  const handleDrop = async (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverTab(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    // Don't update if dropping on the currently active tab
    if (current === key || (current === '' && key === 'new')) return;

    // --- GSAP SUCK-IN ANIMATION ---
    const rowEl = document.getElementById(`lead-row-${leadId}`);
    const tabEl = document.getElementById(`status-tab-${key.replace(/\s+/g, '-')}`);

    if (rowEl && tabEl) {
      const clone = rowEl.cloneNode(true) as HTMLElement;
      const rowRect = rowEl.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();

      // Position clone exactly over original
      clone.style.position = 'fixed';
      clone.style.top = `${rowRect.top}px`;
      clone.style.left = `${rowRect.left}px`;
      clone.style.width = `${rowRect.width}px`;
      clone.style.height = `${rowRect.height}px`;
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      clone.style.margin = '0';
      clone.style.opacity = '1';
      clone.style.backgroundColor = '#141314'; // Brutalist dark bg matching surface-card
      clone.style.border = '1px solid #FD551D'; // Flashing orange border
      clone.style.boxShadow = '0 10px 25px -5px rgba(253, 85, 29, 0.4)';
      
      document.body.appendChild(clone);

      // Hide original immediately
      gsap.set(rowEl, { autoAlpha: 0 });

      // Calculate translation to the center of the tab
      const destX = (tabRect.left + tabRect.width / 2) - (rowRect.left + rowRect.width / 2);
      const destY = (tabRect.top + tabRect.height / 2) - (rowRect.top + rowRect.height / 2);

      gsap.to(clone, {
        x: destX,
        y: destY,
        scale: 0.05,
        opacity: 0,
        rotation: (Math.random() - 0.5) * 15, // slight twist
        duration: 0.6,
        ease: 'power3.in',
        onComplete: () => {
          clone.remove();
          // Bounce the tab receiving the row
          gsap.fromTo(tabEl, { scale: 1.15, filter: 'brightness(1.5)' }, { scale: 1, filter: 'brightness(1)', duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        }
      });
    }

    setIsUpdating(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: key }),
      });
      // Refresh to update counts and move row
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-surface-badge p-1 rounded-lg font-mono">
      {TABS.map((tab) => {
        const isActive = current === tab.key || (current === '' && tab.key === 'new');
        const count = counts[tab.key] || 0;
        return (
          <button
            key={tab.key}
            id={`status-tab-${tab.key.replace(/\s+/g, '-')}`}
            onClick={() => handleClick(tab.key)}
            onDragOver={(e) => handleDragOver(e, tab.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all uppercase tracking-wider flex items-center gap-2 ${
              dragOverTab === tab.key
                ? 'bg-accent/20 text-accent ring-2 ring-accent scale-105 shadow-xl'
                : isActive
                ? 'bg-surface-header text-t-on-dark shadow-md'
                : 'text-t-muted hover:text-t-primary hover:bg-surface-card/50'
            } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black transition-colors ${
              dragOverTab === tab.key ? 'bg-accent text-white' : isActive ? 'bg-accent text-white' : 'text-t-faint'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

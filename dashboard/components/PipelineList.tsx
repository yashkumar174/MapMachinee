'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { LeadDetailsModal } from './LeadDetailsModal';
import PipelineStageSelector from './PipelineStageSelector';
import NotesEditor from './NotesEditor';
import CopyButton from './CopyButton';

export interface PipelineLead {
  id: number;
  name: string;
  phone?: string | null;
  emails?: string | null;
  category?: string | null;
  status: string;
  rating?: string | null;
  agent?: string | null;
  propertyName?: string | null;
  visitTime?: Date | string | null;
  notes?: string | null;
  website?: string | null;
  maps_url?: string | null;
  cms_type?: string | null;
  has_website?: boolean;
  load_time?: number | null;
  mobile_friendly?: boolean;
  has_booking?: boolean;
  error?: string | null;
  createdAt?: Date | string;
  updatedAt: Date | string;
  inPipeline?: boolean;
  dealValue?: number;
  probability?: number;
  lastContactedAt?: Date | string | null;
  nextFollowUp?: Date | string | null;
}

const ROT_THRESHOLD_DAYS = 7;

function daysSince(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const then = new Date(d).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export default function PipelineList({ initialLeads, isAdmin = false, stages, plan = 'FREE' }: { initialLeads: PipelineLead[], isAdmin?: boolean, stages: string[], plan?: 'FREE' | 'PRO' | 'BUSINESS' }) {
  const [leads, setLeads] = useState<PipelineLead[]>(initialLeads);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [isDraggingLead, setIsDraggingLead] = useState<boolean>(false);
  
  // Modal state
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  
  // Hot-List Gamification State
  const [isHotListMode, setIsHotListMode] = useState(false);

  const router = useRouter();

  // Filter leads client-side
  const filtered = leads.filter(l => {
    const matchesSearch = 
      (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
      (l.emails && l.emails.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone && l.phone.includes(search));
      
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    
    // Check if it's hot
    const isRotting = !['Lost', 'Completed'].includes(l.status) && (daysSince(l.lastContactedAt) ?? 0) >= ROT_THRESHOLD_DAYS;
    const isDueToday = l.nextFollowUp && !['Lost', 'Completed'].includes(l.status) ? isSameLocalDay(new Date(l.nextFollowUp), new Date()) : false;
    
    const matchesHotList = isHotListMode ? (isRotting || isDueToday) : true;

    return matchesSearch && matchesStatus && matchesHotList;
  });

  // Calculate hot metrics globally for the banner
  const hotMetrics = leads.reduce((acc, l) => {
    if (['Lost', 'Completed'].includes(l.status)) return acc;
    if ((daysSince(l.lastContactedAt) ?? 0) >= ROT_THRESHOLD_DAYS) acc.rotCount++;
    if (l.nextFollowUp && isSameLocalDay(new Date(l.nextFollowUp), new Date())) acc.dueCount++;
    return acc;
  }, { rotCount: 0, dueCount: 0 });

  // Speed-Run Traversals
  const handleNextLead = () => {
    if (!selectedLead) return;
    const idx = filtered.findIndex(l => l.id === selectedLead.id);
    if (idx >= 0 && idx < filtered.length - 1) setSelectedLead(filtered[idx + 1]);
  };

  const handlePrevLead = () => {
    if (!selectedLead) return;
    const idx = filtered.findIndex(l => l.id === selectedLead.id);
    if (idx > 0) setSelectedLead(filtered[idx - 1]);
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdatingId(leadId);
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      // Revert on error
      setLeads(initialLeads);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotesChange = (leadId: number, newNotes: string, nextFollowUp?: string | null) => {
    // Optimistic update: saving a note resets the rot timer; optionally schedule a follow-up
    const nowISO = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      notes: newNotes,
      lastContactedAt: nowISO,
      ...(nextFollowUp !== undefined ? { nextFollowUp } : {}),
    } : l));
    router.refresh();
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, leadId: number) => {
    setIsDraggingLead(true);
    e.dataTransfer.setData('text/plain', leadId.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Custom Drag Image
    const dragIcon = document.createElement('div');
    dragIcon.className = "bg-accent border border-accent-light text-white font-black tracking-widest text-[10px] px-3 py-1.5 rounded flex items-center gap-2 shadow-2xl shadow-accent/30";
    dragIcon.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8h16M4 16h16"></path></svg> MOVING LEAD`;
    
    document.body.appendChild(dragIcon);
    dragIcon.style.position = "absolute";
    dragIcon.style.top = "-1000px";
    e.dataTransfer.setDragImage(dragIcon, 30, 15);

    setTimeout(() => {
      document.body.removeChild(dragIcon);
      const rowEl = document.getElementById(`lead-row-${leadId}`);
      if (rowEl) {
        gsap.to(rowEl, { opacity: 0.3, scale: 0.98, duration: 0.3, transformOrigin: 'center center' });
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>, leadId: number) => {
    const rowEl = document.getElementById(`lead-row-${leadId}`);
    if (rowEl) {
      gsap.to(rowEl, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out' });
    }
    setTimeout(() => setIsDraggingLead(false), 200);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTab !== stage) setDragOverTab(stage);
  };

  const handleDragLeave = () => setDragOverTab(null);

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverTab(null);
    const leadIdStr = e.dataTransfer.getData('text/plain');
    if (!leadIdStr) return;
    const leadId = parseInt(leadIdStr, 10);

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === stage) return;

    // --- GSAP SUCK-IN ANIMATION ---
    const rowEl = document.getElementById(`lead-row-${leadId}`);
    
    // Exactly resolve the target we dropped onto (either the Header Tab or the Overlay Pill)
    const tabEl = e.currentTarget as HTMLElement;

    if (rowEl && tabEl) {
      const clone = rowEl.cloneNode(true) as HTMLElement;
      const rowRect = rowEl.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();

      clone.style.position = 'fixed';
      clone.style.top = `${rowRect.top}px`;
      clone.style.left = `${rowRect.left}px`;
      clone.style.width = `${rowRect.width}px`;
      clone.style.height = `${rowRect.height}px`;
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      clone.style.margin = '0';
      clone.style.opacity = '1';
      clone.style.backgroundColor = '#141314';
      clone.style.border = '1px solid #FD551D';
      clone.style.boxShadow = '0 10px 25px -5px rgba(253, 85, 29, 0.4)';
      
      document.body.appendChild(clone);

      // Fix empty gap: If filtering by a specific stage, moving the lead removes it from the list.
      // We set display:none so the list instantly slides up.
      if (statusFilter !== 'All') {
        gsap.set(rowEl, { display: 'none' });
      } else {
        // If in 'All' stages, it stays in the list, so just blink it.
        gsap.to(rowEl, { opacity: 0.3, duration: 0.2, yoyo: true, repeat: 1 });
      }

      const destX = (tabRect.left + tabRect.width / 2) - (rowRect.left + rowRect.width / 2);
      const destY = (tabRect.top + tabRect.height / 2) - (rowRect.top + rowRect.height / 2);

      gsap.to(clone, {
        x: destX,
        y: destY,
        scale: 0.1,
        opacity: 0,
        rotation: (Math.random() - 0.5) * 20,
        duration: 0.5,
        ease: 'power3.in',
        onComplete: () => {
          clone.remove();
          gsap.fromTo(tabEl, { scale: 1.15, filter: 'brightness(1.5)' }, { scale: 1, filter: 'brightness(1)', duration: 0.5, ease: 'elastic.out(1, 0.4)' });
          // Clear GSAP inline styles so if the row wasn't removed by React (e.g. 'All Stages'), it remains visible natively.
          if (rowEl) gsap.set(rowEl, { clearProps: "all" });
        }
      });
    }

    handleStatusChange(leadId, stage);
  };

  return (
    <>
      {/* TODAY'S MONEY / HOT LIST BANNER */}
      {(hotMetrics.rotCount > 0 || hotMetrics.dueCount > 0) && (
        <div 
          onClick={() => setIsHotListMode(!isHotListMode)}
          className={`cursor-pointer w-full mb-6 px-5 py-3 rounded-xl border flex items-center justify-between transition-all animate-in zoom-in-95 font-mono shadow-sm ${
            isHotListMode 
              ? 'bg-accent/10 border-accent/40 ring-1 ring-accent/30' 
              : 'bg-surface-card border-b-default hover:bg-surface-card-hover hover:border-accent/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-surface-header ${isHotListMode ? 'text-accent' : 'text-[#FD551D]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FD551D] flex items-center gap-1.5">
                Today&apos;s Money <span className="opacity-50 font-normal tracking-normal">- Action Required</span>
              </p>
              <div className="flex items-center gap-4 mt-0.5 text-xs text-t-primary">
                {hotMetrics.rotCount > 0 && <span><b className="text-accent">{hotMetrics.rotCount}</b> Rotting Deals</span>}
                {hotMetrics.dueCount > 0 && <span><b className="text-emerald-500">{hotMetrics.dueCount}</b> Follow-ups Due</span>}
              </div>
            </div>
          </div>
          <button className={`px-4 py-1.5 rounded text-[10px] uppercase font-black tracking-widest transition-colors ${
            isHotListMode 
              ? 'bg-accent text-white shadow-md' 
              : 'bg-surface-input border border-b-muted text-t-primary hover:border-accent'
          }`}>
            {isHotListMode ? 'Clear Focus' : 'Focus Hot Mode'}
          </button>
        </div>
      )}

      <div className="bg-surface-card rounded-xl shadow-lg border border-b-default overflow-hidden flex flex-col max-h-full h-full">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-b-divider flex flex-col gap-4 bg-surface-header">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search leads by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-surface-input border border-b-muted rounded-lg text-sm text-t-primary focus:ring-2 focus:ring-accent focus:border-accent outline-none placeholder:text-t-ghost transition-all font-semibold"
          />
        </div>
        
          <div className="flex flex-nowrap items-center gap-1.5 bg-surface-badge p-1 rounded-lg overflow-x-auto min-w-full no-scrollbar scroll-smooth">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1.5 text-[10px] sm:text-[11px] font-bold rounded-md transition-all uppercase tracking-wider flex flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap min-w-fit ${
                statusFilter === 'All'
                  ? 'bg-surface-header text-t-on-dark shadow-md ring-1 ring-white/10'
                  : 'text-t-muted hover:text-t-primary hover:bg-surface-card/50'
              }`}
            >
              All Stages
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1 ${
                statusFilter === 'All' ? 'bg-white/20 text-white' : 'bg-surface-card/50 text-t-faint'
              }`}>
                {leads.length}
              </span>
            </button>
            
            {stages.map(stage => {
              const count = leads.filter(l => l.status === stage).length;
              const isActive = statusFilter === stage;
              
              return (
                <button
                  key={stage}
                  id={`pipeline-tab-${stage.replace(/\s+/g, '-')}`}
                  onClick={() => setStatusFilter(stage)}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`px-3 py-1.5 text-[10px] sm:text-[11px] font-bold rounded-md transition-all uppercase tracking-wider flex flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap min-w-fit ${
                    dragOverTab === stage
                      ? 'bg-accent/20 text-accent border border-accent/40 shadow-lg scale-105'
                      : isActive
                      ? 'bg-surface-header text-t-on-dark shadow-md ring-1 ring-white/10'
                      : 'text-t-muted hover:text-t-primary hover:bg-surface-card/50'
                  }`}
                >
                  {stage}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1 transition-all ${
                    dragOverTab === stage 
                      ? 'bg-accent text-white' 
                      : isActive ? 'bg-white/20 text-white' : 'bg-surface-card/50 text-t-faint'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
      </div>

      {/* CRM Data Table */}
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-b-divider">
          <thead className="bg-surface-table-stripe sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest min-w-[200px]">Lead Info</th>
              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest">Contact</th>
              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest min-w-[200px]">Pipeline Stage</th>
              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-t-faint uppercase tracking-widest hidden lg:table-cell">Notes</th>
              <th scope="col" className="px-6 py-3 text-right text-[10px] font-bold text-t-faint uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface-card divide-y divide-b-divider-light">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-t-muted text-sm font-medium">
                  No leads found matching your search.
                </td>
              </tr>
            ) : (
              filtered.map((lead, index) => {
                const rotDays = daysSince(lead.lastContactedAt);
                const isRotting = rotDays !== null && rotDays > ROT_THRESHOLD_DAYS
                  && !['Completed', 'Lost'].includes(lead.status);
                const followUpDate = lead.nextFollowUp ? new Date(lead.nextFollowUp) : null;
                const isDueToday = followUpDate ? isSameLocalDay(followUpDate, new Date()) : false;

                return (
                <tr
                  key={lead.id}
                  id={`lead-row-${lead.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={(e) => handleDragEnd(e, lead.id)}
                  className={`hover:bg-surface-card-hover transition-colors group cursor-grab active:cursor-grabbing animate-in fade-in slide-in-from-bottom-2 fill-mode-both ${
                    isRotting ? 'border-l-4 border-l-red-500/70 bg-red-500/5' : ''
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5">
                        <a href={lead.maps_url || '#'} target="_blank" rel="noopener noreferrer" title={lead.name} className="text-sm font-bold text-t-primary group-hover:text-accent transition-colors">
                          {lead.name.split(' ').length > 6 ? lead.name.split(' ').slice(0, 6).join(' ') + '...' : lead.name}
                        </a>
                        {isRotting && (
                          <div className="relative group/rot flex items-center">
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-400 text-[9px] font-black uppercase tracking-widest leading-none cursor-help"
                            >
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13.5 2c.3 3-1.2 4.8-2.6 6.1C9.3 9.7 8 11.3 8 13.8c0 1.6.7 3 1.7 4-.2-.5-.2-1-.2-1.4 0-1.6 1-2.6 2-3.7 1-1 2-2 2-3.4 2.5 1.4 4 3.8 4 6.7a6 6 0 11-12 0c0-3.6 2-5.7 3.8-7.4C11.1 6.9 13 5 13.5 2z" />
                              </svg>
                              {rotDays}d
                            </span>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/rot:block w-max max-w-[200px] bg-surface-header border border-b-divider p-2.5 rounded-lg shadow-xl z-[100] text-[10px] font-medium text-t-secondary whitespace-normal text-center leading-relaxed font-sans">
                              <strong className="text-red-400 block mb-0.5 text-[10px] font-black uppercase tracking-widest font-mono">Rotting Deal</strong>
                              It has been <b className="text-t-primary">{rotDays} days</b> since this lead was last contacted.
                            </div>
                          </div>
                        )}
                      </div>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-t-secondary hover:text-accent font-bold mt-1 uppercase tracking-widest flex items-center gap-1 w-fit">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          Website
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-1.5 justify-center mt-0.5">
                      {isDueToday && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 border border-accent/50 text-accent text-[9px] font-black uppercase tracking-widest w-fit leading-none">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Due Today
                        </span>
                      )}
                      {lead.phone ? (
                        <div className="text-xs font-semibold text-t-secondary flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-t-ghost shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {lead.phone.replace(/[^\d\s\-\+()]/g, '').trim()}
                          <CopyButton text={lead.phone.replace(/[^\d\s\-\+()]/g, '').trim()} label="phone" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-t-faint uppercase px-2 py-0.5 bg-surface-badge rounded">No Phone</span>
                      )}
                      
                      {lead.emails ? (
                        <div className="text-xs font-semibold text-t-secondary flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-t-ghost shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          <span className="break-all">{lead.emails.split(',')[0].trim()}</span>
                          <CopyButton text={lead.emails.split(',')[0].trim()} label="email" />
                        </div>
                      ) : (
                         <span className="text-[10px] font-bold text-t-faint uppercase px-2 py-0.5 bg-surface-badge rounded w-fit">No Email</span>
                      )}
                    </div>
                  </td>

                  {/* Pipeline Stage */}
                  <td className="px-6 py-4 align-top">
                    <PipelineStageSelector
                      currentStage={lead.status}
                      stages={stages}
                      onChange={(newStage) => handleStatusChange(lead.id, newStage)}
                      disabled={updatingId === lead.id}
                    />
                    
                    {/* Timestamp */}
                    <div className="mt-2 text-[10px] font-semibold text-t-faint flex items-center gap-1 uppercase tracking-widest">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       {new Date(lead.updatedAt).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Notes & Agent */}
                  <td className="px-6 py-4 align-top hidden lg:table-cell">
                    <div className="flex flex-col items-start gap-1 w-[250px] max-w-full">

                       <NotesEditor
                         leadId={lead.id}
                         initialNotes={lead.notes || null}
                         initialFollowUp={lead.nextFollowUp ?? null}
                         variant="compact"
                         onSave={(newNotes, nextFollowUp) => handleNotesChange(lead.id, newNotes, nextFollowUp)}
                       />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 align-top text-right">
                    <div className="flex flex-col items-end justify-start gap-2 h-full">
                       <button
                         onClick={() => setSelectedLead(lead)}
                         className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-input border border-b-muted hover:border-accent hover:text-accent rounded-md text-[10px] font-bold text-t-primary uppercase tracking-wider transition-all whitespace-nowrap"
                       >
                         View Details
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                       </button>

                       {lead.status === 'Lost' && (
                         <button
                           onClick={async () => {
                             if (window.confirm('Are you absolutely sure you want to permanently delete this lost lead from the database? This cannot be undone.')) {
                               setUpdatingId(lead.id);
                               try {
                                 await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
                                 setLeads(prev => prev.filter(l => l.id !== lead.id));
                                 router.refresh();
                               } catch(e) { console.error('Delete failed:', e); }
                               finally { setUpdatingId(null); }
                             }
                           }}
                           disabled={updatingId === lead.id}
                           className="inline-flex mt-[0.5px] items-center gap-1.5 px-3 py-1.5 bg-[#FD551D]/20 hover:bg-[#FD551D]/80 border border-[#FD551D]/30 text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                           title="Permanently remove this lost lead."
                         >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           Delete Lead
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onNext={handleNextLead}
          onPrev={handlePrevLead}
          canNext={filtered.findIndex(l => l.id === selectedLead.id) < filtered.length - 1}
          canPrev={filtered.findIndex(l => l.id === selectedLead.id) > 0}
          plan={plan}
        />
      )}

      <PipelineFloatingDropZones 
        isDraggingLead={isDraggingLead} 
        stages={stages}
        dragOverTab={dragOverTab}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </div>
    </>
  );
}

function PipelineFloatingDropZones({
  isDraggingLead,
  stages,
  dragOverTab,
  onDragOver,
  onDragLeave,
  onDrop
}: {
  isDraggingLead: boolean;
  stages: string[];
  dragOverTab: string | null;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, key: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.set(containerRef.current, { xPercent: -50 });
  }, []);

  useEffect(() => {
    if (isDraggingLead) {
      gsap.to(containerRef.current, { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' });
    } else {
      gsap.to(containerRef.current, { y: 50, autoAlpha: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' });
    }
  }, [isDraggingLead]);

  // Dynamically map ALL Stages + Lost
  const dropTabs = [
    ...stages.map((stage) => ({
      key: stage, 
      label: stage.toUpperCase(),
      isActiveColor: 'text-accent',
      activeClasses: 'scale-[1.03] shadow-xl shadow-accent/20 border-accent bg-accent/10'
    })),
    { 
      key: 'Lost', 
      label: 'LOST',
      isActiveColor: 'text-red-500',
      activeClasses: 'scale-[1.03] shadow-xl shadow-red-500/20 border-red-500 bg-red-500/10'
    }
  ];

  const uniqueTabs = dropTabs.filter((tab, index, self) => self.findIndex(t => t.key === tab.key) === index);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-8 left-1/2 z-[10000] flex flex-wrap justify-center gap-3 p-4 rounded-[2rem] bg-surface-header/85 backdrop-blur-xl border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] invisible pointer-events-auto w-[94vw] max-w-5xl"
    >
       {uniqueTabs.map(tab => (
         <div 
           key={tab.key}
           id={`pipeline-overlay-tab-${tab.key.replace(/\s+/g, '-')}`}
           onDragOver={(e) => onDragOver(e, tab.key)}
           onDragLeave={onDragLeave}
           onDrop={(e) => onDrop(e, tab.key)}
           className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 border grow basis-[130px] max-w-[180px] shrink-0 transition-all duration-300 ease-out cursor-pointer ${
             dragOverTab === tab.key 
               ? tab.activeClasses
               : 'border-white/5 bg-surface-card hover:bg-surface-card-hover hover:border-white/10 shadow-sm text-t-secondary hover:text-white hover:-translate-y-0.5'
           }`}
         >
            <svg className={`w-4 h-4 shrink-0 transition-colors ${dragOverTab === tab.key ? tab.isActiveColor : 'text-current opacity-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
            <p className={`font-black tracking-widest text-[9px] sm:text-[10px] uppercase truncate transition-colors ${dragOverTab === tab.key ? tab.isActiveColor : 'text-current'}`}>
              {tab.label}
            </p>
         </div>
       ))}
    </div>
  );
}

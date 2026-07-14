"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthProvider';
import UsernameEditor from './UsernameEditor';

// ── Types ──
interface StatCardOption {
  key: string;
  label: string;
  icon: string;
}

interface ScoringRule {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'exists';
  value: string | number | boolean;
  points: number;
}

const ALL_STAT_OPTIONS: StatCardOption[] = [
  { key: 'totalLeads', label: 'Total Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'noWebsite', label: 'No Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  { key: 'noBooking', label: 'No Booking', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'notMobile', label: 'Not Mobile-Ready', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { key: 'hasEmails', label: 'Has Emails', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'hasPhone', label: 'Has Phone', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { key: 'slowLoad', label: 'Slow Load (>3s)', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'lowReviews', label: 'Low Reviews (<50)', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
];

const PRESET_RULES = [
  { label: 'Lead has a website', get: () => ({ field: 'has_website', op: 'eq', value: true }) },
  { label: 'Lead does NOT have a website', get: () => ({ field: 'has_website', op: 'eq', value: false }) },
  { label: 'Lead is mobile friendly', get: () => ({ field: 'mobile_friendly', op: 'eq', value: true }) },
  { label: 'Lead is NOT mobile friendly', get: () => ({ field: 'mobile_friendly', op: 'eq', value: false }) },
  { label: 'Lead has an online booking system', get: () => ({ field: 'has_booking', op: 'eq', value: true }) },
  { label: 'Lead has emails', get: () => ({ field: 'emails', op: 'exists', value: true }) },
  { label: 'Lead has phone number', get: () => ({ field: 'phone', op: 'exists', value: true }) },
  { label: 'Load time is less than 3s', get: () => ({ field: 'load_time', op: 'lt', value: 3 }) },
  { label: 'Load time is greater than 3s', get: () => ({ field: 'load_time', op: 'gt', value: 3 }) },
];

function getPresetLabel(rule: ScoringRule) {
  const match = PRESET_RULES.find(p => {
    const r = p.get();
    return r.field === rule.field && r.op === rule.op && r.value === rule.value;
  });
  return match ? match.label : 'Custom Rule';
}

function getPresetFromLabel(label: string) {
  const match = PRESET_RULES.find(p => p.label === label);
  return match ? match.get() : PRESET_RULES[0].get();
}

type TabKey = 'general' | 'pipeline' | 'scoring';

interface CustomizationDrawerProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function CustomizationDrawer({ username: initialUsername, isOpen, onClose, onSaved }: CustomizationDrawerProps) {
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  
  // ── Pipeline Stages ──
  const [stages, setStages] = useState<string[]>([]);
  const [originalStages, setOriginalStages] = useState<string[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  // ── Stat Cards ──
  const [selectedStats, setSelectedStats] = useState<string[]>(['totalLeads', 'noWebsite', 'noBooking', 'notMobile']);
  
  // ── Scoring Rules ──
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  
  // ── Stage Mapping Modal ──
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [removedStages, setRemovedStages] = useState<string[]>([]);
  const [stageMappings, setStageMappings] = useState<Record<string, string>>({});
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  // ── Fetch existing config ──
  useEffect(() => {
    if (!isOpen || authLoading || !user || hasFetched) return;
    
    setLoading(true);
    fetch('/api/organization/customization')
      .then(r => r.json())
      .then(data => {
        if (data.customPipelineStages) {
          setStages(data.customPipelineStages);
          setOriginalStages(data.customPipelineStages);
        } else {
          const defaults = getDefaultStages(data.niche || 'DEFAULT');
          setStages(defaults);
          setOriginalStages(defaults);
        }
        if (data.customStatCards) setSelectedStats(data.customStatCards.map((s: any) => s.key));
        if (data.customScoringRules) setScoringRules(data.customScoringRules);
        setLoading(false);
        setHasFetched(true);
      })
      .catch(() => setLoading(false));
  }, [isOpen, user, authLoading, hasFetched]);

  function getDefaultStages(niche: string): string[] {
    switch (niche) {
      case 'B2B_SALES': return ['Interested', 'Qualified', 'Demo Booked', 'Proposal Sent', 'Negotiation', 'Completed', 'Nurturing', 'Lost'];
      case 'DIGITAL_AGENCY': return ['Interested', 'Audit/Mockup Sent', 'Meeting Booked', 'Proposal Sent', 'Contract Sent', 'Completed', 'Nurturing', 'Lost'];
      case 'REAL_ESTATE': return ['Interested', 'Property Suggested', 'Visit Scheduled', 'Offer Made', 'In Escrow', 'Completed', 'Nurturing', 'Lost'];
      default: return ['Interested', 'In Discussion', 'Meeting Booked', 'In Development', 'Client Review', 'Completed', 'Nurturing', 'Lost'];
    }
  }

  // ── Drag & Drop Handlers ──
  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    setDraggedIndex(position);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data
    e.dataTransfer.setData('text/plain', position.toString());
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    dragOverItem.current = position;
  };

  const handleDrop = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyListItems = [...stages];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      setStages(copyListItems);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggedIndex(null);
  };

  // ── Handlers ──
  const addStage = () => {
    const name = newStageName.trim();
    if (!name || stages.includes(name)) return;
    setStages([...stages, name]);
    setNewStageName('');
  };
  const removeStage = (index: number) => setStages(stages.filter((_, i) => i !== index));
  const startEditing = (index: number) => { setEditingIndex(index); setEditingValue(stages[index]); };
  const finishEditing = () => {
    if (editingIndex === null) return;
    const val = editingValue.trim();
    if (val && !stages.some((s, i) => s === val && i !== editingIndex)) {
      const newStages = [...stages];
      newStages[editingIndex] = val;
      setStages(newStages);
    }
    setEditingIndex(null); setEditingValue('');
  };

  const toggleStat = (key: string) => {
    if (selectedStats.includes(key)) setSelectedStats(selectedStats.filter(s => s !== key));
    else if (selectedStats.length < 4) setSelectedStats([...selectedStats, key]);
  };

  const addRule = () => {
    const defaultRule = PRESET_RULES[0].get();
    setScoringRules([...scoringRules, { ...defaultRule, points: 20 } as ScoringRule]);
  };
  
  const updateRulePreset = (index: number, label: string) => {
    const preset = getPresetFromLabel(label);
    const newRules = [...scoringRules];
    newRules[index] = { ...preset, points: newRules[index].points } as ScoringRule;
    setScoringRules(newRules);
  };

  const updateRulePoints = (index: number, points: number) => {
    const newRules = [...scoringRules];
    newRules[index].points = points;
    setScoringRules(newRules);
  };

  const removeRule = (index: number) => setScoringRules(scoringRules.filter((_, i) => i !== index));

  const handleSave = async () => {
    const removed = originalStages.filter(s => !stages.includes(s));
    if (removed.length > 0) {
      setRemovedStages(removed);
      const defaultMappings: Record<string, string> = {};
      removed.forEach(s => { defaultMappings[s] = stages[0] || 'Interested'; });
      setStageMappings(defaultMappings);
      setPendingSaveData({
        customPipelineStages: stages,
        customStatCards: selectedStats.map(key => ALL_STAT_OPTIONS.find(o => o.key === key)).filter(Boolean),
        customScoringRules: scoringRules,
      });
      setShowMappingModal(true);
      return;
    }
    await doSave({
      customPipelineStages: stages,
      customStatCards: selectedStats.map(key => ALL_STAT_OPTIONS.find(o => o.key === key)).filter(Boolean),
      customScoringRules: scoringRules,
    }, {});
  };

  const doSave = async (payload: any, mappings: Record<string, string>) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/organization/customization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, stageMappings: mappings }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setOriginalStages([...stages]);
        setTimeout(() => setSaved(false), 3000);
        if (onSaved) onSaved();
      } else {
        alert('Failed to save: ' + data.error);
      }
    } catch (e) {
      alert('Error saving customization');
    } finally {
      setSaving(false);
      setShowMappingModal(false);
    }
  };

  const confirmMapping = () => { if (pendingSaveData) doSave(pendingSaveData, stageMappings); };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-zinc-900/10 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-[70] w-full md:w-[600px] bg-surface-page border-l border-b-divider shadow-[0_0_80px_rgba(0,0,0,0.15)] flex flex-col font-sans transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-b-divider bg-surface-page sticky top-0 z-10 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-t-primary tracking-tight">Customize CRM</h2>
              <p className="text-xs text-t-muted font-medium mt-1">Changes reflect instantly over your dashboard context.</p>
            </div>
            <button onClick={onClose} className="p-2 text-t-faint hover:text-t-primary hover:bg-surface-badge rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-badge rounded-lg">
            {(['general', 'pipeline', 'scoring'] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-surface-page text-t-primary shadow-sm'
                    : 'text-t-muted hover:text-t-secondary hover:bg-black/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center p-20">
              <div className="text-t-faint font-semibold text-sm animate-pulse">Loading settings...</div>
            </div>
          ) : (
            <>
              {/* General Tab */}
              <div className={activeTab === 'general' ? 'block space-y-10' : 'hidden'}>
                {/* Profile Details */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-surface-badge text-t-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-t-primary uppercase tracking-widest">Account Profile</h3>
                      <p className="text-xs text-t-muted mt-0.5">Customize your displayed alias across the system.</p>
                    </div>
                  </div>
                  
                  <div className="bg-surface-page border border-b-divider rounded-lg p-4 shadow-sm flex items-center justify-between">
                    <span className="text-sm font-bold text-t-secondary">Display Name</span>
                    <div className="bg-zinc-900 rounded-lg shadow-inner">
                      <div className="p-1">
                        <UsernameEditor initialUsername={initialUsername} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Header Metrics */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-surface-badge text-t-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-t-primary uppercase tracking-widest">Dashboard Metrics</h3>
                      <p className="text-xs text-t-muted mt-0.5"><span className="text-t-primary font-bold">{selectedStats.length}/4</span> heads-up display features.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {ALL_STAT_OPTIONS.map(opt => {
                      const isSelected = selectedStats.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          onClick={() => toggleStat(opt.key)}
                          className={`p-4 rounded-xl border text-left transition-all duration-200 shadow-sm ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 shadow-md translate-y-[-1px]'
                              : 'bg-surface-page border-b-divider hover:border-b-muted hover:bg-surface-card'
                          }`}
                        >
                          <div className={`p-1.5 rounded-md w-fit mb-2 ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-badge text-t-muted'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} /></svg>
                          </div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-t-secondary'}`}>{opt.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Pipeline Tab */}
              <div className={activeTab === 'pipeline' ? 'block space-y-6' : 'hidden'}>
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-surface-badge text-t-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-t-primary uppercase tracking-widest">Pipeline Stages</h3>
                      <p className="text-xs text-t-muted mt-0.5">Drag to sequence the journey of your leads.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {stages.map((stage, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className={`flex items-center gap-2 group bg-surface-page border rounded-lg px-3 py-2 transition-all shadow-sm ${draggedIndex === index ? 'opacity-50 border-dashed border-t-faint' : 'border-b-divider hover:border-b-muted'}`}
                      >
                        <div className="cursor-grab active:cursor-grabbing p-1 text-t-faint hover:text-t-primary">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-black text-t-faint w-4 text-center">{index + 1}</span>
                        {editingIndex === index ? (
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={e => e.key === 'Enter' && finishEditing()}
                            className="flex-1 bg-transparent text-sm font-bold text-t-primary outline-none border-b border-zinc-900"
                          />
                        ) : (
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-sm font-bold text-t-secondary">{stage}</span>
                            <button onClick={() => startEditing(index)} className="p-1 rounded text-t-ghost hover:text-t-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeStage(index)} className="p-1 rounded text-t-faint hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <input
                      value={newStageName}
                      onChange={e => setNewStageName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addStage()}
                      placeholder="Add new stage..."
                      className="flex-1 bg-surface-page border border-b-divider rounded-lg px-3 py-2 text-sm font-bold text-t-primary placeholder:text-t-faint outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
                    />
                    <button onClick={addStage} className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-800 transition-colors shadow-md">
                      + Add
                    </button>
                  </div>
                </section>
              </div>

              {/* Scoring Tab */}
              <div className={activeTab === 'scoring' ? 'block space-y-6' : 'hidden'}>
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-surface-badge text-t-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-t-primary uppercase tracking-widest">Lead Scoring</h3>
                      <p className="text-xs text-t-muted mt-0.5">Automated points based on metadata.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {scoringRules.map((rule, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-3 bg-surface-page border border-b-divider rounded-lg px-4 py-4 group hover:border-b-muted transition-all shadow-sm">
                        <span className="text-xs font-bold text-t-secondary tracking-wide">Award</span>
                        <input
                          type="number"
                          value={rule.points}
                          onChange={e => updateRulePoints(index, Number(e.target.value))}
                          className="w-16 bg-surface-card border border-b-divider rounded-md px-2 py-1 text-xs font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent text-center"
                        />
                        <span className="text-xs font-bold text-t-secondary tracking-wide">pts when</span>
                        
                        <select
                          value={getPresetLabel(rule)}
                          onChange={e => updateRulePreset(index, e.target.value)}
                          className="flex-1 min-w-[150px] bg-surface-card border border-b-divider rounded-md px-3 py-1.5 text-xs font-bold text-t-primary outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent cursor-pointer"
                        >
                          {PRESET_RULES.map(p => (
                            <option key={p.label} value={p.label}>{p.label}</option>
                          ))}
                          {getPresetLabel(rule) === 'Custom Rule' && (
                            <option value="Custom Rule" disabled>Custom Rule</option>
                          )}
                        </select>
                        
                        <button onClick={() => removeRule(index)} className="p-1 rounded text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={addRule} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-surface-page border border-b-divider hover:border-zinc-900 rounded-lg text-xs font-bold text-t-secondary uppercase tracking-wider transition-all hover:text-t-primary shadow-sm">
                    + Add Rule
                  </button>
                </section>
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-b-divider bg-surface-card flex items-center justify-between mt-auto shrink-0">
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 animate-in fade-in slide-in-from-right-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Saved successfully
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-8 py-3 bg-zinc-900 text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Modal for mapping removed stages */}
        {showMappingModal && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-6">
            <div className="bg-surface-page border border-b-divider rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
              <div>
                <h3 className="text-lg font-black text-t-primary">Map Removed Stages</h3>
                <p className="text-xs text-t-muted mt-1 font-medium">
                  You removed stages. Where should existing leads in those stages go?
                </p>
              </div>
              
              <div className="space-y-3">
                {removedStages.map(old => (
                  <div key={old} className="flex items-center gap-3 bg-surface-card border border-b-divider rounded-lg px-4 py-3">
                    <span className="text-sm font-bold text-red-500 line-through shrink-0">{old}</span>
                    <svg className="w-4 h-4 text-t-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <select
                      value={stageMappings[old] || stages[0]}
                      onChange={e => setStageMappings({ ...stageMappings, [old]: e.target.value })}
                      className="flex-1 bg-surface-page border border-b-divider rounded-md px-2 py-1.5 text-sm font-bold text-t-primary outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent"
                    >
                      {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  onClick={() => { setShowMappingModal(false); setPendingSaveData(null); }}
                  className="px-5 py-2 text-xs font-bold text-t-muted uppercase tracking-wider hover:text-t-primary transition-all font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMapping}
                  disabled={saving}
                  className="px-6 py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? 'Migrating...' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

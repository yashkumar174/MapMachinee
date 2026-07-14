'use client';

import { useState, useRef, useEffect } from 'react';

export default function UsernameEditor({ initialUsername }: { initialUsername: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [tempValue, setTempValue] = useState(initialUsername);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = tempValue.trim();
    if (!trimmed || trimmed === username) {
      setIsEditing(false);
      setTempValue(username);
      return;
    }

    if (trimmed.length < 3) { setError('Min 3 characters'); return; }
    if (trimmed.length > 24) { setError('Max 24 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setError('Letters, numbers, _ only'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsername(data.username);
        setTempValue(data.username);
        setIsEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(data.error || 'Failed to update');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempValue(username);
    setError('');
  };

  if (isEditing) {
    return (
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => { setTempValue(e.target.value); setError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            maxLength={24}
            className={`w-32 bg-white/10 text-xs font-bold text-white px-2.5 py-1.5 rounded-lg border outline-none transition-all ${
              error ? 'border-red-500' : 'border-accent/50 focus:border-accent'
            }`}
            placeholder="username"
          />
          {error && (
            <div className="absolute top-full left-0 mt-1 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md whitespace-nowrap z-50">
              {error}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50 transition-colors"
          title="Save"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded text-zinc-400 hover:bg-white/10 transition-colors"
          title="Cancel"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="hidden sm:flex items-center text-xs font-bold text-t-on-dark px-3 py-1.5 rounded-lg border border-b-divider uppercase tracking-widest gap-2 hover:border-t-on-dark-muted transition-all group"
      title="Click to change username"
    >
      <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      {username}
      {success && (
        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      )}
      <svg className="w-2.5 h-2.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
    </button>
  );
}

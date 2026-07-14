'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Member = { id: number; username: string; role: string; createdAt: string };
type Invite = { id: string; email: string; role: string; status: string; invitedBy: string; createdAt: string };

export default function TeamClient({ plan, seatLimit }: { plan: string; seatLimit: number }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [seatsUsed, setSeatsUsed] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SALES');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team/invites');
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
        setInvites(data.invites);
        setSeatsUsed(data.seatsUsed);
        setCurrentUserId(data.currentUserId);
      }
    } catch {
      console.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    setInviteLink('');

    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmail('');
        setInviteLink(data.inviteLink);
        fetchTeam();
      } else {
        setError(data.error || 'Failed to send invite');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invite?')) return;
    try {
      const res = await fetch(`/api/team/invites?id=${inviteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchTeam();
      else alert(data.error || 'Failed to revoke');
    } catch {
      alert('Network error');
    }
  };

  const handleRemoveMember = async (memberId: number, username: string) => {
    if (!confirm(`Remove ${username} from the organization? They will lose access to all shared leads and be able to create their own workspace on next sign-in.`)) return;
    try {
      const res = await fetch(`/api/team/members?id=${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTeam();
        router.refresh();
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch {
      alert('Network error');
    }
  };

  const seatsFull = seatsUsed + invites.length >= seatLimit;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Seat Usage */}
      <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-b-divider bg-surface-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Team Seats
              </h2>
              <p className="text-xs font-semibold text-t-muted mt-1">{plan} plan — {seatLimit} seat{seatLimit > 1 ? 's' : ''} included</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-t-primary tabular-nums">{seatsUsed}</span>
              <span className="text-sm font-bold text-t-faint">/{seatLimit}</span>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="h-2 bg-surface-badge rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min((seatsUsed / seatLimit) * 100, 100)}%`,
                backgroundColor: seatsFull ? 'var(--color-accent, #f97316)' : 'var(--color-accent, #f97316)',
                opacity: seatsFull ? 1 : 0.7,
              }}
            />
          </div>
          {seatsFull && (
            <p className="text-[11px] font-bold text-accent mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              All seats are in use. Upgrade your plan to add more team members.
            </p>
          )}
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-b-divider bg-surface-header">
          <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            Generate Invite Link
          </h2>
          <p className="text-xs font-semibold text-t-muted mt-1">Generate a secure login link for a specific Google email. They'll auto-join when they sign in.</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2">Google Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="teammate@gmail.com"
                disabled={seatsFull}
                className="w-full bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-t-faint"
              />
            </div>
            <div className="sm:w-40">
              <label className="block text-[11px] font-bold text-t-muted uppercase tracking-widest mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={seatsFull}
                className="w-full bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-4 py-2.5 rounded-xl outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="SALES">Sales</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || seatsFull || !email.trim()}
              className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20 whitespace-nowrap"
            >
              {submitting ? 'Generating...' : seatsFull ? 'Seats Full' : 'Generate Link'}
            </button>
          </form>
          {error && (
            <p className="text-xs font-bold text-red-500 mt-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </p>
          )}
          {inviteLink && (
            <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-xl animate-in fade-in slide-in-from-top-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-accent mb-2">Invite created! Send this link to your teammate:</p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={inviteLink} 
                  className="flex-1 bg-surface-input border border-b-muted text-sm font-bold text-t-primary px-3 py-2 rounded-lg outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Link copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-accent text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-accent-hover transition-colors whitespace-nowrap"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-b-divider bg-surface-header">
          <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Active Members
          </h2>
        </div>
        <div className="divide-y divide-b-divider-light">
          {loading ? (
            <div className="px-6 py-12 text-center text-t-muted text-sm font-bold animate-pulse">Loading team...</div>
          ) : members.length === 0 ? (
            <div className="px-6 py-12 text-center text-t-muted text-sm">No members found.</div>
          ) : members.map((m, idx) => (
            <div
              key={m.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-surface-card-hover transition-colors animate-in fade-in fill-mode-both"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-surface-badge flex items-center justify-center text-sm font-black text-t-muted uppercase">
                  {m.username.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-t-primary flex items-center gap-2">
                    {m.username}
                    {m.id === currentUserId && (
                      <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase tracking-widest">You</span>
                    )}
                  </p>
                  <p className="text-[11px] text-t-faint font-medium">
                    Joined {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {m.role === 'ADMIN' ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-pink-500/10 text-pink-500 uppercase tracking-widest border border-pink-500/20">
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-accent/10 text-accent uppercase tracking-widest border border-accent/20">
                    Sales
                  </span>
                )}
                {m.id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(m.id, m.username)}
                    className="text-[10px] font-bold text-t-faint hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-surface-card border border-b-default rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-b-divider bg-surface-header">
            <h2 className="text-lg font-black tracking-tight text-t-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Pending Invites
            </h2>
          </div>
          <div className="divide-y divide-b-divider-light">
            {invites.map((inv, idx) => (
              <div
                key={inv.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-surface-card-hover transition-colors animate-in fade-in fill-mode-both"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-t-primary">{inv.email}</p>
                    <p className="text-[11px] text-t-faint font-medium">
                      Invited by {inv.invitedBy} · {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-yellow-500/10 text-yellow-500 uppercase tracking-widest border border-yellow-500/20">
                    Pending
                  </span>
                  {inv.role === 'ADMIN' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black text-pink-500 bg-pink-500/10 uppercase tracking-widest">Admin</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black text-accent bg-accent/10 uppercase tracking-widest">Sales</span>
                  )}
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-[10px] font-bold text-t-faint hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

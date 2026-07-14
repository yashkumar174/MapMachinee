'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-t-on-dark-muted hover:text-t-on-dark px-3 py-1.5 rounded-lg border border-b-divider hover:border-t-on-dark-muted transition-all uppercase tracking-widest"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}

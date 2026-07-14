'use client';

import { useEffect } from 'react';

// Fixes the bfcache bug: when users navigate back from the pitch page via
// browser back button, React client components lose their event handlers.
// This listener detects a bfcache restore and forces a fresh hydration.
export default function BfcacheFix() {
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}

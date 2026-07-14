"use client";

import { useState } from 'react';
import Link from 'next/link';
import UsernameEditor from '@/components/UsernameEditor';
import ThemeToggle from '@/components/ThemeToggle';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import CustomizationDrawer from './CustomizationDrawer';
import UsageWidget from './UsageWidget';

interface LayoutWrapperProps {
  children: React.ReactNode;
  username?: string;
  email?: string;
  niche?: string;
  isAdmin?: boolean;
  isScraperOnly?: boolean;
  hasTeamManagement?: boolean;
  activePath?: string;
}

const NICHE_LABELS: Record<string, string> = {
  B2B_SALES: 'B2B Sales',
  DIGITAL_AGENCY: 'Web & SEO Agency',
  REAL_ESTATE: 'Real Estate',
  DEFAULT: 'General',
};

export default function LayoutWrapper({ children, username = 'User', email = '', niche = '', isAdmin = false, isScraperOnly = false, hasTeamManagement = false, activePath }: LayoutWrapperProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut(auth);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const nicheLabel = NICHE_LABELS[niche] || niche || 'General';

  return (
    <div className="flex min-h-screen bg-surface-page text-t-primary font-sans overflow-x-hidden relative">
      {/* Floating Hamburger Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 bg-surface-header border border-b-divider rounded-xl shadow-2xl text-t-on-dark transition-all hover:opacity-80 active:scale-95"
        style={{ opacity: isOpen ? 0 : 1, pointerEvents: isOpen ? 'none' : 'auto' }}
        title="Open Sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Taskbar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-surface-header border-r border-b-divider shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 font-mono`}
        style={{
          width: '17rem',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        {/* Header / Logo Component */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-b-divider shrink-0">
          <div>
            <h1 className="text-xl font-black text-t-on-dark tracking-tight flex items-center gap-2">
              MAPMACHINE
            </h1>
            <p className="text-[9px] text-t-on-dark-muted font-bold tracking-[0.2em] uppercase mt-1">CRM Engine</p>
          </div>
          
          {/* Close Button */}
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1.5 text-t-on-dark-muted hover:text-t-on-dark transition-colors rounded-lg hover:bg-surface-card-hover/30"
            title="Collapse Sidebar"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5 no-scrollbar">
           <p className="text-[10px] font-bold tracking-widest text-t-on-dark-faint uppercase mb-3 px-2">Navigation</p>
           
           <Link href="/dashboard" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all ${activePath === '/dashboard' ? 'bg-surface-card-hover/40 text-accent font-bold border border-b-divider shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
             <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
             Dashboard
           </Link>

           <Link href="/overview" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all ${activePath === '/overview' ? 'bg-surface-card-hover/40 text-accent font-bold border border-b-divider shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
             <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
             Overview
           </Link>

           {isAdmin && !isScraperOnly && (
             <Link href="/pipeline" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all ${activePath === '/pipeline' ? 'bg-surface-card-hover/40 text-accent font-bold border border-b-divider shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
               <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
               Pipeline CRM
             </Link>
           )}

           {isAdmin && (
             <>
               <div className="pt-4 pb-2">
                 <p className="text-[10px] font-bold tracking-widest text-t-on-dark-faint uppercase px-2">Settings</p>
               </div>
               
               <Link href="/settings/team" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${activePath === '/settings/team' ? 'bg-surface-card-hover/40 text-t-on-dark shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
                 <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 Team Management
               </Link>
               
               <button onClick={() => setIsCustomizationOpen(true)} className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${isCustomizationOpen ? 'bg-surface-card-hover/40 text-t-on-dark shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
                 <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 Customization
               </button>
             </>
           )}

           {email === 'yashkumar4784@gmail.com' && (
             <>
               <div className="pt-4 pb-2">
                 <p className="text-[10px] font-bold tracking-widest text-t-on-dark-faint uppercase px-2">Super Admin</p>
               </div>
               
               <Link href="/superadmin" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all ${activePath === '/superadmin' ? 'bg-surface-card-hover/40 text-accent font-bold border border-b-divider shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
                 <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                 Platform Overview
               </Link>

               <Link href="/inquiries" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${activePath === '/inquiries' ? 'bg-surface-card-hover/40 text-t-on-dark shadow-sm' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
                 <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 Platform Inquiries
               </Link>
             </>
           )}
         </nav>

         {/* Global Access Section — Bottom Pinned */}
         <div className="border-t border-b-divider shrink-0 px-4 py-4 space-y-1.5 flex flex-col mt-auto bg-surface-header">
           <div className="pb-2">
             <UsageWidget />
           </div>

           <Link href="/settings" className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all ${activePath === '/settings' ? 'bg-surface-card-hover/40 text-t-on-dark shadow-sm ring-1 ring-white/10' : 'text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark'}`}>
             <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             Account Info
           </Link>
           
           <div className="w-full flex items-center justify-between gap-1">
             <button onClick={handleLogout} disabled={isLoggingOut} className="flex-1 flex items-center text-left gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all text-t-on-dark-muted hover:bg-surface-card-hover/20 hover:text-t-on-dark group">
               <svg className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               {isLoggingOut ? 'Signing out...' : 'Logout'}
             </button>
             
             {/* Theme Toggle decoupled from Logout button to prevent DOM nesting errors */}
             <div className="shrink-0 pr-2">
               <ThemeToggle />
             </div>
           </div>
        </div>
      </aside>

      <main 
        className="flex-1 w-full min-h-screen transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          paddingLeft: isOpen ? '17rem' : '0'
        }}
      >
         <div className="w-full">
           {children}
         </div>
      </main>

      <CustomizationDrawer 
        username={username}
        isOpen={isCustomizationOpen} 
        onClose={() => setIsCustomizationOpen(false)} 
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

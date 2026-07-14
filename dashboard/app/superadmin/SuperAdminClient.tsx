"use client";

import Link from 'next/link';

type Stats = {
  totalUsers: number;
  totalOrganizations: number;
  freeOrgs: number;
  proOrgs: number;
  businessOrgs: number;
  mrr: number;
};

export default function SuperAdminClient({ stats }: { stats: Stats }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-t-on-dark tracking-tight mb-2 uppercase">Platform Command Center</h1>
        <p className="text-t-on-dark-muted font-bold tracking-widest text-xs uppercase">
          Welcome back, Founder.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        
        {/* MRR Card */}
        <div className="bg-surface-card border border-divider p-6 rounded-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform" />
          <h3 className="text-xs font-bold text-t-on-dark-faint uppercase tracking-widest mb-2">Est. Monthly Revenue (MRR)</h3>
          <p className="text-4xl font-black text-emerald-500 tabular-nums font-mono">
            ₹{stats.mrr.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Users Card */}
        <div className="bg-surface-card border border-divider p-6 rounded-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform" />
          <h3 className="text-xs font-bold text-t-on-dark-faint uppercase tracking-widest mb-2">Total Users</h3>
          <p className="text-4xl font-black text-t-on-dark tabular-nums font-mono">
            {stats.totalUsers}
          </p>
        </div>

        {/* Orgs Card */}
        <div className="bg-surface-card border border-divider p-6 rounded-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform" />
          <h3 className="text-xs font-bold text-t-on-dark-faint uppercase tracking-widest mb-2">Active Workspaces</h3>
          <p className="text-4xl font-black text-amber-500 tabular-nums font-mono">
            {stats.totalOrganizations}
          </p>
        </div>
      </div>

      <h2 className="text-sm font-black text-t-on-dark uppercase tracking-widest mb-4">Subscription Distribution</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-surface-header border border-divider p-5 rounded-xl">
          <p className="text-[10px] font-bold text-t-on-dark-muted uppercase tracking-widest mb-1">Free Tier</p>
          <p className="text-2xl font-black text-t-on-dark font-mono">{stats.freeOrgs}</p>
        </div>
        <div className="bg-surface-header border border-accent/20 p-5 rounded-xl">
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Pro Tier</p>
          <p className="text-2xl font-black text-accent font-mono">{stats.proOrgs}</p>
        </div>
        <div className="bg-surface-header border border-[#FD551D]/20 p-5 rounded-xl">
          <p className="text-[10px] font-bold text-[#FD551D] uppercase tracking-widest mb-1">Business Tier</p>
          <p className="text-2xl font-black text-[#FD551D] font-mono">{stats.businessOrgs}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/inquiries" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-bold tracking-wide hover:bg-accent-hover transition-colors">
          View Platform Inquiries
        </Link>
      </div>

    </div>
  );
}

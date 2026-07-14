"use client";

import { useState } from 'react';

type Inquiry = {
  id: string;
  name: string;
  email: string;
  niche: string;
  message: string;
  status: string;
  createdAt: Date;
};

export default function InquiriesClient({ initialInquiries }: { initialInquiries: Inquiry[] }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);

  const deleteInquiry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    // Optimistic UI update
    setInquiries(prev => prev.filter(i => i.id !== id));

    try {
      await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete inquiry', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-t-on-dark tracking-tight mb-2">Platform Inquiries</h1>
        <p className="text-t-on-dark-muted font-medium">
          Messages sent from the MapMachine Landing Page "Contact Us" form.
        </p>
      </div>

      <div className="space-y-4">
        {inquiries.length === 0 ? (
          <div className="bg-surface-card border border-divider p-8 rounded-2xl text-center text-t-on-dark-muted">
            No inquiries yet. Keep marketing!
          </div>
        ) : (
          inquiries.map((inq) => (
            <div key={inq.id} className="bg-surface-card border border-divider p-6 rounded-2xl flex flex-col gap-4 relative group">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-t-on-dark">{inq.name}</h3>
                  <a href={`mailto:${inq.email}`} className="text-sm text-accent hover:underline font-mono">
                    {inq.email}
                  </a>
                </div>
                <div className="text-xs text-t-on-dark-faint font-mono">
                  {new Date(inq.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div className="inline-block self-start px-2.5 py-1 rounded-md bg-surface-header border border-divider text-xs font-bold text-t-on-dark-muted uppercase tracking-wider">
                Niche: {inq.niche}
              </div>

              <div className="bg-surface-page p-4 rounded-xl text-t-on-dark-muted text-sm whitespace-pre-wrap font-mono border border-divider/50">
                {inq.message}
              </div>

              <button 
                onClick={() => deleteInquiry(inq.id)}
                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-status-error hover:bg-status-error/10 rounded-lg"
                title="Delete Inquiry"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

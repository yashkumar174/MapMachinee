// ── Shared helpers for dynamic dashboard customization ──

export interface StatCardConfig {
  key: string;
  label: string;
  icon: string;
}

export interface ScoringRule {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'lt';
  value: string | number | boolean;
  points: number;
}

// ── Default stat cards by niche ──
const DEFAULT_STATS: Record<string, StatCardConfig[]> = {
  B2B_SALES: [
    { key: 'totalLeads', label: 'Total Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'hasEmails', label: 'Has Emails', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { key: 'hasPhone', label: 'Has Phone', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { key: 'hasWebsite', label: 'Has Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  ],
  DIGITAL_AGENCY: [
    { key: 'totalLeads', label: 'Total Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'lowReviews', label: 'Low Reviews', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { key: 'noWebsite', label: 'No Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
    { key: 'slowLoad', label: 'Slow Load', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
  REAL_ESTATE: [
    { key: 'totalLeads', label: 'Total Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'hasEmails', label: 'Has Emails', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { key: 'hasPhone', label: 'Has Phone', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { key: 'hasLinkedIn', label: 'Has LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
  ],
  DEFAULT: [
    { key: 'totalLeads', label: 'Total Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'noWebsite', label: 'No Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
    { key: 'noBooking', label: 'No Booking', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'notMobile', label: 'Not Mobile-Ready', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
  ],
};

// ── Default pipeline stages by niche ──
const DEFAULT_STAGES: Record<string, string[]> = {
  B2B_SALES: ['interested', 'Qualified', 'Demo Booked', 'Proposal Sent', 'Negotiation', 'Completed', 'Nurturing', 'Lost'],
  DIGITAL_AGENCY: ['New Leads', 'Contacted', 'Follow-Up Needed', 'Meeting Booked', 'Proposal Sent', 'In Development', 'Completed', 'Lost'],
  REAL_ESTATE: ['interested', 'Property Suggested', 'Visit Scheduled', 'Offer Made', 'In Escrow', 'Completed', 'Nurturing', 'Lost'],
  DEFAULT: ['interested', 'In Discussion', 'Meeting Booked', 'In Development', 'Client Review', 'Completed', 'Nurturing', 'Lost'],
};

// ── Default scoring by niche ──
const DEFAULT_SCORING: Record<string, ScoringRule[]> = {
  B2B_SALES: [
    { field: 'emails', op: 'neq', value: '', points: 40 },
    { field: 'phone', op: 'neq', value: '', points: 40 },
    { field: 'has_website', op: 'eq', value: true, points: 20 },
  ],
  DIGITAL_AGENCY: [
    { field: 'has_website', op: 'eq', value: false, points: 30 },
    { field: 'load_time', op: 'gt', value: 3, points: 20 },
  ],
  DEFAULT: [
    { field: 'has_website', op: 'eq', value: false, points: 30 },
    { field: 'load_time', op: 'gt', value: 3, points: 15 },
    { field: 'has_booking', op: 'eq', value: false, points: 20 },
    { field: 'mobile_friendly', op: 'eq', value: false, points: 10 },
  ],
};

export function getStatCards(org: any): StatCardConfig[] {
  if (org.customStatCards) {
    try { return JSON.parse(org.customStatCards); } catch {}
  }
  return DEFAULT_STATS[org.niche] || DEFAULT_STATS.DEFAULT;
}

export function getPipelineStages(org: any): string[] {
  if (org.customPipelineStages) {
    try { return JSON.parse(org.customPipelineStages); } catch {}
  }
  return DEFAULT_STAGES[org.niche] || DEFAULT_STAGES.DEFAULT;
}

export function getScoringRules(org: any): ScoringRule[] {
  if (org.customScoringRules) {
    try { return JSON.parse(org.customScoringRules); } catch {}
  }
  return DEFAULT_SCORING[org.niche] || DEFAULT_SCORING.DEFAULT;
}

// ── Dynamic stat counter ──
export function computeStatValue(key: string, leads: any[]): number {
  return computeFilteredLeads(key, leads).length;
}

// Returns the actual leads matching a stat filter key
export function computeFilteredLeads(key: string, leads: any[]): any[] {
  switch (key) {
    case 'totalLeads': return leads;
    case 'noWebsite': return leads.filter(l => !l.has_website);
    case 'noBooking': return leads.filter(l => !l.has_booking);
    case 'notMobile': return leads.filter(l => !l.mobile_friendly);
    case 'hasEmails': return leads.filter(l => l.emails);
    case 'hasPhone': return leads.filter(l => l.phone);
    case 'hasWebsite': return leads.filter(l => l.has_website || l.website);
    case 'slowLoad': return leads.filter(l => l.load_time && l.load_time > 3);
    case 'lowReviews': return leads.filter(l => {
      if (!l.rating) return true;
      const m = l.rating.match(/([\d,]+)\s*reviews?/i);
      return m ? parseInt(m[1].replace(',', '')) < 50 : true;
    });
    case 'hasLinkedIn': return leads.filter(l => {
      try {
        if (l.auditData) {
          const parsed = JSON.parse(l.auditData);
          return parsed.b2b_data?.linkedin_url;
        }
      } catch {}
      return false;
    });
    default: return [];
  }
}

// Builds a map of stat key -> array of matching lead IDs
export function computeFilterMap(statKeys: string[], leads: any[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const key of statKeys) {
    map[key] = computeFilteredLeads(key, leads).map((l: any) => l.id);
  }
  return map;
}

// ── Dynamic lead scoring engine ──
export function computeLeadScore(lead: any, rules: ScoringRule[]): number {
  let score = 0;
  for (const rule of rules) {
    const fieldValue = lead[rule.field];
    let conditionMet = false;

    switch (rule.op) {
      case 'eq':
        if (typeof rule.value === 'boolean') {
          conditionMet = Boolean(fieldValue) === rule.value;
        } else if (rule.value === '') {
          conditionMet = !fieldValue || fieldValue === '';
        } else {
          conditionMet = fieldValue == rule.value;
        }
        break;
      case 'neq':
        if (typeof rule.value === 'boolean') {
          conditionMet = Boolean(fieldValue) !== rule.value;
        } else if (rule.value === '') {
          conditionMet = !!fieldValue && fieldValue !== '';
        } else {
          conditionMet = fieldValue != rule.value;
        }
        break;
      case 'gt':
        conditionMet = typeof fieldValue === 'number' && fieldValue > Number(rule.value);
        break;
      case 'lt':
        conditionMet = typeof fieldValue === 'number' && fieldValue < Number(rule.value);
        break;
    }

    if (conditionMet) score += rule.points;
  }
  return Math.min(score, 100);
}

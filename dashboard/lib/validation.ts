// SECURITY: Centralised Zod schemas for request body validation
// (OWASP API8:2023 — Security Misconfiguration / Mass Assignment).
// Each route imports the schema it needs and runs `safeParse` on the JSON body
// before doing anything else. `.strict()` rejects unknown keys so attackers
// can't sneak extra fields into Prisma writes (mass-assignment defence).

import { z } from 'zod';

// SECURITY: /api/scrape — validate the user-supplied search query and bounds.
// The `.trim()` strips leading/trailing whitespace; min/max guard against
// empty queries and absurdly long ones that could DoS the downstream scraper.
export const scrapeSchema = z
  .object({
    query: z.string().min(2).max(200).trim(),
    max: z.number().int().min(1).max(100).optional().default(10),
    max_reviews: z.number().int().min(0).max(500).optional(),
  })
  .strict();

// SECURITY: /api/onboarding — username regex is whitelist-only
// (no Unicode, no punctuation, no path-traversal characters).
export const onboardingSchema = z
  .object({
    niche: z.string().min(1).max(50),
    username: z
      .string()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
    serviceLevel: z.enum(['SCRAPER_ONLY', 'FULL_CRM']).optional().default('FULL_CRM'),
    hasTeamManagement: z.boolean().optional().default(false),
  })
  .strict();

// SECURITY: /api/user/username — same character whitelist as onboarding.
export const usernameSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  })
  .strict();

// SECURITY: /api/leads/[id] PATCH — explicitly enumerates every mutable field.
// Anything not listed (e.g. `organizationId`, `agent`, `createdAt`) is rejected,
// preventing privilege/scope escalation via mass-assignment.
export const leadUpdateSchema = z
  .object({
    status: z.string().max(50).optional(),
    notes: z.string().max(5000).optional(),
    activity: z.string().max(10000).optional(),
    inPipeline: z.boolean().optional(),
    nextFollowUp: z.string().datetime().nullable().optional(),
    dealValue: z.number().min(0).max(100000000).optional(),
    probability: z.number().min(0).max(100).optional(),
    resetContactedAt: z.boolean().optional(),
  })
  .strict();

// SECURITY: /api/subscription/create — only PRO/BUSINESS allowed.
// Prevents an attacker from setting an arbitrary plan name to bypass quota.
export const subscriptionCreateSchema = z
  .object({
    plan: z.enum(['PRO', 'BUSINESS']),
  })
  .strict();

// SECURITY: /api/organization/customization PUT — caps array sizes & stage
// label lengths so an attacker can't blow up DB rows / JSON payloads.
// `customStatCards` and `customScoringRules` accept arbitrary JSON since
// their shape is owner-defined; the route still scopes the write to the
// caller's organizationId.
export const customizationSchema = z
  .object({
    customPipelineStages: z.array(z.string().max(50)).max(20).optional(),
    customStatCards: z.any().optional(),
    customScoringRules: z.any().optional(),
    stageMappings: z.record(z.string().max(50), z.string().max(50)).optional(),
  })
  .strict();

// SECURITY: /api/generate-pitch — uses .passthrough() because the caller may
// pass through full lead objects that contain extra fields the prompt template
// doesn't reference. The fields used by the prompt are length-capped to bound
// prompt-injection blast radius and per-call OpenAI token cost.
export const generatePitchSchema = z
  .object({
    name: z.string().max(200).optional(),
    website: z.string().max(500).optional(),
    load_time: z.number().nullable().optional(),
    mobile_friendly: z.boolean().optional(),
    cms_type: z.string().max(100).nullable().optional(),
    has_booking: z.boolean().optional(),
    rating: z.string().max(100).nullable().optional(),
  })
  .passthrough();

// SECURITY: /api/team/invites POST — validates invite payload.
// Email is validated as a proper email format, role is locked to ADMIN/SALES.
export const inviteSchema = z
  .object({
    email: z.string().email('Must be a valid email address').max(254).trim().toLowerCase(),
    role: z.enum(['ADMIN', 'SALES']).optional().default('SALES'),
  })
  .strict();


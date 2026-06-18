/**
 * Types, constants, and Zod schemas for the Game Plan strategy tracker
 * (/admin/strategy). Shared by the API routes, the service layer, and the
 * client page — this file must stay free of server-only imports (no Prisma)
 * so it can be bundled into the client.
 */

import { z } from 'zod';

/** Strategic pillars, in display order. */
export const PILLARS = ['finance', 'operations', 'acquisition', 'partnerships'] as const;
export type Pillar = (typeof PILLARS)[number];

/** Execution status of an initiative. */
export const STATUSES = ['not_started', 'in_progress', 'blocked', 'done'] as const;
export type InitiativeStatus = (typeof STATUSES)[number];

/** Priority / sequencing tier. */
export const PRIORITIES = ['now', 'next', 'later'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Director-recommendation domains an initiative can surface inline. */
export const LINKED_DOMAINS = ['finance', 'operations', 'marketing', 'seo'] as const;
export type LinkedDomain = (typeof LINKED_DOMAINS)[number];

/** Display metadata per pillar (label + one-line blurb for the section header). */
export const PILLAR_META: Record<Pillar, { label: string; blurb: string }> = {
  finance: {
    label: 'Finances',
    blurb: 'Accurate numbers so we can measure the bottom line.',
  },
  operations: {
    label: 'Operations & Delegation',
    blurb: 'Hand off the daily grind to free up owner time.',
  },
  acquisition: {
    label: 'Paid Acquisition',
    blurb: 'Segment landing pages + Google Ads by customer type.',
  },
  partnerships: {
    label: 'Rental Partnerships',
    blurb: 'The short-term-rental channel: Five-Star, Neal, magnets.',
  },
};

export const STATUS_LABEL: Record<InitiativeStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  now: 'Now',
  next: 'Next',
  later: 'Later',
};

export const LINKED_DOMAIN_LABEL: Record<LinkedDomain, string> = {
  finance: 'Finance',
  operations: 'Operations',
  marketing: 'Marketing',
  seo: 'SEO',
};

/**
 * A small step inside an initiative. Declared as a `type` (not `interface`) so
 * it carries an implicit index signature and is assignable to Prisma's
 * InputJsonValue when written to the JSON column.
 */
export type Subtask = {
  id: string;
  label: string;
  done: boolean;
  createdAt: string;
};

/** An append-only progress note on an initiative. (`type` for the same reason.) */
export type InitiativeUpdate = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

/** The shape returned by the API and rendered by the UI. */
export interface StrategyInitiativeDTO {
  id: string;
  pillar: Pillar;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  priority: Priority;
  owner: string | null;
  nextAction: string | null;
  targetDate: string | null; // yyyy-mm-dd
  linkedDomain: LinkedDomain | null;
  sortOrder: number;
  subtasks: Subtask[];
  updates: InitiativeUpdate[];
  createdAt: string;
  updatedAt: string;
}

/** Per-domain open-recommendation counts + a few sample titles, for the cards. */
export interface LinkedRecsSummary {
  counts: Record<LinkedDomain, number>;
  titles: Record<LinkedDomain, string[]>;
}

export interface StrategyListResponse {
  initiatives: StrategyInitiativeDTO[];
  recs: LinkedRecsSummary;
}

// --- Zod schemas (request validation) ------------------------------------

export const subtaskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  done: z.boolean(),
  createdAt: z.string().min(1),
});

export const createInitiativeSchema = z.object({
  pillar: z.enum(PILLARS),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullish(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  owner: z.string().max(60).nullish(),
  nextAction: z.string().max(500).nullish(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use yyyy-mm-dd').nullish(),
  linkedDomain: z.enum(LINKED_DOMAINS).nullish(),
  sortOrder: z.number().int().optional(),
});
export type CreateInitiativeInput = z.infer<typeof createInitiativeSchema>;

export const updateInitiativeSchema = z.object({
  pillar: z.enum(PILLARS).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  owner: z.string().max(60).nullish(),
  nextAction: z.string().max(500).nullish(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use yyyy-mm-dd').nullish(),
  linkedDomain: z.enum(LINKED_DOMAINS).nullish(),
  sortOrder: z.number().int().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});
export type UpdateInitiativeInput = z.infer<typeof updateInitiativeSchema>;

export const addUpdateSchema = z.object({
  author: z.string().min(1, 'Author is required').max(60),
  body: z.string().min(1, 'Note cannot be empty').max(2000),
});
export type AddUpdateInput = z.infer<typeof addUpdateSchema>;

/**
 * Shared Zod schemas for the DB-backed experiment system (System B).
 *
 * Single source of truth for what a variant's hero-copy payload may contain —
 * consumed by the admin create route AND the seed script, so the two can never
 * drift. (Brian's code-registry system has its own types; untouched.)
 */

import { z } from 'zod';

/**
 * Hero-copy payload an operator can set per variant. All fields optional —
 * an absent field falls back to the page's default copy.
 * `headlineAccent` is the gold second line on the LandingPageTemplate landers
 * (bachelor/bachelorette/corporate/wedding-weekend); other pages ignore it.
 */
export const VariantContentSchema = z.object({
  eyebrow: z.string().max(200).optional(),
  headline: z.string().max(300).optional(),
  headlineAccent: z.string().max(200).optional(),
  subhead: z.string().max(500).optional(),
  ctaText: z.string().max(120).optional(),
});

export type VariantContent = z.infer<typeof VariantContentSchema>;

/** Validation schema for creating an experiment. */
export const CreateExperimentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  page: z.string().min(1, 'Page is required'),
  elementId: z.string().min(1, 'Element ID is required'),
  goalMetric: z.enum(['cta_click', 'scroll_depth', 'conversion', 'revenue']),
  goalValue: z.string().max(120).optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isControl: z.boolean().default(false),
        weight: z.number().min(0).max(100).default(50),
        content: VariantContentSchema.optional(),
      })
    )
    .min(2, 'At least 2 variants required'),
});

export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;

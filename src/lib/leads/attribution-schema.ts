/**
 * Shared Zod schema for the client-side first-touch attribution snapshot
 * (see src/lib/analytics/attribution.ts → getAttribution()).
 *
 * Used by the quote/lead API routes that accept an optional `attribution`
 * field. Everything is optional/nullable so older cached client bundles
 * that don't send it never 400.
 */
import { z } from 'zod';

export const attributionSchema = z
  .object({
    landingPage: z.string().max(500).optional().nullable(),
    utmSource: z.string().max(200).optional().nullable(),
    utmMedium: z.string().max(200).optional().nullable(),
    utmCampaign: z.string().max(200).optional().nullable(),
    utmContent: z.string().max(200).optional().nullable(),
    utmTerm: z.string().max(200).optional().nullable(),
    referrer: z.string().max(2000).optional().nullable(),
    gclid: z.string().max(200).optional().nullable(),
    gbraid: z.string().max(200).optional().nullable(),
    wbraid: z.string().max(200).optional().nullable(),
    fbclid: z.string().max(200).optional().nullable(),
    msclkid: z.string().max(200).optional().nullable(),
    capturedAt: z.string().max(40).optional().nullable(),
  })
  .optional()
  .nullable();

/** Parsed attribution payload (when present). */
export type AttributionInput = NonNullable<z.infer<typeof attributionSchema>>;

/** Drop null/blank values so metadata/notes stay compact. */
export function compactAttribution(a: AttributionInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(a)) {
    if (typeof value === 'string' && value.trim()) out[key] = value.slice(0, 500);
  }
  return out;
}

/**
 * One-line `key=value | key=value` rendering for plain-text carriers
 * (e.g. DraftOrder.adminNotes — it has no metadata Json column).
 * Omits `capturedAt` — it's noise in an ops note.
 */
export function attributionNoteLine(
  a: AttributionInput | null | undefined,
): string | null {
  if (!a) return null;
  const compact = compactAttribution(a);
  delete compact.capturedAt;
  const parts = Object.entries(compact).map(
    ([key, value]) => `${key}=${value.slice(0, 200)}`,
  );
  return parts.length > 0 ? `Attribution: ${parts.join(' | ')}` : null;
}

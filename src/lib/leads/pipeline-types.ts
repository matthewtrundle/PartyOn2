/**
 * Lead Flow board — stage vocabulary + transition rules.
 *
 * `pipelineStage` is deliberately a plain string column (TEXT + DB CHECK, see
 * 2026-07-13-lead-pipeline.sql), NOT a Postgres/Prisma enum — adding a stage
 * later is a code-only change. This module is the single source of truth for
 * the allowed values. Prisma-free so board client components can import it.
 */

export const PIPELINE_STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'QUOTE_SENT',
  'WON',
  'LOST',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Stages that mean "still being worked" — sweeps and auto-moves only touch these. */
export const ACTIVE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT'] as const;
export type ActiveStage = (typeof ACTIVE_STAGES)[number];

/** How a stage change happened — stored on the stage.changed LeadEvent. */
export type StageChangeVia =
  | 'drag' // staff moved the card on the board
  | 'auto' // sweep (draft detected → QUOTE_SENT)
  | 'reply' // email reply sent from the board (NEW → CONTACTED)
  | 'touch' // operator logged a call/text from the board (NEW → CONTACTED)
  | 'order' // paid order / deposit matched (→ WON)
  | 'reopen' // WON/LOST lead submitted a fresh inquiry (→ NEW)
  | 'enroll' // lead entered the board (→ NEW)
  | 'queue'; // operator worked the card in /admin/leads focus mode

export function isPipelineStage(v: unknown): v is PipelineStage {
  return typeof v === 'string' && (PIPELINE_STAGES as readonly string[]).includes(v);
}

/**
 * Server-side transition validation. The board UI adds confirm dialogs for
 * the destructive-feeling moves (into/out of WON, into LOST); the server
 * accepts any move between distinct known stages — staff are trusted, and
 * every change is audit-logged as a LeadEvent.
 *
 * Returns null when allowed, or a short kebab-case error string.
 */
export function validateTransition(
  from: PipelineStage | null,
  to: unknown,
): string | null {
  if (!isPipelineStage(to)) return 'unknown-stage';
  if (from === to) return 'same-stage';
  return null;
}

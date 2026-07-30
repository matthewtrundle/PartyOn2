/**
 * Enrollment gates for the partner-outreach campaign (pure, unit-tested).
 *
 * A prospect can only be enrolled when every gate passes; the returned
 * reason strings surface in the workbench ("Skipped: acme.com
 * (email-not-verified)") and mirror the UI's disable-reasons.
 *
 * VERIFICATION POLICY (Allan, 2026-07-29 — replaced the per-prospect override):
 * if ZeroBounce could check the address and did not say the mailbox is missing,
 * we send. Catch-all and role addresses (info@ / hello@ / reservations@) are
 * usually exactly what a business publishes for inbound contact, so making the
 * operator tick a box to confirm a decision they already made by adding the
 * prospect bought nothing. Only INVALID stays blocked — that is ZeroBounce
 * saying the mailbox does not exist, i.e. a guaranteed hard bounce, which is
 * the one outcome that damages sending reputation.
 */

import type { StoredProspect } from './prospect-store';

export type EnrollGateReason =
  | 'no-email'
  | 'suppressed'
  | 'draft-not-approved'
  | 'email-invalid'
  | 'email-not-verified';

/**
 * The first failing gate, or null when the prospect is enrollable.
 * `suppressed` is looked up by the caller (suppression table).
 */
export function enrollGateReason(
  prospect: Pick<StoredProspect, 'email' | 'draftStatus' | 'emailVerifyStatus'>,
  suppressed: boolean
): EnrollGateReason | null {
  if (!prospect.email) return 'no-email';
  if (suppressed) return 'suppressed';
  if (prospect.draftStatus !== 'APPROVED') return 'draft-not-approved';
  switch (prospect.emailVerifyStatus) {
    case 'VALID':
    case 'CATCH_ALL':
    case 'ROLE':
      return null;
    case 'INVALID':
      // Mailbox does not exist — sending guarantees a hard bounce.
      return 'email-invalid';
    default:
      // UNVERIFIED / UNKNOWN — run Verify first. Verification still gates
      // sending; it is only the catch-all/role *confirmation* that is gone.
      return 'email-not-verified';
  }
}

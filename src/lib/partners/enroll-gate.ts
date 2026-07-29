/**
 * Enrollment gates for the partner-outreach campaign (pure, unit-tested).
 *
 * A prospect can only be enrolled when every gate passes; the returned
 * reason strings surface in the workbench ("Skipped: acme.com
 * (email-catch-all-needs-override)") and mirror the UI's checkbox
 * disable-reasons.
 */

import type { StoredProspect } from './prospect-store';

export type EnrollGateReason =
  | 'no-email'
  | 'suppressed'
  | 'draft-not-approved'
  | 'email-invalid'
  | 'email-not-verified'
  | 'email-catch-all-needs-override'
  | 'email-role-needs-override';

/**
 * The first failing gate, or null when the prospect is enrollable.
 * `suppressed` is looked up by the caller (suppression table).
 */
export function enrollGateReason(
  prospect: Pick<
    StoredProspect,
    'email' | 'draftStatus' | 'emailVerifyStatus' | 'emailVerifyOverride'
  >,
  suppressed: boolean
): EnrollGateReason | null {
  if (!prospect.email) return 'no-email';
  if (suppressed) return 'suppressed';
  if (prospect.draftStatus !== 'APPROVED') return 'draft-not-approved';
  switch (prospect.emailVerifyStatus) {
    case 'VALID':
      return null;
    case 'CATCH_ALL':
      return prospect.emailVerifyOverride ? null : 'email-catch-all-needs-override';
    case 'ROLE':
      // A role address (info@ / hello@ / reservations@) is usually the address
      // the business publishes on its own site for exactly this contact — at a
      // small operator it IS the owner's inbox. So it is an operator decision,
      // not a hard block: same per-prospect override as CATCH_ALL. Pair it with
      // a non-personal greeting; "Hi <FirstName>" into a shared inbox reads as
      // a mail merge. Deliberately NOT blanket-allowed — the override is ticked
      // one row at a time.
      return prospect.emailVerifyOverride ? null : 'email-role-needs-override';
    case 'INVALID':
      return 'email-invalid';
    default:
      // UNVERIFIED / UNKNOWN — run Verify first.
      return 'email-not-verified';
  }
}

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
  | 'email-catch-all-needs-override';

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
    case 'INVALID':
    case 'ROLE':
      return 'email-invalid';
    default:
      // UNVERIFIED / UNKNOWN — run Verify first.
      return 'email-not-verified';
  }
}

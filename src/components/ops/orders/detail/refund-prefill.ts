/**
 * Netting logic for the amendment-driven refund prefill in the order action
 * sheet. A PENDING refund amendment calls for |amountDelta|, but refunds may
 * already have been recorded against the order after the amendment was
 * created (a retry after a mismatch, a manual partial, another session).
 * Prefilling the full |amountDelta| in that state over-refunds, bounded only
 * by the order-level Stripe cap — so the prefill offers the remainder instead
 * (security review of PR #225, LOW).
 */

/** The slice of an amendment the netting math needs. */
export interface AmendmentForPrefill {
  /** Signed dollar delta; refund amendments are negative. */
  amountDelta: number;
  /** ISO timestamp the amendment was created. */
  createdAt: string;
}

/** The slice of a recorded refund the netting math needs. */
export interface RefundForPrefill {
  /** Refunded dollars (positive). */
  amount: number;
  /** ISO timestamp the refund row was recorded. */
  createdAt: string;
}

export interface AmendmentRefundPrefill {
  /** What the amendment calls for: |amountDelta|, in dollars. */
  amendmentAmount: number;
  /** Dollars refunded at or after the amendment was created. */
  refundedSinceAmendment: number;
  /** Amount the refund form should be seeded with (never negative). */
  suggestedAmount: number;
  /** True when refunds since creation already cover the full amendment. */
  fullyCovered: boolean;
}

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Nets an amendment's refund amount against refunds recorded at or after the
 * amendment's createdAt. Refunds recorded BEFORE the amendment are untouched:
 * they compensated earlier events and are already reflected in the totals the
 * amendment's delta was computed from.
 *
 * Safety posture (this seeds a money-out form, so every ambiguity resolves
 * toward offering LESS):
 * - A refund with a timestamp equal to the amendment's counts as "since".
 * - Unparseable timestamps (either side) count as "since".
 * - All refund rows count regardless of status/origin, matching how
 *   `totalRefunded` and the refund route's prior-refund sum are computed.
 *
 * Callers gate on amountDelta < 0 (refund-direction amendments); the math
 * uses |amountDelta| either way.
 */
export function computeAmendmentRefundPrefill(
  amendment: AmendmentForPrefill,
  refunds: RefundForPrefill[]
): AmendmentRefundPrefill {
  const amendmentTs = Date.parse(amendment.createdAt);
  const amendmentCents = toCents(Math.abs(amendment.amountDelta));

  const refundedSinceCents = refunds.reduce((sum, refund) => {
    const refundTs = Date.parse(refund.createdAt);
    const since =
      Number.isNaN(amendmentTs) || Number.isNaN(refundTs) || refundTs >= amendmentTs;
    return since ? sum + toCents(refund.amount) : sum;
  }, 0);

  const suggestedCents = Math.max(0, amendmentCents - refundedSinceCents);

  return {
    amendmentAmount: amendmentCents / 100,
    refundedSinceAmendment: refundedSinceCents / 100,
    suggestedAmount: suggestedCents / 100,
    fullyCovered: amendmentCents > 0 && suggestedCents === 0,
  };
}

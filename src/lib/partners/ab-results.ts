/**
 * Partner Outreach 2.0 — A/B results for the first-touch copy test.
 *
 * Pure aggregation (no DB) so it's unit-tested: given one record per prospect
 * that has been SENT at least once (its arm + whether it opened / replied),
 * compute per-arm reply rate (the win metric — see the plan) and feed reply
 * counts into the shared two-proportion z-test (computeSignificance). The unit
 * is the PROSPECT, not the send: a reply is a per-prospect event.
 *
 * B ('detailed') is the control because it is the incumbent style; A ('short')
 * is the challenger. The z-test itself is symmetric, but this makes "lift" read
 * as short-vs-detailed and the winner gate as "does short beat detailed?".
 *
 * Honesty gate: computeSignificance needs ≥100 per arm to call a winner, which
 * cold-outreach batch volume will not hit for a long time. We surface the
 * directional rates always and an explicit "not enough data" note rather than
 * ever implying a call the sample can't support.
 */

import {
  computeSignificance,
  type SignificanceResult,
} from '@/lib/analytics/experiment-significance';

export type OutreachArmKey = 'A' | 'B';

/** One sent prospect's outcome, the input unit for the aggregation. */
export interface OutreachAbProspect {
  arm: OutreachArmKey;
  opened: boolean;
  replied: boolean;
}

export interface OutreachArmStat {
  arm: OutreachArmKey;
  /** Human label for the arm's style. */
  label: 'short' | 'detailed';
  /** Prospects sent at least once (the denominator). */
  sent: number;
  opened: number;
  replied: number;
  /** replied / sent, 0 when sent === 0. */
  replyRate: number;
  /** opened / sent, 0 when sent === 0 (secondary/directional only). */
  openRate: number;
}

export interface OutreachAbResult {
  arms: OutreachArmStat[];
  /** Two-proportion z-test on REPLY rate (B = control). */
  significance: SignificanceResult;
  /** True only when computeSignificance has enough data AND named a winner. */
  callable: boolean;
  /** Honest one-liner for the UI about whether the result can be trusted yet. */
  note: string;
}

const ARM_LABEL: Record<OutreachArmKey, 'short' | 'detailed'> = { A: 'short', B: 'detailed' };

function rate(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

/**
 * Aggregate per-prospect outcomes into per-arm reply-rate stats + significance.
 * `prospects` should already be filtered to those SENT at least once and
 * carrying an arm label.
 */
export function computeOutreachAbResults(prospects: OutreachAbProspect[]): OutreachAbResult {
  const arms: OutreachArmStat[] = (['A', 'B'] as const).map((arm) => {
    const rows = prospects.filter((p) => p.arm === arm);
    const sent = rows.length;
    const opened = rows.filter((p) => p.opened).length;
    const replied = rows.filter((p) => p.replied).length;
    return {
      arm,
      label: ARM_LABEL[arm],
      sent,
      opened,
      replied,
      replyRate: rate(replied, sent),
      openRate: rate(opened, sent),
    };
  });

  const byArm = (k: OutreachArmKey): OutreachArmStat => arms.find((a) => a.arm === k)!;
  const a = byArm('A');
  const b = byArm('B');

  const significance = computeSignificance([
    // B (detailed) is the incumbent control; A (short) is the challenger.
    { id: 'B', name: 'detailed', isControl: true, impressions: b.sent, conversions: b.replied },
    { id: 'A', name: 'short', isControl: false, impressions: a.sent, conversions: a.replied },
  ]);

  const callable = significance.hasEnoughData && significance.winner != null;
  const note = buildNote(a.sent, b.sent, significance);

  return { arms, significance, callable, note };
}

function buildNote(sentA: number, sentB: number, sig: SignificanceResult): string {
  if (sentA === 0 && sentB === 0) return 'No sends yet — enroll approved prospects to start the test.';
  if (!sig.hasEnoughData) {
    return `Directional only — need ≥100 replies-eligible prospects per arm for a 95% call (have ${sentA} short / ${sentB} detailed).`;
  }
  if (sig.winner) {
    const conf = sig.winner.confidence != null ? Math.round(sig.winner.confidence * 100) : null;
    return `Winner: ${sig.winner.name}${conf != null ? ` at ${conf}% confidence` : ''}.`;
  }
  return 'Enough volume, but no arm is a clear winner yet.';
}

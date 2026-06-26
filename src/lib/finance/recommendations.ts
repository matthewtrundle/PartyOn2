/**
 * Finance Director recommendation orchestrator.
 *
 * Runs every detector function, persists the results through the dedupe
 * store. Called by the daily P&L snapshot cron after the snapshot row is
 * written (so detectors can read it).
 */

import { upsertRecommendations, type UpsertSummary } from './recommendation-store';
import {
  detectAffiliateCommissionAging,
  detectCashRunwayLow,
  detectDiscountOveruse,
  detectGrossMarginTrendingDown,
  detectOpexCategorySpiking,
  detectPlaidSyncError,
  detectQbSyncError,
  detectStripePayoutUnmatched,
  detectUntouchedBankTransaction,
} from './detectors/signals-a';
import type { PlSnapshotPayload } from './pl-calculation';
import type { FinanceRecommendationInput } from './types';

export interface GenerateResult {
  total: number;
  perSignal: Record<string, number>;
  upsert: UpsertSummary;
}

export async function generateAll(
  snapshot: PlSnapshotPayload | null,
  now: Date = new Date()
): Promise<GenerateResult> {
  const results: Array<[string, FinanceRecommendationInput[]]> = [];
  // Each detector wrapped in try/catch so one DB hiccup doesn't kill the run.
  async function run(
    label: string,
    fn: () => Promise<FinanceRecommendationInput[]>
  ): Promise<void> {
    try {
      results.push([label, await fn()]);
    } catch (err) {
      console.error(`[finance-recs] detector ${label} failed:`, err);
      results.push([label, []]);
    }
  }

  await run('stripe-payout-unmatched', () => detectStripePayoutUnmatched(now));
  await run('cash-runway-low', () => detectCashRunwayLow(snapshot, now));
  await run('gross-margin-trending-down', () => detectGrossMarginTrendingDown(now));
  await run('opex-category-spiking', () => detectOpexCategorySpiking(now));
  await run('affiliate-commission-aging', () => detectAffiliateCommissionAging(now));
  await run('discount-overuse', () => detectDiscountOveruse(now));
  await run('untouched-bank-transaction', () => detectUntouchedBankTransaction(now));
  await run('qb-sync-error', () => detectQbSyncError());
  await run('plaid-sync-error', () => detectPlaidSyncError());

  const flat = results.flatMap(([, recs]) => recs);
  const perSignal: Record<string, number> = {};
  for (const [label, recs] of results) perSignal[label] = recs.length;
  const upsert = await upsertRecommendations(flat);

  return { total: flat.length, perSignal, upsert };
}

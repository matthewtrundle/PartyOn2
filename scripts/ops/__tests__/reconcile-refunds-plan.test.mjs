/**
 * Unit tests for the pure planner in scripts/ops/reconcile-duplicate-refunds.mjs.
 *
 * planOrder() decides which financial Refund rows get permanently deleted, so its
 * edge cases are pinned here. The script is import-safe (its CLI entrypoint is
 * guarded by an import.meta check), so importing planOrder does not touch the DB,
 * Stripe, or the environment.
 */
import { describe, it, expect } from 'vitest';
import { planOrder, WEBHOOK_IDEMPOTENT_SINCE } from '../reconcile-duplicate-refunds.mjs';

const PRE = new Date('2026-05-24T15:03:28.000Z'); // before the #171 idempotency cutover
const POST = new Date('2026-07-01T00:00:00.000Z'); // after the cutover
const order = { id: 'order_1', orderNumber: 197 };
const NONE = new Set();

function row(id, amount, opts = {}) {
  const { stripeRefundId = null, reason = 'Stripe refund', createdAt = PRE } = opts;
  return { id, stripeRefundId, amount, reason, processedBy: stripeRefundId ? 'admin' : null, createdAt };
}
function sref(id, dollars, status = 'succeeded') {
  return { id, amountCents: Math.round(dollars * 100), status };
}

describe('planOrder — refund de-dup planner', () => {
  it('deletes BOTH dupes for the #197 cumulative-total pattern (pre-cutover)', () => {
    const dbRows = [
      row('r_real1', 238.93, { stripeRefundId: 're_a', reason: 'Return: items returned' }),
      row('r_dup1', 238.93), // same-amount webhook dupe
      row('r_real2', 295.9, { stripeRefundId: 're_b', reason: 'Return: items returned' }),
      row('r_cumul', 534.83), // cumulative-total webhook dupe (matches no single Stripe refund)
    ];
    const stripeRefunds = [sref('re_a', 238.93), sref('re_b', 295.9)];
    const plan = planOrder(order, dbRows, stripeRefunds, NONE);
    expect(plan.ok).toBe(true);
    expect(plan.merges).toHaveLength(0);
    expect(plan.deletes.map((d) => d.rowId).sort()).toEqual(['r_cumul', 'r_dup1']);
  });

  it('deletes a plain same-amount dupe (pre-cutover) and reconciles 1:1', () => {
    const dbRows = [
      row('r_real', 90.49, { stripeRefundId: 're_a', reason: 'Order cancelled' }),
      row('r_dup', 90.49),
    ];
    const plan = planOrder(order, dbRows, [sref('re_a', 90.49)], NONE);
    expect(plan.ok).toBe(true);
    expect(plan.deletes.map((d) => d.rowId)).toEqual(['r_dup']);
  });

  it('does NOT delete a same-shaped orphan created AFTER the cutover (race-safety fence)', () => {
    const dbRows = [
      row('r_real', 50.0, { stripeRefundId: 're_a', reason: 'Order cancelled', createdAt: POST }),
      row('r_orphan', 50.0, { createdAt: POST }), // legit-looking null-id 'Stripe refund' post-cutover
    ];
    const plan = planOrder(order, dbRows, [sref('re_a', 50.0)], NONE);
    expect(plan.deletes).toHaveLength(0);
    expect(plan.ok).toBe(false); // leftover row → post-condition fails → NEEDS-MANUAL
    expect(plan.notes.join(' ')).toMatch(/after the #171 idempotency cutover/i);
  });

  it('never deletes when a live Stripe refund has no DB row (missing record)', () => {
    const plan = planOrder(order, [row('r_dup', 99.99)], [sref('re_a', 40.0)], NONE);
    expect(plan.deletes).toHaveLength(0);
    expect(plan.ok).toBe(false);
    expect(plan.notes.join(' ')).toMatch(/missing record/i);
  });

  it('merges (stamps) an unstamped orphan that matches a real Stripe refund — never deletes it', () => {
    const plan = planOrder(order, [row('r_orphan', 8.97)], [sref('pyr_x', 8.97)], NONE);
    expect(plan.ok).toBe(true);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0]).toMatchObject({ rowId: 'r_orphan', stripeRefundId: 'pyr_x' });
    expect(plan.deletes).toHaveLength(0);
  });

  it('never deletes an orphan referenced by an OrderAmendment', () => {
    const dbRows = [
      row('r_real', 40.0, { stripeRefundId: 're_a', reason: 'Order amendment refund' }),
      row('r_amend_orphan', 40.0),
    ];
    const plan = planOrder(order, dbRows, [sref('re_a', 40.0)], new Set(['r_amend_orphan']));
    expect(plan.deletes).toHaveLength(0);
    expect(plan.notes.join(' ')).toMatch(/OrderAmendment/i);
    expect(plan.ok).toBe(false);
  });

  it('fails the whole order SAFE when a stamped row references a refund Stripe does not list (ghost)', () => {
    const dbRows = [
      row('r_ghost', 40.0, { stripeRefundId: 're_missing', reason: 'Order cancelled' }),
      row('r_orphan', 40.0),
    ];
    const plan = planOrder(order, dbRows, [sref('re_a', 40.0)], NONE);
    expect(plan.ok).toBe(false);
    expect(plan.deletes).toHaveLength(0);
    expect(plan.merges).toHaveLength(0);
    expect(plan.notes.join(' ')).toMatch(/Stripe does not list/i);
  });

  it('does not treat a non-webhook orphan (different reason) as a dupe', () => {
    const dbRows = [
      row('r_real', 40.0, { stripeRefundId: 're_a', reason: 'Order cancelled' }),
      row('r_manual', 40.0, { reason: 'Store credit' }), // manual DB-only refund, not a webhook artifact
    ];
    const plan = planOrder(order, dbRows, [sref('re_a', 40.0)], NONE);
    expect(plan.deletes).toHaveLength(0);
    expect(plan.ok).toBe(false);
  });

  it('the cutover fence is the documented instant', () => {
    expect(WEBHOOK_IDEMPOTENT_SINCE.toISOString()).toBe('2026-06-28T00:00:00.000Z');
  });
});

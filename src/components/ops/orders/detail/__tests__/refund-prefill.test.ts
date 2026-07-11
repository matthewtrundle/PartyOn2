import { describe, it, expect } from 'vitest';
import { computeAmendmentRefundPrefill, claimedRefundIds } from '../refund-prefill';

const AMENDED_AT = '2026-07-10T12:00:00.000Z';
const BEFORE = '2026-07-10T11:59:59.000Z';
const AFTER = '2026-07-10T12:00:01.000Z';

function amendment(amountDelta: number, createdAt = AMENDED_AT) {
  return { amountDelta, createdAt };
}

describe('computeAmendmentRefundPrefill', () => {
  it('prefills the full |amountDelta| when no refunds exist', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), []);
    expect(result).toEqual({
      amendmentAmount: 57,
      refundedSinceAmendment: 0,
      suggestedAmount: 57,
      fullyCovered: false,
    });
  });

  it('ignores refunds recorded before the amendment was created', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 20, createdAt: BEFORE },
    ]);
    expect(result.refundedSinceAmendment).toBe(0);
    expect(result.suggestedAmount).toBe(57);
    expect(result.fullyCovered).toBe(false);
  });

  it('nets a refund recorded at exactly the amendment timestamp', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 20, createdAt: AMENDED_AT },
    ]);
    expect(result.refundedSinceAmendment).toBe(20);
    expect(result.suggestedAmount).toBe(37);
  });

  it('nets partial refunds recorded after the amendment', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 20, createdAt: AFTER },
    ]);
    expect(result).toEqual({
      amendmentAmount: 57,
      refundedSinceAmendment: 20,
      suggestedAmount: 37,
      fullyCovered: false,
    });
  });

  it('nets only the refunds recorded after when the history is mixed', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 15, createdAt: BEFORE },
      { amount: 10, createdAt: AFTER },
      { amount: 5, createdAt: AFTER },
    ]);
    expect(result.refundedSinceAmendment).toBe(15);
    expect(result.suggestedAmount).toBe(42);
  });

  it('suggests zero and reports fullyCovered when refunds meet the amount', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 57, createdAt: AFTER },
    ]);
    expect(result.suggestedAmount).toBe(0);
    expect(result.fullyCovered).toBe(true);
  });

  it('never suggests a negative amount when refunds exceed the amendment', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 60, createdAt: AFTER },
    ]);
    expect(result.suggestedAmount).toBe(0);
    expect(result.fullyCovered).toBe(true);
    expect(result.refundedSinceAmendment).toBe(60);
  });

  it('rounds in cents so float dust cannot leave a phantom remainder', () => {
    // 10.03 + 20.07 !== 30.10 in binary floats; cents math must net to 0.
    const result = computeAmendmentRefundPrefill(amendment(-30.1), [
      { amount: 10.03, createdAt: AFTER },
      { amount: 20.07, createdAt: AFTER },
    ]);
    expect(result.suggestedAmount).toBe(0);
    expect(result.fullyCovered).toBe(true);
  });

  it('nets every refund when the amendment timestamp is unparseable (safe direction)', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57, 'not-a-date'), [
      { amount: 20, createdAt: BEFORE },
    ]);
    expect(result.refundedSinceAmendment).toBe(20);
    expect(result.suggestedAmount).toBe(37);
  });

  it('nets a refund whose timestamp is unparseable (safe direction)', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: 20, createdAt: 'not-a-date' },
    ]);
    expect(result.refundedSinceAmendment).toBe(20);
    expect(result.suggestedAmount).toBe(37);
  });

  it('treats a zero-delta amendment as nothing to refund, not fully covered', () => {
    const result = computeAmendmentRefundPrefill(amendment(0), []);
    expect(result.suggestedAmount).toBe(0);
    expect(result.fullyCovered).toBe(false);
  });

  it('uses the magnitude of the (negative) refund delta', () => {
    const result = computeAmendmentRefundPrefill(amendment(-19.99), []);
    expect(result.amendmentAmount).toBe(19.99);
    expect(result.suggestedAmount).toBe(19.99);
  });

  it('ignores negative refund amounts instead of inflating the offer', () => {
    const result = computeAmendmentRefundPrefill(amendment(-57), [
      { amount: -20, createdAt: AFTER },
    ]);
    expect(result.refundedSinceAmendment).toBe(0);
    expect(result.suggestedAmount).toBe(57);
  });

  it('does not net a refund that resolved a different amendment', () => {
    // Amendment A (-$30, earlier) was refunded in full at AFTER and stamped
    // with refund "ref-a". Amendment B (-$20) must not treat A's money as
    // covering it — B is still owed in full.
    const result = computeAmendmentRefundPrefill(
      amendment(-20),
      [{ id: 'ref-a', amount: 30, createdAt: AFTER }],
      { excludeRefundIds: new Set(['ref-a']) }
    );
    expect(result.refundedSinceAmendment).toBe(0);
    expect(result.suggestedAmount).toBe(20);
    expect(result.fullyCovered).toBe(false);
  });

  it('still nets unclaimed refunds when an exclusion set is provided', () => {
    const result = computeAmendmentRefundPrefill(
      amendment(-57),
      [
        { id: 'ref-a', amount: 30, createdAt: AFTER },
        { id: 'ref-b', amount: 20, createdAt: AFTER },
      ],
      { excludeRefundIds: new Set(['ref-a']) }
    );
    expect(result.refundedSinceAmendment).toBe(20);
    expect(result.suggestedAmount).toBe(37);
  });

  it('nets refunds without an id even when an exclusion set is provided', () => {
    const result = computeAmendmentRefundPrefill(
      amendment(-57),
      [{ amount: 20, createdAt: AFTER }],
      { excludeRefundIds: new Set(['ref-a']) }
    );
    expect(result.refundedSinceAmendment).toBe(20);
    expect(result.suggestedAmount).toBe(37);
  });
});

describe('claimedRefundIds', () => {
  it('collects stamped refund ids and skips unresolved amendments', () => {
    const ids = claimedRefundIds([
      { refundId: 'ref-a' },
      { refundId: null },
      { refundId: 'ref-b' },
    ]);
    expect(ids).toEqual(new Set(['ref-a', 'ref-b']));
  });

  it('returns an empty set for no amendments', () => {
    expect(claimedRefundIds([]).size).toBe(0);
  });
});

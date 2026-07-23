/**
 * Board joins — pure pieces: the lead → dashboard reference extraction and
 * the cart math (Decimal-ish price inputs, quantity weighting, rounding).
 */

import { describe, it, expect } from 'vitest';
import { dashboardGroupId, summarizeCartTabs } from '../board-joins';

describe('dashboardGroupId', () => {
  it('reads metadata.groupDashboard.groupOrderId', () => {
    expect(dashboardGroupId({ groupDashboard: { groupOrderId: 'g1', shareCode: 'ABC123' } })).toBe(
      'g1',
    );
  });

  it('returns null for missing/malformed metadata', () => {
    expect(dashboardGroupId(null)).toBeNull();
    expect(dashboardGroupId({})).toBeNull();
    expect(dashboardGroupId({ groupDashboard: null })).toBeNull();
    expect(dashboardGroupId({ groupDashboard: { groupOrderId: '' } })).toBeNull();
    expect(dashboardGroupId({ groupDashboard: { groupOrderId: 42 } })).toBeNull();
    expect(dashboardGroupId([{ groupDashboard: { groupOrderId: 'g1' } }])).toBeNull();
  });
});

describe('summarizeCartTabs', () => {
  it('sums price × quantity across all tabs and counts units', () => {
    const out = summarizeCartTabs([
      { draftItems: [{ price: 24.99, quantity: 2 }, { price: 10, quantity: 1 }] },
      { draftItems: [{ price: '15.50', quantity: 3 }] }, // Decimal serialized as string
    ]);
    expect(out.total).toBe(106.48); // 49.98 + 10 + 46.50
    expect(out.itemCount).toBe(6);
  });

  it('skips unparseable prices and handles empty carts', () => {
    expect(summarizeCartTabs([{ draftItems: [{ price: 'n/a', quantity: 4 }] }])).toEqual({
      total: 0,
      itemCount: 0,
    });
    expect(summarizeCartTabs([])).toEqual({ total: 0, itemCount: 0 });
    expect(summarizeCartTabs([{ draftItems: [] }])).toEqual({ total: 0, itemCount: 0 });
  });

  it('rounds to cents', () => {
    const out = summarizeCartTabs([{ draftItems: [{ price: 0.1, quantity: 3 }] }]);
    expect(out.total).toBe(0.3);
  });
});

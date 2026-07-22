import { describe, expect, it } from 'vitest';
import { computeSourceKey } from '../parse';

describe('computeSourceKey', () => {
  it('is stable across name whitespace / casing', () => {
    const a = computeSourceKey('Sarah LeBlanc', '2025-12-24', 336.21);
    const b = computeSourceKey('  sarah   leblanc ', '2025-12-24', 336.21);
    expect(a).toBe(b);
  });

  it('is stable across amount decimal representation', () => {
    expect(computeSourceKey('Jane Doe', '2026-01-01', 138.4)).toBe(
      computeSourceKey('Jane Doe', '2026-01-01', 138.40),
    );
  });

  it('changes when the amount changes (the duplicate-different-amount case)', () => {
    const a = computeSourceKey('Jane Doe', '2026-01-01', 125.26);
    const b = computeSourceKey('Jane Doe', '2026-01-01', 138.44);
    expect(a).not.toBe(b);
  });

  it('changes when the booking date changes', () => {
    const a = computeSourceKey('Jane Doe', '2026-01-01', 100);
    const b = computeSourceKey('Jane Doe', '2026-02-01', 100);
    expect(a).not.toBe(b);
  });

  it('handles a null booking date deterministically', () => {
    const a = computeSourceKey('Jane Doe', null, 100);
    const b = computeSourceKey('Jane Doe', null, 100);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});

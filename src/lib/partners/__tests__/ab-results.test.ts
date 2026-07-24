/**
 * A/B results aggregation for the partner-outreach first-touch test:
 * per-arm reply rate + the honesty gate that refuses to call a winner on
 * cold-outreach-sized samples.
 */

import { describe, it, expect } from 'vitest';
import { computeOutreachAbResults, type OutreachAbProspect } from '../ab-results';
import { assignAbArm } from '../prospect-store';

function make(arm: 'A' | 'B', replied: number, notReplied: number): OutreachAbProspect[] {
  return [
    ...Array.from({ length: replied }, () => ({ arm, opened: true, replied: true })),
    ...Array.from({ length: notReplied }, () => ({ arm, opened: false, replied: false })),
  ];
}

describe('computeOutreachAbResults', () => {
  it('computes per-arm reply + open rates on the prospect unit', () => {
    // A: 8 sent / 2 replied (2 opened), B: 9 sent / 1 replied (1 opened).
    const prospects = [...make('A', 2, 6), ...make('B', 1, 8)];
    const { arms } = computeOutreachAbResults(prospects);
    const a = arms.find((x) => x.arm === 'A')!;
    const b = arms.find((x) => x.arm === 'B')!;

    expect(a).toMatchObject({ label: 'short', sent: 8, replied: 2 });
    expect(a.replyRate).toBeCloseTo(0.25, 5);
    expect(b).toMatchObject({ label: 'detailed', sent: 9, replied: 1 });
    expect(b.replyRate).toBeCloseTo(1 / 9, 5);
  });

  it('refuses to call a winner at cold-outreach volume (not enough data)', () => {
    const { callable, significance, note } = computeOutreachAbResults([
      ...make('A', 2, 6),
      ...make('B', 1, 8),
    ]);
    expect(significance.hasEnoughData).toBe(false); // needs >=100/arm
    expect(callable).toBe(false);
    expect(significance.winner).toBeNull();
    expect(note).toMatch(/directional/i);
  });

  it('can call a winner once each arm clears the significance threshold', () => {
    // Big, separated samples: short 30% vs detailed 10% at n=400/arm.
    const { callable, significance } = computeOutreachAbResults([
      ...make('A', 120, 280),
      ...make('B', 40, 360),
    ]);
    expect(significance.hasEnoughData).toBe(true);
    expect(callable).toBe(true);
    expect(significance.winner?.name).toBe('short');
  });

  it('handles the no-sends case without dividing by zero', () => {
    const { arms, callable, note } = computeOutreachAbResults([]);
    expect(arms.every((a) => a.sent === 0 && a.replyRate === 0)).toBe(true);
    expect(callable).toBe(false);
    expect(note).toMatch(/no sends/i);
  });
});

describe('assignAbArm', () => {
  it('is deterministic for a given seed', () => {
    expect(assignAbArm('foo.com/x')).toBe(assignAbArm('foo.com/x'));
  });

  it('splits a population of seeds across both arms', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => `site-${i}.com`);
    const a = seeds.filter((s) => assignAbArm(s) === 'A').length;
    // Not exactly 50/50, but both arms should get a healthy share.
    expect(a).toBeGreaterThan(50);
    expect(a).toBeLessThan(150);
  });
});

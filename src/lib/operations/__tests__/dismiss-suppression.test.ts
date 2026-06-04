import { describe, it, expect } from 'vitest';
import {
  countDismissals,
  evaluateSuppression,
  REEMISSION_AGE_DAYS,
  SUPPRESSION_THRESHOLD,
} from '../dismiss-suppression';

const NOW = new Date('2026-05-19T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * DAY_MS);
}

describe('countDismissals', () => {
  it('returns 0 for non-array input', () => {
    expect(countDismissals(null)).toBe(0);
    expect(countDismissals(undefined)).toBe(0);
    expect(countDismissals('not-array')).toBe(0);
  });

  it('counts only entries with actionKind === "dismiss"', () => {
    const log = [
      { actionKind: 'dismiss', result: 'success' },
      { actionKind: 'snooze', result: 'success' },
      { actionKind: 'dismiss', result: 'success' },
      { actionKind: 'navigate', result: 'navigated' },
    ];
    expect(countDismissals(log)).toBe(2);
  });

  it('handles malformed entries gracefully', () => {
    const log = [null, 'not-an-object', { actionKind: 'dismiss' }];
    expect(countDismissals(log)).toBe(1);
  });
});

describe('evaluateSuppression', () => {
  it('skips when the rec is still within the no-re-emission window', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'rejected',
        severity: 'high',
        updatedAt: daysAgo(REEMISSION_AGE_DAYS - 5),
        actionLog: [{ actionKind: 'dismiss' }],
      },
      'high',
      NOW
    );
    expect(decision).toEqual({ action: 'skip', reason: 'recent-dismissal' });
  });

  it('skips while a snooze is still active, regardless of age', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'snoozed',
        severity: 'normal',
        updatedAt: daysAgo(90),
        snoozeUntil: new Date(NOW.getTime() + 3 * DAY_MS),
        actionLog: [],
      },
      'normal',
      NOW
    );
    expect(decision).toEqual({ action: 'skip', reason: 'still-active-snooze' });
  });

  it('re-opens an aged-out rec with no prior dismissals at the requested severity', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'invalidated',
        severity: 'normal',
        updatedAt: daysAgo(REEMISSION_AGE_DAYS + 5),
        actionLog: [],
      },
      'urgent',
      NOW
    );
    expect(decision).toEqual({ action: 'reopen', nextSeverity: 'urgent', dismissCount: 0 });
  });

  it('knocks severity down by one tier on first dismissal', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'rejected',
        severity: 'high',
        updatedAt: daysAgo(REEMISSION_AGE_DAYS + 1),
        actionLog: [{ actionKind: 'dismiss' }],
      },
      'urgent',
      NOW
    );
    expect(decision).toEqual({ action: 'reopen', nextSeverity: 'high', dismissCount: 1 });
  });

  it('knocks severity further down with two dismissals', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'rejected',
        severity: 'normal',
        updatedAt: daysAgo(REEMISSION_AGE_DAYS + 1),
        actionLog: [
          { actionKind: 'dismiss' },
          { actionKind: 'dismiss' },
        ],
      },
      'high',
      NOW
    );
    expect(decision.action).toBe('reopen');
    if (decision.action === 'reopen') {
      expect(decision.nextSeverity).toBe('normal');
      expect(decision.dismissCount).toBe(2);
    }
  });

  it('suppresses re-emission entirely once the threshold is crossed', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'rejected',
        severity: 'normal',
        updatedAt: daysAgo(REEMISSION_AGE_DAYS + 10),
        actionLog: Array.from({ length: SUPPRESSION_THRESHOLD }, () => ({ actionKind: 'dismiss' })),
      },
      'high',
      NOW
    );
    expect(decision).toEqual({
      action: 'suppress',
      reason: 'threshold-reached',
      dismissCount: SUPPRESSION_THRESHOLD,
    });
  });

  it('counts a snoozed rec whose snooze has expired as eligible for re-evaluation', () => {
    const decision = evaluateSuppression(
      {
        id: 'r1',
        status: 'snoozed',
        severity: 'high',
        updatedAt: daysAgo(REEMISSION_AGE_DAYS + 1),
        snoozeUntil: daysAgo(20), // snooze ended 20d ago
        actionLog: [],
      },
      'urgent',
      NOW
    );
    expect(decision.action).toBe('reopen');
  });
});

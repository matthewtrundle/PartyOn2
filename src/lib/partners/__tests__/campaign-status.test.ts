import { describe, expect, it } from 'vitest';
import {
  buildCampaignTouches,
  deriveCampaignState,
  firstSentAtByLead,
  isCampaignReply,
  type CampaignJobLike,
  type CampaignTouchEmail,
  type CampaignTouchJob,
} from '../campaign-status';

const T0 = new Date('2026-07-01T12:00:00Z');
const T1 = new Date('2026-07-06T12:00:00Z');
const T2 = new Date('2026-07-13T12:00:00Z');

function job(overrides: Partial<CampaignJobLike> & { leadId: string }): CampaignJobLike {
  return { status: 'sent', sentAt: T0, ...overrides };
}

function touchJob(overrides: Partial<CampaignTouchJob> & { step: number }): CampaignTouchJob {
  return {
    leadId: 'lead-1',
    status: 'scheduled',
    sentAt: null,
    scheduledFor: T0,
    cancelReason: null,
    lastError: null,
    emailLogId: null,
    ...overrides,
  };
}

describe('isCampaignReply', () => {
  it('rejects inbound before the first send', () => {
    expect(isCampaignReply(new Date(T0.getTime() - 1), T0)).toBe(false);
  });

  it('accepts inbound exactly at the first send', () => {
    expect(isCampaignReply(new Date(T0.getTime()), T0)).toBe(true);
  });

  it('accepts inbound after the first send', () => {
    expect(isCampaignReply(T1, T0)).toBe(true);
  });

  it('rejects everything when nothing was ever sent', () => {
    expect(isCampaignReply(T1, null)).toBe(false);
    expect(isCampaignReply(T1, undefined)).toBe(false);
  });
});

describe('firstSentAtByLead', () => {
  it('keeps the earliest sentAt per lead', () => {
    const map = firstSentAtByLead([
      job({ leadId: 'a', sentAt: T1 }),
      job({ leadId: 'a', sentAt: T0 }),
      job({ leadId: 'a', sentAt: T2 }),
      job({ leadId: 'b', sentAt: T2 }),
    ]);
    expect(map.get('a')).toEqual(T0);
    expect(map.get('b')).toEqual(T2);
  });

  it('ignores unsent jobs, null sentAt, and null leadId', () => {
    const map = firstSentAtByLead([
      job({ leadId: 'a', status: 'scheduled', sentAt: null }),
      job({ leadId: 'a', status: 'canceled', sentAt: null }),
      // Defensive: a sent job with no sentAt must not produce an entry.
      job({ leadId: 'a', status: 'sent', sentAt: null }),
      { leadId: null, status: 'sent', sentAt: T0 },
    ]);
    expect(map.size).toBe(0);
  });
});

describe('deriveCampaignState', () => {
  it('REGRESSION: old inbound + zero jobs is none, not replied', () => {
    // Before the campaign-scoping fix, any inbound ever made a prospect
    // REPLIED — even one never enrolled (a local business that emailed
    // info@ years ago). That painted the workbench with false replies.
    expect(
      deriveCampaignState({ jobStatuses: [], latestInboundAt: T0, firstSentAt: undefined }),
    ).toBe('none');
  });

  it('pre-send inbound with a sent job stays sent, not replied', () => {
    expect(
      deriveCampaignState({
        jobStatuses: ['sent', 'scheduled'],
        latestInboundAt: new Date(T0.getTime() - 1000),
        firstSentAt: T0,
      }),
    ).toBe('sent');
  });

  it('post-send inbound is replied', () => {
    expect(
      deriveCampaignState({ jobStatuses: ['sent'], latestInboundAt: T1, firstSentAt: T0 }),
    ).toBe('replied');
  });

  it('canceled-only jobs mean enrolled', () => {
    expect(
      deriveCampaignState({ jobStatuses: ['canceled'], latestInboundAt: null, firstSentAt: undefined }),
    ).toBe('enrolled');
  });

  it('no jobs and no inbound is none', () => {
    expect(
      deriveCampaignState({ jobStatuses: [], latestInboundAt: null, firstSentAt: undefined }),
    ).toBe('none');
  });

  it('enrolled inbound-before-send prospect stays enrolled', () => {
    expect(
      deriveCampaignState({ jobStatuses: ['scheduled'], latestInboundAt: T0, firstSentAt: undefined }),
    ).toBe('enrolled');
  });
});

describe('buildCampaignTouches', () => {
  const logs = new Map<string, CampaignTouchEmail>([
    ['log-1', { status: 'OPENED', openedAt: T1, bouncedAt: null, errorMessage: null }],
  ]);

  it('always returns exactly 3 rows, filling missing steps as pending', () => {
    const touches = buildCampaignTouches(
      [touchJob({ step: 1, status: 'sent', sentAt: T0, emailLogId: 'log-1' })],
      logs,
    );
    expect(touches).toHaveLength(3);
    expect(touches.map((t) => t.step)).toEqual([1, 2, 3]);
    expect(touches[1].status).toBe('pending');
    expect(touches[2].status).toBe('pending');
    expect(touches[1].scheduledFor).toBeNull();
    expect(touches[1].email).toBeNull();
  });

  it('returns 3 pending rows for no jobs at all', () => {
    const touches = buildCampaignTouches([], new Map());
    expect(touches).toHaveLength(3);
    expect(touches.every((t) => t.status === 'pending')).toBe(true);
  });

  it('joins the EmailLog slice onto its touch', () => {
    const touches = buildCampaignTouches(
      [touchJob({ step: 1, status: 'sent', sentAt: T0, emailLogId: 'log-1' })],
      logs,
    );
    expect(touches[0].email).toEqual({
      status: 'OPENED',
      openedAt: T1,
      bouncedAt: null,
      errorMessage: null,
    });
  });

  it('gives email: null for a job whose log is missing from the map', () => {
    const touches = buildCampaignTouches(
      [touchJob({ step: 1, status: 'sent', sentAt: T0, emailLogId: 'log-gone' })],
      logs,
    );
    expect(touches[0].email).toBeNull();
  });

  it('carries job fields through (cancelReason, lastError, scheduledFor)', () => {
    const touches = buildCampaignTouches(
      [
        touchJob({ step: 1, status: 'sent', sentAt: T0, emailLogId: 'log-1' }),
        touchJob({
          step: 2,
          status: 'canceled',
          scheduledFor: T1,
          cancelReason: 'replied',
        }),
        touchJob({ step: 3, status: 'failed', scheduledFor: T2, lastError: 'boom' }),
      ],
      logs,
    );
    expect(touches[1].status).toBe('canceled');
    expect(touches[1].cancelReason).toBe('replied');
    expect(touches[1].scheduledFor).toEqual(T1);
    expect(touches[2].lastError).toBe('boom');
  });
});

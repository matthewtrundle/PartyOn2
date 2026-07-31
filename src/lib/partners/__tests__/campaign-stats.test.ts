import { describe, expect, it } from 'vitest';
import {
  attributeRepliesToTouches,
  buildProblemRows,
  buildQueueRows,
  campaignSampleNote,
  computeCampaignFunnel,
  computeCampaignOverview,
  computeTouchStats,
  prospectKey,
  rateLabel,
  type CampaignInboundRow,
  type CampaignProspectInfo,
  type CampaignStatsJob,
  type CampaignStatsLog,
} from '../campaign-stats';

const DAY0 = new Date('2026-07-01T12:00:00Z');
const DAY5 = new Date('2026-07-06T12:00:00Z');
const DAY12 = new Date('2026-07-13T12:00:00Z');

function makeJob(overrides: Partial<CampaignStatsJob> = {}): CampaignStatsJob {
  return {
    leadId: 'lead-1',
    email: 'owner@example.com',
    step: 1,
    status: 'sent',
    scheduledFor: DAY0,
    sentAt: DAY0,
    canceledAt: null,
    cancelReason: null,
    lastError: null,
    emailLogId: null,
    updatedAt: DAY0,
    ...overrides,
  };
}

function logsMap(logs: CampaignStatsLog[]): Map<string, CampaignStatsLog> {
  return new Map(logs.map((l) => [l.id, l]));
}

const OPENED_LOG: CampaignStatsLog = {
  id: 'log-1',
  openedAt: DAY5,
  bouncedAt: null,
  errorMessage: null,
};

describe('prospectKey', () => {
  it('prefers leadId and falls back to email', () => {
    expect(prospectKey(makeJob())).toBe('lead-1');
    expect(prospectKey(makeJob({ leadId: null }))).toBe('owner@example.com');
  });
});

describe('computeCampaignFunnel', () => {
  it('counts distinct prospects, not jobs', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 1 }),
      makeJob({ leadId: 'a', step: 2, sentAt: DAY5 }),
      makeJob({ leadId: 'b', step: 1 }),
    ];
    const funnel = computeCampaignFunnel(jobs, logsMap([]), []);
    expect(funnel.enrolled).toBe(2);
    expect(funnel.sent).toBe(2);
  });

  it('enrolled includes canceled-only prospects', () => {
    const jobs = [
      makeJob({ leadId: 'a', status: 'canceled', sentAt: null, cancelReason: 'draft-not-approved' }),
    ];
    const funnel = computeCampaignFunnel(jobs, logsMap([]), []);
    expect(funnel).toEqual({ enrolled: 1, sent: 0, opened: 0, replied: 0 });
  });

  it('opened requires a linked log with openedAt on a sent job', () => {
    const jobs = [
      makeJob({ leadId: 'a', emailLogId: 'log-1' }),
      makeJob({ leadId: 'b', emailLogId: 'log-2' }),
      makeJob({ leadId: 'c' }),
    ];
    const funnel = computeCampaignFunnel(
      jobs,
      logsMap([OPENED_LOG, { id: 'log-2', openedAt: null, bouncedAt: null, errorMessage: null }]),
      [],
    );
    expect(funnel.opened).toBe(1);
  });

  it('replied requires inbound at-or-after the first send (shared rule) and is a subset of sent', () => {
    const jobs = [
      makeJob({ leadId: 'a' }), // sent DAY0
      makeJob({ leadId: 'b', status: 'scheduled', sentAt: null }), // never sent
    ];
    const inbound: CampaignInboundRow[] = [
      { leadId: 'a', receivedAt: new Date(DAY0.getTime() - 1000) }, // pre-send: no
      { leadId: 'a', receivedAt: DAY5 }, // post-send: yes
      { leadId: 'b', receivedAt: DAY5 }, // never sent: no
      { leadId: null, receivedAt: DAY5 }, // unlinked inbound: no
    ];
    const funnel = computeCampaignFunnel(jobs, logsMap([]), inbound);
    expect(funnel.replied).toBe(1);
    expect(funnel.replied).toBeLessThanOrEqual(funnel.sent);
  });

  it('boundary: inbound exactly at the first send counts (mirrors isCampaignReply)', () => {
    const funnel = computeCampaignFunnel(
      [makeJob({ leadId: 'a' })],
      logsMap([]),
      [{ leadId: 'a', receivedAt: DAY0 }],
    );
    expect(funnel.replied).toBe(1);
  });
});

describe('attributeRepliesToTouches', () => {
  it('attributes the first qualifying reply to the last touch sent before it', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 1, sentAt: DAY0 }),
      makeJob({ leadId: 'a', step: 2, sentAt: DAY5 }),
    ];
    // Reply lands between touch 2 and touch 3 → touch 2 gets the credit.
    const replies = attributeRepliesToTouches(jobs, [
      { leadId: 'a', receivedAt: new Date(DAY5.getTime() + 3_600_000) },
    ]);
    expect(replies.get(2)).toBe(1);
    expect(replies.get(1)).toBeUndefined();
  });

  it('a reply between touch 1 and touch 2 credits touch 1', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 1, sentAt: DAY0 }),
      makeJob({ leadId: 'a', step: 2, sentAt: DAY5 }),
    ];
    const replies = attributeRepliesToTouches(jobs, [
      { leadId: 'a', receivedAt: new Date(DAY0.getTime() + 3_600_000) },
    ]);
    expect(replies.get(1)).toBe(1);
    expect(replies.get(2)).toBeUndefined();
  });

  it('only the FIRST qualifying reply per prospect is attributed', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 1, sentAt: DAY0 }),
      makeJob({ leadId: 'a', step: 2, sentAt: DAY5 }),
    ];
    const replies = attributeRepliesToTouches(jobs, [
      { leadId: 'a', receivedAt: new Date(DAY0.getTime() + 1000) },
      { leadId: 'a', receivedAt: DAY12 },
    ]);
    expect(replies.get(1)).toBe(1);
    expect(replies.get(2)).toBeUndefined();
  });
});

describe('computeTouchStats', () => {
  it('always returns 3 zero-filled rows', () => {
    const stats = computeTouchStats([], logsMap([]), new Map());
    expect(stats).toHaveLength(3);
    expect(stats.map((s) => s.step)).toEqual([1, 2, 3]);
    expect(stats[2]).toEqual({
      step: 3,
      sent: 0,
      opened: 0,
      replies: 0,
      endedGood: 0,
      canceledOther: 0,
      failed: 0,
      suppressed: 0,
      scheduled: 0,
    });
  });

  it('classifies cancels into ended-good vs canceled-other', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 2, status: 'canceled', sentAt: null, cancelReason: 'replied' }),
      makeJob({ leadId: 'b', step: 2, status: 'canceled', sentAt: null, cancelReason: 'lead-won' }),
      makeJob({
        leadId: 'c',
        step: 2,
        status: 'canceled',
        sentAt: null,
        cancelReason: 'draft-not-approved',
      }),
      makeJob({ leadId: 'd', step: 2, status: 'canceled', sentAt: null, cancelReason: null }),
    ];
    const stats = computeTouchStats(jobs, logsMap([]), new Map());
    expect(stats[1].endedGood).toBe(2);
    expect(stats[1].canceledOther).toBe(2);
  });

  it('counts processing as scheduled and joins opens/replies', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 1, emailLogId: 'log-1' }),
      makeJob({ leadId: 'b', step: 1, status: 'processing', sentAt: null }),
      makeJob({ leadId: 'c', step: 1, status: 'scheduled', sentAt: null }),
      makeJob({ leadId: 'd', step: 1, status: 'failed', sentAt: null, lastError: 'smtp timeout' }),
      makeJob({ leadId: 'e', step: 1, status: 'suppressed', sentAt: null }),
    ];
    const stats = computeTouchStats(jobs, logsMap([OPENED_LOG]), new Map([[1, 1]]));
    expect(stats[0]).toEqual({
      step: 1,
      sent: 1,
      opened: 1,
      replies: 1,
      endedGood: 0,
      canceledOther: 0,
      failed: 1,
      suppressed: 1,
      scheduled: 2,
    });
  });
});

describe('buildProblemRows', () => {
  const prospects = new Map<string, CampaignProspectInfo>([
    ['lead-1', { id: 'p1', name: 'Zilker Stays', vertical: 'str', websiteKey: 'zilkerstays.com' }],
  ]);

  it('bounced rows use the log errorMessage with a fallback', () => {
    const jobs = [
      makeJob({ emailLogId: 'log-b' }),
      makeJob({ leadId: 'lead-2', email: 'x@y.com', emailLogId: 'log-c' }),
    ];
    const logs = logsMap([
      { id: 'log-b', openedAt: null, bouncedAt: DAY5, errorMessage: 'Permanent/General: no mailbox' },
      { id: 'log-c', openedAt: null, bouncedAt: DAY12, errorMessage: null },
    ]);
    const rows = buildProblemRows(jobs, logs, new Map(), prospects);
    expect(rows).toHaveLength(2);
    // at-desc sort: DAY12 bounce first.
    expect(rows[0].reason).toBe('bounced');
    expect(rows[1].reason).toBe('Permanent/General: no mailbox');
    expect(rows[1].prospect?.name).toBe('Zilker Stays');
    expect(rows[0].prospect).toBeNull(); // unmatched lead → null prospect fields
  });

  it('failed rows use lastError@updatedAt; suppressed prefer the suppression reason', () => {
    const jobs = [
      makeJob({ status: 'failed', sentAt: null, lastError: 'smtp timeout', updatedAt: DAY5 }),
      makeJob({
        leadId: 'lead-2',
        email: 'sup@y.com',
        status: 'suppressed',
        sentAt: null,
        cancelReason: 'suppressed-bounce',
        canceledAt: DAY12,
      }),
      makeJob({
        leadId: 'lead-3',
        email: 'sup2@y.com',
        status: 'suppressed',
        sentAt: null,
        cancelReason: 'suppressed-manual',
        canceledAt: null,
        updatedAt: DAY0,
      }),
    ];
    const rows = buildProblemRows(jobs, logsMap([]), new Map([['sup@y.com', 'bounce']]), prospects);
    expect(rows.map((r) => r.kind)).toEqual(['suppressed', 'failed', 'suppressed']);
    expect(rows[0].reason).toBe('bounce'); // suppression-table reason wins
    expect(rows[0].at).toEqual(DAY12);
    expect(rows[1].reason).toBe('smtp timeout');
    expect(rows[1].at).toEqual(DAY5);
    expect(rows[2].reason).toBe('suppressed-manual'); // cancelReason fallback
    expect(rows[2].at).toEqual(DAY0); // canceledAt null → updatedAt
  });

  it('success cancels and clean sends never become problem rows', () => {
    const jobs = [
      makeJob({ status: 'canceled', sentAt: null, cancelReason: 'replied' }),
      makeJob({ status: 'canceled', sentAt: null, cancelReason: 'lead-won' }),
      makeJob({ status: 'canceled', sentAt: null, cancelReason: 'already-active-partner' }),
      makeJob({ emailLogId: 'log-1' }), // sent + opened, no bounce
    ];
    expect(buildProblemRows(jobs, logsMap([OPENED_LOG]), new Map(), prospects)).toEqual([]);
  });
});

describe('buildQueueRows', () => {
  it('keeps only scheduled/processing, sorted soonest first', () => {
    const jobs = [
      makeJob({ leadId: 'a', step: 2, status: 'scheduled', sentAt: null, scheduledFor: DAY12 }),
      makeJob({ leadId: 'b', step: 1, status: 'processing', sentAt: null, scheduledFor: DAY0 }),
      makeJob({ leadId: 'c', step: 1, status: 'sent' }),
      makeJob({ leadId: 'd', step: 1, status: 'canceled', sentAt: null, cancelReason: 'replied' }),
    ];
    const rows = buildQueueRows(jobs, new Map());
    expect(rows.map((r) => r.status)).toEqual(['processing', 'scheduled']);
    expect(rows[0].scheduledFor).toEqual(DAY0);
  });
});

describe('rateLabel', () => {
  it('renders count/denom · % and survives zero denominators', () => {
    expect(rateLabel(4, 9)).toBe('4/9 · 44%');
    expect(rateLabel(0, 0)).toBe('0/0 · —');
    expect(rateLabel(0, 0)).not.toContain('NaN');
  });
});

describe('campaignSampleNote', () => {
  it('zero sends → no-sends note, small n → directional, ≥30 → clean', () => {
    expect(campaignSampleNote(0).smallSample).toBe(true);
    expect(campaignSampleNote(0).note).toContain('No sends yet');
    expect(campaignSampleNote(12)).toEqual({
      smallSample: true,
      note: 'Directional — n=12 prospects sent; rates are counts, not conclusions.',
    });
    expect(campaignSampleNote(30)).toEqual({ smallSample: false, note: null });
  });
});

describe('computeCampaignOverview', () => {
  it('stitches the full shape', () => {
    const overview = computeCampaignOverview({
      jobs: [
        makeJob({ leadId: 'lead-1', step: 1, emailLogId: 'log-1' }),
        makeJob({ leadId: 'lead-1', step: 2, status: 'scheduled', sentAt: null, scheduledFor: DAY5 }),
      ],
      logs: [OPENED_LOG],
      inbound: [{ leadId: 'lead-1', receivedAt: DAY5 }],
      suppressionsByEmail: new Map(),
      prospectsByLeadId: new Map([
        ['lead-1', { id: 'p1', name: 'Zilker Stays', vertical: 'str', websiteKey: 'zilkerstays.com' }],
      ]),
      capToday: { used: 3, cap: 10 },
      flagOn: false,
    });
    expect(overview.funnel).toEqual({ enrolled: 1, sent: 1, opened: 1, replied: 1 });
    expect(overview.touches[0].replies).toBe(1);
    expect(overview.queue).toHaveLength(1);
    expect(overview.queue[0].prospect?.websiteKey).toBe('zilkerstays.com');
    expect(overview.problems).toEqual([]);
    expect(overview.capToday).toEqual({ used: 3, cap: 10 });
    expect(overview.flagOn).toBe(false);
    expect(overview.smallSample).toBe(true);
  });
});

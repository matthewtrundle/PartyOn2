/**
 * Sources rollup — turning lead ROWS into PEOPLE.
 *
 * The collapse rules mirror scripts/ops/reconcile-fragment-leads.mjs. If these
 * drift, the panel and the repair script disagree about who exists.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSourcesReport,
  collapseToPeople,
  pickKeeper,
  type BuyerRow,
  type SourceReportLead,
} from '../sources-report';

let seq = 0;
function lead(over: Partial<SourceReportLead> = {}): SourceReportLead {
  seq += 1;
  return {
    id: `lead-${seq}`,
    email: `guest${seq}@example.com`,
    phone: null,
    firstName: 'Guest',
    lastName: null,
    status: 'SUBMITTED',
    sourceWidget: 'CONTACT_FORM',
    utmMedium: null,
    metadata: null,
    affiliateId: null,
    pipelineStage: 'NEW',
    createdAt: new Date('2026-07-01T00:00:00Z'),
    ...over,
  };
}

describe('collapseToPeople — typing fragments', () => {
  it('merges a half-typed address into the finished one', () => {
    const partial = lead({ email: 'jo@gmail.co', status: 'PARTIAL' });
    const complete = lead({ email: 'jo@gmail.com', status: 'SUBMITTED' });
    const { people } = collapseToPeople([partial, complete]);
    expect(people).toHaveLength(1);
    expect(people[0].keeper.email).toBe('jo@gmail.com');
    expect(people[0].rows).toHaveLength(2);
  });

  it('collapses a whole truncation chain to one person', () => {
    const rows = ['dakota@gmail.c', 'dakota@gmail.co', 'dakota@gmail.com'].map((email) =>
      lead({ email, status: 'PARTIAL' }),
    );
    const { people } = collapseToPeople(rows);
    expect(people).toHaveLength(1);
    expect(people[0].keeper.email).toBe('dakota@gmail.com');
  });

  it('does NOT merge mid-word typing chains — a known limit, not a bug', () => {
    // Autofill can produce a complete-looking address at each keystroke
    // ('an@gmail.com' → 'anz@gmail.com' → …). Those diverge mid-string, so
    // full-email prefix matching cannot see them. We keep this rule anyway
    // because it is exactly what reconcile-fragment-leads.mjs uses, and a
    // panel that disagreed with the repair script about who exists would be
    // worse than one that slightly over-counts. Residual inflation is
    // reported to the operator rather than silently corrected.
    const rows = ['an@gmail.com', 'anz@gmail.com', 'anzola@gmail.com'].map((email) =>
      lead({ email, status: 'PARTIAL' }),
    );
    expect(collapseToPeople(rows).people).toHaveLength(3);
  });

  it('does NOT merge on a prefix shorter than the safety floor', () => {
    // 'a@b.co' is 6 chars, but 'jo@x.io' is only 7 and must not absorb
    // an unrelated longer address that merely starts the same way.
    const short = lead({ email: 'ab@x.io' });
    const long = lead({ email: 'abigail@x.io' });
    const { people } = collapseToPeople([short, long]);
    expect(people).toHaveLength(2);
  });

  it('treats two complete unrelated addresses as two people', () => {
    const { people } = collapseToPeople([
      lead({ email: 'sam@example.com' }),
      lead({ email: 'alex@example.com' }),
    ]);
    expect(people).toHaveLength(2);
  });

  it('merges case and whitespace variants of one address', () => {
    const { people } = collapseToPeople([
      lead({ email: '  Sam@Example.com ' }),
      lead({ email: 'sam@example.com' }),
    ]);
    expect(people).toHaveLength(1);
  });

  it('falls back to the phone when the email is unusable', () => {
    const { people, unreachable } = collapseToPeople([
      lead({ email: 'not-an-email', phone: '512-555-0134' }),
      lead({ email: null, phone: '(512) 555 0134' }),
    ]);
    expect(people).toHaveLength(1);
    expect(unreachable).toHaveLength(0);
  });

  it('counts rows with neither email nor phone as unreachable, not people', () => {
    const { people, unreachable } = collapseToPeople([
      lead({ email: null, phone: null, firstName: 'Anz' }),
      lead({ email: null, phone: null, firstName: 'Anzola' }),
    ]);
    expect(people).toHaveLength(0);
    expect(unreachable).toHaveLength(2);
  });
});

describe('pickKeeper', () => {
  it('prefers a real submission over a half-typed one', () => {
    const partial = lead({ email: 'zzzzzzzzzzzz@example.com', status: 'PARTIAL' });
    const submitted = lead({ email: 'jo@example.com', status: 'SUBMITTED' });
    expect(pickKeeper([partial, submitted]).status).toBe('SUBMITTED');
  });

  it('prefers the fuller address, then the fuller contact record', () => {
    const short = lead({ email: 'jo@x.com', status: 'PARTIAL' });
    const long = lead({ email: 'jonathan@x.com', status: 'PARTIAL' });
    expect(pickKeeper([short, long]).email).toBe('jonathan@x.com');

    const sparse = lead({ email: 'a@x.com', status: 'PARTIAL', firstName: null });
    const full = lead({ email: 'b@x.com', status: 'PARTIAL', phone: '5125550134' });
    expect(pickKeeper([sparse, full]).phone).toBe('5125550134');
  });
});

describe('buildSourcesReport', () => {
  const noBuyers: BuyerRow[] = [];

  it('excludes our own outbound prospecting from every rate', () => {
    const report = buildSourcesReport(
      [
        lead({ sourceWidget: 'PARTNER_OUTREACH', email: 'prospect@hotel.com' }),
        lead({ email: 'customer@example.com' }),
      ],
      noBuyers,
      null,
    );
    expect(report.totals.people).toBe(1);
    expect(report.totals.outboundRows).toBe(1);
    expect(report.forms.every((f) => f.key !== 'outbound-prospect')).toBe(true);
  });

  it('counts an order only when it came after the lead was captured', () => {
    const captured = new Date('2026-07-10T00:00:00Z');
    const rows = [lead({ email: 'buyer@example.com', createdAt: captured })];

    const after = buildSourcesReport(rows, [
      { email: 'buyer@example.com', firstPaidAt: new Date('2026-07-20T00:00:00Z') },
    ], null);
    expect(after.channels[0].ordered).toBe(1);

    const before = buildSourcesReport(rows, [
      { email: 'buyer@example.com', firstPaidAt: new Date('2026-06-01T00:00:00Z') },
    ], null);
    expect(before.channels[0].ordered).toBe(0);
  });

  it('matches buyers case-insensitively', () => {
    const report = buildSourcesReport(
      [lead({ email: 'Buyer@Example.com', createdAt: new Date('2026-07-01T00:00:00Z') })],
      [{ email: 'buyer@example.com', firstPaidAt: new Date('2026-07-05T00:00:00Z') }],
      null,
    );
    expect(report.channels[0].ordered).toBe(1);
  });

  it('assigns each person to exactly one channel', () => {
    const report = buildSourcesReport(
      [
        lead({ email: 'a@x.com', metadata: { attribution: { gclid: 'g' } } }),
        lead({ email: 'b@x.com', metadata: { groupDashboard: { source: 'WEBHOOK' } } }),
        lead({ email: 'c@x.com' }),
      ],
      noBuyers,
      null,
    );
    const summed = report.channels.reduce((n, c) => n + c.people, 0);
    expect(summed).toBe(report.totals.people);
    expect(summed).toBe(3);
  });

  it('reads provenance from the richest row, not just the keeper', () => {
    // The fragment is saved BEFORE the form is submitted, so the keeper can
    // be the row carrying the least metadata.
    const fragment = lead({ email: 'jo@gmail.co', status: 'PARTIAL', metadata: null });
    const submitted = lead({
      email: 'jo@gmail.com',
      status: 'SUBMITTED',
      metadata: { eventQuiz: { partyType: 'wedding' } },
    });
    const report = buildSourcesReport([fragment, submitted], noBuyers, null);
    expect(report.forms).toHaveLength(1);
    expect(report.forms[0].key).toBe('event-quiz');
  });

  it('buckets people with no recorded form under (unattributed)', () => {
    const report = buildSourcesReport(
      [lead({ sourceWidget: 'OTHER', metadata: null })],
      noBuyers,
      null,
    );
    expect(report.forms[0].key).toBe('(unattributed)');
    expect(report.forms[0].people).toBe(1);
  });

  it('reports totals that reconcile against the raw row count', () => {
    const rows = [
      lead({ email: 'jo@gmail.co', status: 'PARTIAL' }),
      lead({ email: 'jo@gmail.com' }),
      lead({ email: null, phone: null }),
      lead({ sourceWidget: 'PARTNER_OUTREACH' }),
    ];
    const report = buildSourcesReport(rows, noBuyers, null);
    expect(report.totals.leadRows).toBe(4);
    expect(report.totals.people).toBe(1);
    expect(report.totals.fragmentsCollapsed).toBe(1);
    expect(report.totals.unreachableRows).toBe(1);
    expect(report.totals.outboundRows).toBe(1);
  });

  it('groups people by capture month', () => {
    const report = buildSourcesReport(
      [
        lead({ email: 'a@x.com', createdAt: new Date('2026-06-15T00:00:00Z') }),
        lead({ email: 'b@x.com', createdAt: new Date('2026-07-02T00:00:00Z') }),
        lead({ email: 'c@x.com', createdAt: new Date('2026-07-20T00:00:00Z') }),
      ],
      noBuyers,
      null,
    );
    expect(report.monthly).toEqual([
      { month: '2026-06', people: 1, ordered: 0 },
      { month: '2026-07', people: 2, ordered: 0 },
    ]);
  });

  it('counts won and lost from any row in the person', () => {
    const report = buildSourcesReport(
      [
        lead({ email: 'w@x.com', pipelineStage: 'WON' }),
        lead({ email: 'l@x.com', pipelineStage: 'LOST' }),
        lead({ email: 'o@x.com', pipelineStage: 'NEW' }),
      ],
      noBuyers,
      null,
    );
    const totals = report.forms.reduce(
      (acc, f) => ({ won: acc.won + f.won, lost: acc.lost + f.lost, open: acc.open + f.open }),
      { won: 0, lost: 0, open: 0 },
    );
    expect(totals).toEqual({ won: 1, lost: 1, open: 1 });
  });
});

describe('collapseToPeople — pathological input', () => {
  it('treats an over-length address as unreachable, not as a person', () => {
    // Not every capture route caps the email field, and collapse compares
    // every pair of addresses, so an unbounded string is quadratic cost. The
    // clamp is at the RFC ceiling (254), past which an address cannot be
    // delivered to anyway — so such a row is honestly unreachable rather than
    // a person we could contact.
    const huge = `${'a'.repeat(5000)}@example.com`;
    const { people, unreachable } = collapseToPeople([lead({ email: huge })]);
    expect(people).toHaveLength(0);
    expect(unreachable).toHaveLength(1);
  });

  it('still accepts a long but legal address', () => {
    const legal = `${'a'.repeat(200)}@example.com`;
    expect(collapseToPeople([lead({ email: legal })]).people).toHaveLength(1);
  });

  it('stays linear-ish on many unrelated addresses', () => {
    const rows = Array.from({ length: 400 }, (_, i) =>
      lead({ email: `person${i}@example.com` }),
    );
    const started = process.hrtime.bigint();
    const { people } = collapseToPeople(rows);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    expect(people).toHaveLength(400);
    expect(ms).toBeLessThan(2000);
  });
});

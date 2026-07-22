/**
 * import-runners: unknown ids reject the whole batch, APPROVED drafts are
 * never overwritten, suppressed emails are never written, contact fields
 * fill only when null, and dry-run writes nothing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, update, suppressedSet } = vi.hoisted(() => {
  const state = {
    rows: [] as Array<Record<string, unknown>>,
  };
  const updateFn = vi.fn(async () => ({}));
  const suppressed = new Set<string>();
  return {
    db: state,
    update: updateFn,
    suppressedSet: suppressed,
  };
});

vi.mock('@/lib/database/client', () => ({
  prisma: {
    partnerProspect: {
      findMany: vi.fn(async () => db.rows),
      update,
    },
  },
}));

vi.mock('@/lib/followups/suppression', () => ({
  isSuppressed: vi.fn(async (email: string) => suppressedSet.has(email)),
}));

import { runDraftImport, runEnrichmentImport } from '../import-runners';
import type { Draft, Enrichment } from '../schemas';

function enrichment(overrides: Partial<Enrichment['contact']> = {}): Enrichment {
  return {
    management: {
      ownerName: 'Lynn',
      ownerNotes: null,
      team: null,
      linkedin: null,
      operatingSince: null,
      entity: null,
    },
    portfolio: {
      propertyCount: '~35',
      propertyTypes: 'homes',
      locations: 'Austin',
      maxGroupSize: null,
      notableProperties: [],
    },
    business: {
      bookingModel: 'direct',
      services: 'STR management',
      positioning: 'luxury',
      guestDemographic: 'groups',
    },
    reputation: { summary: 'good', ratings: null, praiseThemes: null },
    partnershipAngles: ['angle'],
    contact: {
      email: 'owner@x.com',
      contactName: 'Lynn',
      phone: '512-555-0100',
      sourceUrl: 'https://x.com/about',
      ...overrides,
    },
    hooks: [{ text: 'a concrete fact about them', sourceUrl: 'https://x.com', kind: 'website' }],
    sources: ['https://x.com'],
    siteAccess: 'ok',
  };
}

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

function draft(id: string): Draft {
  return {
    id,
    subject: 'guest perk',
    altSubject: 'stocked fridges',
    body: `Hi — ${words(70)}. Want me to send it over?`,
    followUpBody: `${words(40)}.`,
    touch3Body: `${words(40)}.`,
    hook: { text: 'a concrete fact', sourceUrl: 'https://x.com', kind: 'website' },
  };
}

beforeEach(() => {
  db.rows = [];
  update.mockClear();
  suppressedSet.clear();
});

describe('runEnrichmentImport', () => {
  it('rejects the whole batch on unknown ids', async () => {
    db.rows = [{ id: 'p1', name: 'A', email: null, contactName: null, phone: null }];
    await expect(
      runEnrichmentImport(
        [
          { id: 'p1', enrichment: enrichment() },
          { id: 'ghost', enrichment: enrichment() },
        ],
        { apply: true }
      )
    ).rejects.toThrow(/unknown prospect ids: ghost/);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects duplicate ids', async () => {
    db.rows = [{ id: 'p1', name: 'A', email: null, contactName: null, phone: null }];
    await expect(
      runEnrichmentImport(
        [
          { id: 'p1', enrichment: enrichment() },
          { id: 'p1', enrichment: enrichment() },
        ],
        { apply: true }
      )
    ).rejects.toThrow(/duplicate/);
  });

  it('never writes a suppressed email; fills unsuppressed ones only when null', async () => {
    db.rows = [
      { id: 'p1', name: 'A', email: null, contactName: null, phone: null },
      { id: 'p2', name: 'B', email: null, contactName: null, phone: null },
      { id: 'p3', name: 'C', email: 'kept@x.com', contactName: 'Kept', phone: '1' },
    ];
    suppressedSet.add('bad@x.com');
    const result = await runEnrichmentImport(
      [
        { id: 'p1', enrichment: enrichment({ email: 'bad@x.com' }) },
        { id: 'p2', enrichment: enrichment({ email: 'good@x.com' }) },
        { id: 'p3', enrichment: enrichment({ email: 'other@x.com', contactName: 'New' }) },
      ],
      { apply: true }
    );
    expect(result.emailsSkippedSuppressed).toBe(1);
    expect(result.emailsFilled).toBe(1);

    const dataFor = (id: string) =>
      (update.mock.calls as unknown as Array<[{ where: { id: string }; data: Record<string, unknown> }]>).find(
        (c) => c[0].where.id === id
      )![0].data;
    expect(dataFor('p1')).not.toHaveProperty('email');
    expect(dataFor('p2')).toMatchObject({ email: 'good@x.com' });
    // existing email + contactName are never clobbered
    expect(dataFor('p3')).not.toHaveProperty('email');
    expect(dataFor('p3')).not.toHaveProperty('contactName');
  });

  it('dry-run writes nothing', async () => {
    db.rows = [{ id: 'p1', name: 'A', email: null, contactName: null, phone: null }];
    const result = await runEnrichmentImport([{ id: 'p1', enrichment: enrichment() }], {
      apply: false,
    });
    expect(result.imported).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('runDraftImport', () => {
  it('never overwrites APPROVED drafts', async () => {
    db.rows = [
      { id: 'p1', name: 'A', draftStatus: 'APPROVED' },
      { id: 'p2', name: 'B', draftStatus: 'NONE' },
    ];
    const result = await runDraftImport([draft('p1'), draft('p2')], { apply: true });
    expect(result.skippedApproved).toBe(1);
    expect(result.imported).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(
      (update.mock.calls as unknown as Array<[{ where: { id: string } }]>)[0][0].where.id
    ).toBe('p2');
  });

  it('imports as DRAFTED and clears redo guidance', async () => {
    db.rows = [{ id: 'p1', name: 'A', draftStatus: 'NONE' }];
    await runDraftImport([draft('p1')], { apply: true });
    const data = (update.mock.calls as unknown as Array<[{ data: Record<string, unknown> }]>)[0][0]
      .data;
    expect(data.draftStatus).toBe('DRAFTED');
    expect(data.draftRedoGuidance).toBeNull();
    expect(data.draftModel).toBe('claude-code-session');
  });

  it('rejects unknown ids batch-wide; strict mode rejects lint errors', async () => {
    db.rows = [{ id: 'p1', name: 'A', draftStatus: 'NONE' }];
    await expect(runDraftImport([draft('ghost')], { apply: true })).rejects.toThrow(/unknown/);

    const bad = { ...draft('p1'), body: `Hi — too short. Want it?` };
    const result = await runDraftImport([bad], { apply: true, strict: true });
    expect(result.strictRejected).toBe(1);
    expect(update).not.toHaveBeenCalled();
  });
});

/**
 * prospect-store: sendable-draft gating (DRAFTED|APPROVED only, subject+body
 * required), websiteKey lookup normalization, and legacy-view enrichment
 * reassembly (outreachEmail rebuilt from draft columns).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PartnerProspect } from '@prisma/client';

// vi.mock is hoisted above imports — shared state must be hoisted with it.
// vi.fn records call args regardless of the implementation's arity.
const { mockRows, findUnique } = vi.hoisted(() => {
  const rows: { unique: Record<string, unknown> | null } = { unique: null };
  return { mockRows: rows, findUnique: vi.fn(async () => rows.unique) };
});

vi.mock('@/lib/database/client', () => ({
  prisma: {
    partnerProspect: {
      findUnique,
      findMany: vi.fn(async () => []),
    },
  },
}));

import { getProspectByWebsite, getSendableDraft, websiteKey } from '../prospect-store';

function draftRow(overrides: Partial<PartnerProspect> = {}): Partial<PartnerProspect> {
  return {
    draftStatus: 'DRAFTED',
    draftSubject: 'subj',
    draftAltSubject: 'alt subj',
    draftBody: 'body text',
    draftFollowUpBody: 'bump',
    draftTouch3Body: 'close',
    ...overrides,
  };
}

function fullRow(overrides: Partial<PartnerProspect> = {}): Partial<PartnerProspect> {
  return {
    id: 'p-1',
    vertical: 'str',
    city: 'Austin',
    name: "Lynn's Lodging",
    website: 'https://www.lynnslodgingatx.com/',
    websiteKey: 'lynnslodgingatx.com',
    propertiesEstimate: null,
    contactName: 'Lynn',
    email: 'hello@lynnslodging.com',
    phone: null,
    socials: {},
    logoUrl: null,
    description: 'desc',
    partnerSlug: 'lynns-lodging',
    leadId: null,
    source: 'seed-str',
    researchStatus: 'ENRICHED',
    enrichment: { management: { ownerName: 'Lynn' } },
    draftStatus: 'DRAFTED',
    draftSubject: 'subj',
    draftBody: 'body text',
    emailVerifyStatus: 'UNVERIFIED',
    emailVerifyOverride: false,
    ...overrides,
  };
}

describe('websiteKey', () => {
  it('normalizes host + path, drops www and trailing slash', () => {
    expect(websiteKey('https://www.lynnslodgingatx.com/')).toBe('lynnslodgingatx.com');
    expect(websiteKey('https://Example.com/Path/')).toBe('example.com/path');
    expect(websiteKey('not a url')).toBe('not a url');
  });
});

describe('getSendableDraft', () => {
  beforeEach(() => {
    mockRows.unique = null;
    findUnique.mockClear();
  });

  it('returns the full draft for DRAFTED and APPROVED rows', async () => {
    mockRows.unique = draftRow();
    expect(await getSendableDraft('https://x.com')).toEqual({
      subject: 'subj',
      altSubject: 'alt subj',
      body: 'body text',
      followUpBody: 'bump',
      touch3Body: 'close',
    });
    mockRows.unique = draftRow({ draftStatus: 'APPROVED' });
    expect(await getSendableDraft('https://x.com')).not.toBeNull();
  });

  it('returns null for missing rows, non-sendable statuses, or incomplete drafts', async () => {
    expect(await getSendableDraft('https://x.com')).toBeNull();

    for (const draftStatus of ['NONE', 'DRAFTING', 'FAILED']) {
      mockRows.unique = draftRow({ draftStatus });
      expect(await getSendableDraft('https://x.com')).toBeNull();
    }

    mockRows.unique = draftRow({ draftSubject: null });
    expect(await getSendableDraft('https://x.com')).toBeNull();
    mockRows.unique = draftRow({ draftBody: null });
    expect(await getSendableDraft('https://x.com')).toBeNull();
  });

  it('looks up by normalized websiteKey', async () => {
    mockRows.unique = draftRow();
    await getSendableDraft('https://www.Example.com/');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { websiteKey: 'example.com' } })
    );
  });
});

describe('getProspectByWebsite', () => {
  beforeEach(() => {
    mockRows.unique = null;
  });

  it('reassembles enrichment.outreachEmail from the draft columns', async () => {
    mockRows.unique = fullRow();
    const p = await getProspectByWebsite('https://www.lynnslodgingatx.com/');
    expect(p).not.toBeNull();
    expect(p!.enrichment).toMatchObject({
      management: { ownerName: 'Lynn' },
      outreachEmail: { subject: 'subj', body: 'body text' },
    });
  });

  it('leaves enrichment without outreachEmail when there is no draft', async () => {
    mockRows.unique = fullRow({ draftSubject: null, draftBody: null, draftStatus: 'NONE' });
    const p = await getProspectByWebsite('https://www.lynnslodgingatx.com/');
    expect(p!.enrichment).toEqual({ management: { ownerName: 'Lynn' } });
  });

  it('maps null propertiesEstimate to empty string for the views', async () => {
    mockRows.unique = fullRow();
    const p = await getProspectByWebsite('https://www.lynnslodgingatx.com/');
    expect(p!.propertiesEstimate).toBe('');
  });
});

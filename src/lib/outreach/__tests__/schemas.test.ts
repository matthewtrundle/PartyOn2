/**
 * schemas + verticals: every partner vertical has a complete registry entry,
 * and the session-output contracts accept good records / reject malformed
 * ones (the import scripts' first line of defense).
 */

import { describe, it, expect } from 'vitest';
import { PARTNER_VERTICAL_TAGS } from '@/lib/leads/partner-tags';
import { DiscoveryCandidateSchema, DraftSchema, EnrichmentSchema } from '../schemas';
import { getVertical, VERTICAL_KEYS, VERTICALS } from '../verticals';

describe('verticals registry', () => {
  it('covers every PARTNER_VERTICAL_TAGS key with a complete entry', () => {
    for (const key of Object.keys(PARTNER_VERTICAL_TAGS)) {
      const def = getVertical(key);
      expect(def, `missing vertical def for '${key}'`).toBeDefined();
      expect(def!.offer.length).toBeGreaterThan(50);
      expect(def!.researchFocus.length).toBeGreaterThan(30);
      expect(def!.discoveryQueryHints.length).toBeGreaterThanOrEqual(2);
      expect(def!.leadTag).toBe(PARTNER_VERTICAL_TAGS[key as keyof typeof PARTNER_VERTICAL_TAGS]);
    }
    expect(VERTICAL_KEYS).toHaveLength(Object.keys(PARTNER_VERTICAL_TAGS).length);
    expect(new Set(VERTICALS.map((v) => v.key)).size).toBe(VERTICALS.length);
  });
});

describe('EnrichmentSchema', () => {
  const valid = {
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
      notableProperties: [{ name: 'Lake House', blurb: 'sleeps 20' }],
    },
    business: {
      bookingModel: 'direct',
      services: 'management',
      positioning: 'luxury',
      guestDemographic: 'groups',
    },
    reputation: { summary: 'strong', ratings: '4.9', praiseThemes: 'arrival experience' },
    partnershipAngles: ['guest perk'],
    contact: { email: 'a@b.com', contactName: 'Lynn', phone: null, sourceUrl: 'https://x.com' },
    hooks: [{ text: 'guests name Lynn personally in reviews', sourceUrl: 'https://x.com', kind: 'review' }],
    sources: ['https://x.com'],
    siteAccess: 'ok',
  };

  it('accepts a complete dossier and rejects outreachEmail smuggling', () => {
    expect(EnrichmentSchema.safeParse(valid).success).toBe(true);
    // outreachEmail is not part of the dossier — drafts live in draft_* columns.
    const smuggled = { ...valid, outreachEmail: { subject: 's', body: 'b' } };
    const parsed = EnrichmentSchema.parse(smuggled);
    expect(parsed).not.toHaveProperty('outreachEmail');
  });

  it('rejects hook without sourceUrl and bad siteAccess', () => {
    expect(
      EnrichmentSchema.safeParse({
        ...valid,
        hooks: [{ text: 'uncited claim', kind: 'review' }],
      }).success
    ).toBe(false);
    expect(EnrichmentSchema.safeParse({ ...valid, siteAccess: 'nope' }).success).toBe(false);
  });
});

describe('DraftSchema', () => {
  it('requires all three touches + alt subject + cited hook', () => {
    const good = {
      id: 'p1',
      subject: 'guest perk',
      altSubject: 'stocked fridges',
      body: 'x'.repeat(60),
      followUpBody: 'y'.repeat(30),
      touch3Body: 'z'.repeat(30),
      hook: { text: 'a concrete fact', sourceUrl: 'https://x.com', kind: 'website' },
    };
    expect(DraftSchema.safeParse(good).success).toBe(true);
    expect(DraftSchema.safeParse({ ...good, altSubject: undefined }).success).toBe(false);
    expect(DraftSchema.safeParse({ ...good, touch3Body: undefined }).success).toBe(false);
    expect(DraftSchema.safeParse({ ...good, hook: { text: 'no url', kind: 'other' } }).success).toBe(
      false
    );
  });
});

describe('DiscoveryCandidateSchema', () => {
  it('requires name/website/whyFit; contact fields optional', () => {
    expect(
      DiscoveryCandidateSchema.safeParse({
        name: 'Austin Rentals',
        website: 'https://austinrentals.com',
        whyFit: 'manages 20+ STRs in the delivery footprint',
      }).success
    ).toBe(true);
    expect(
      DiscoveryCandidateSchema.safeParse({ name: 'X', website: 'not-a-url', whyFit: 'fits well enough' })
        .success
    ).toBe(false);
  });
});

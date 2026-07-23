/**
 * upsertLead sourceWidget semantics (2026-07-13 provenance hygiene): OTHER
 * is a placeholder any named widget may upgrade; a real widget is never
 * overwritten. Guards the lead-event null→OTHER default from blocking later
 * real-widget attribution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  lead: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  visitorSession: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('../pipeline', () => ({
  enrollLeadIfEligible: vi.fn(),
  handleSubmitSignal: vi.fn(),
}));

import { sanitizeName, upsertLead } from '../leadCapture';

function existingLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    email: 'guest@example.com',
    phone: null,
    firstName: null,
    lastName: null,
    status: 'PARTIAL',
    sourceWidget: null,
    sourcePage: null,
    lastPage: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    metadata: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.lead.findMany.mockResolvedValue([]);
  prismaMock.lead.update.mockImplementation(async ({ data }) => ({
    ...existingLead(),
    ...data,
  }));
});

describe('upsertLead — sourceWidget upgrade rules', () => {
  it('upgrades OTHER to a named widget', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ sourceWidget: 'OTHER' }));
    await upsertLead(
      { email: 'guest@example.com' },
      { sourceWidget: 'DRINK_CALCULATOR' },
    );
    const data = prismaMock.lead.update.mock.calls[0][0].data;
    expect(data.sourceWidget).toBe('DRINK_CALCULATOR');
  });

  it('fills a blank widget', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ sourceWidget: null }));
    await upsertLead({ email: 'guest@example.com' }, { sourceWidget: 'QUICK_BUY' });
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourceWidget).toBe('QUICK_BUY');
  });

  it('never overwrites a real widget (even with OTHER)', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(
      existingLead({ sourceWidget: 'CONTACT_FORM' }),
    );
    await upsertLead({ email: 'guest@example.com' }, { sourceWidget: 'OTHER' });
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourceWidget).toBe('CONTACT_FORM');
  });

  it('keeps OTHER when no widget is provided', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ sourceWidget: 'OTHER' }));
    await upsertLead({ email: 'guest@example.com' }, {});
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourceWidget).toBe('OTHER');
  });

  it('EMAIL_SIGNUP cannot replace OTHER (public-pixel board-hiding guard)', async () => {
    // An anonymous pixel caller who knows a victim's email must not be able
    // to flip an OTHER lead newsletter-only (which would hide it from board
    // enrollment).
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ sourceWidget: 'OTHER' }));
    await upsertLead(
      { email: 'guest@example.com' },
      { sourceWidget: 'EMAIL_SIGNUP' },
    );
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourceWidget).toBe('OTHER');
  });

  it('EMAIL_SIGNUP may still fill a blank (true first source)', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ sourceWidget: null }));
    await upsertLead({ email: 'guest@example.com' }, { sourceWidget: 'EMAIL_SIGNUP' });
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourceWidget).toBe('EMAIL_SIGNUP');
  });
});

describe('sanitizeName', () => {
  it('strips control characters and collapses whitespace/newlines', () => {
    expect(sanitizeName('Sar\x00ah\nMiller')).toBe('Sar ah Miller');
    expect(sanitizeName('  Jo   \t Bloggs  ')).toBe('Jo Bloggs');
  });

  it('caps length at 100 characters', () => {
    expect(sanitizeName('a'.repeat(250))).toHaveLength(100);
  });

  it('returns null for null / empty / whitespace-only input', () => {
    expect(sanitizeName(null)).toBeNull();
    expect(sanitizeName('')).toBeNull();
    expect(sanitizeName('   \n\t ')).toBeNull();
  });

  it('leaves a normal name (incl. accents + hyphen) intact', () => {
    expect(sanitizeName('José García-López')).toBe('José García-López');
  });

  it('strips bidi/zero-width format characters (display-spoofing defense)', () => {
    // U+202E RIGHT-TO-LEFT OVERRIDE and U+200B ZERO WIDTH SPACE are \p{Cf}.
    expect(sanitizeName('Jane\u202eEvil')).toBe('Jane Evil');
    expect(sanitizeName('A\u200bB')).toBe('A B');
  });

  it('caps by code point, never splitting an astral char mid-surrogate', () => {
    const out = sanitizeName('a'.repeat(99) + '😀');
    expect([...(out ?? '')]).toHaveLength(100); // 99 letters + 1 emoji code point
    expect(out?.endsWith('😀')).toBe(true); // emoji intact, not a lone surrogate
  });
});

describe('upsertLead — name sanitization at intake', () => {
  it('writes a sanitized firstName/lastName when creating a lead', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.create.mockImplementation(async ({ data }) => ({ ...existingLead(), ...data }));
    await upsertLead(
      { email: 'new@example.com', firstName: 'Evil\nInjected', lastName: 'x'.repeat(200) },
      { sourceWidget: 'CONTACT_FORM' },
    );
    const data = prismaMock.lead.create.mock.calls[0][0].data;
    expect(data.firstName).toBe('Evil Injected');
    expect(data.lastName).toHaveLength(100);
  });
});

describe('upsertLead — affiliate stamp is fill-blank only', () => {
  it('stamps affiliateId on create', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.create.mockImplementation(async ({ data }) => ({ ...existingLead(), ...data }));
    await upsertLead(
      { email: 'new@example.com' },
      { sourceWidget: 'PARTNER_LANDING_PAGE', affiliateId: 'aff-premier' },
    );
    expect(prismaMock.lead.create.mock.calls[0][0].data.affiliateId).toBe('aff-premier');
  });

  it('fills a blank affiliateId on update, never overwrites an existing one', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ affiliateId: null }));
    await upsertLead({ email: 'guest@example.com' }, { affiliateId: 'aff-new' });
    expect(prismaMock.lead.update.mock.calls[0][0].data.affiliateId).toBe('aff-new');

    vi.clearAllMocks();
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ affiliateId: 'aff-original' }));
    prismaMock.lead.update.mockImplementation(async ({ data }) => ({ ...existingLead(), ...data }));
    await upsertLead({ email: 'guest@example.com' }, { affiliateId: 'aff-hijack' });
    expect(prismaMock.lead.update.mock.calls[0][0].data.affiliateId).toBe('aff-original');
  });
});

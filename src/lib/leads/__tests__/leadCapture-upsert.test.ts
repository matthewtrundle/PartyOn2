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

describe('upsertLead — contactability guard', () => {
  it('refuses a name-only capture without creating a row', async () => {
    // findLead only matches on email/phone, so a name-only row could never
    // be joined to anything — it only ever created orphan junk.
    prismaMock.lead.findFirst.mockResolvedValue(null);
    const lead = await upsertLead(
      { firstName: 'Anzola', lastName: 'Hathorne' },
      { sourceWidget: 'DRINK_CALCULATOR' },
    );
    expect(lead).toBeNull();
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('still creates from an email alone', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.create.mockImplementation(async ({ data }) => ({
      ...existingLead(),
      ...data,
    }));
    const lead = await upsertLead(
      { email: 'someone@example.com' },
      { sourceWidget: 'CONTACT_FORM' },
    );
    expect(lead).not.toBeNull();
    expect(prismaMock.lead.create).toHaveBeenCalledTimes(1);
  });

  it('still creates from a phone alone', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.create.mockImplementation(async ({ data }) => ({
      ...existingLead(),
      ...data,
    }));
    const lead = await upsertLead(
      { phone: '512-555-0134', firstName: 'Sam' },
      { sourceWidget: 'CONTACT_FORM' },
    );
    expect(lead).not.toBeNull();
    expect(prismaMock.lead.create).toHaveBeenCalledTimes(1);
  });

  it('refuses a capture with neither email nor phone even when both names are set', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    expect(
      await upsertLead({ firstName: 'A', lastName: 'B' }, {}),
    ).toBeNull();
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });
});

describe('upsertLead — originWidget provenance stamp', () => {
  it('records the first strong widget when a later route takes over', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(
      existingLead({ sourceWidget: 'DRINK_CALCULATOR' }),
    );
    await upsertLead(
      { email: 'guest@example.com' },
      { sourceWidget: 'CONTACT_FORM' },
    );
    const data = prismaMock.lead.update.mock.calls[0][0].data;
    expect(data.metadata.originWidget).toBe('DRINK_CALCULATOR');
    // The sticky-widget rule is untouched: a real widget is never replaced.
    expect(data.sourceWidget).toBe('DRINK_CALCULATOR');
  });

  it('writes the stamp even when there are no click ids', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(
      existingLead({ sourceWidget: 'PACKAGE_BUILDER' }),
    );
    await upsertLead({ email: 'guest@example.com' }, {});
    expect(
      prismaMock.lead.update.mock.calls[0][0].data.metadata.originWidget,
    ).toBe('PACKAGE_BUILDER');
  });

  it('is set once and never overwritten', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(
      existingLead({
        sourceWidget: 'QUICK_BUY',
        metadata: { originWidget: 'DRINK_CALCULATOR' },
      }),
    );
    await upsertLead({ email: 'guest@example.com' }, { sourceWidget: 'CONTACT_FORM' });
    const data = prismaMock.lead.update.mock.calls[0][0].data;
    // No metadata write at all is also acceptable; what must not happen is
    // the original being replaced.
    if (data.metadata) expect(data.metadata.originWidget).toBe('DRINK_CALCULATOR');
  });

  it('does not stamp OTHER — a placeholder is not provenance', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(existingLead({ sourceWidget: 'OTHER' }));
    await upsertLead({ email: 'guest@example.com' }, { sourceWidget: 'CONTACT_FORM' });
    const data = prismaMock.lead.update.mock.calls[0][0].data;
    expect(data.metadata?.originWidget).toBeUndefined();
  });

  it('does not stamp on create — there is no prior owner', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.create.mockImplementation(async ({ data }) => ({
      ...existingLead(),
      ...data,
    }));
    await upsertLead({ email: 'new@example.com' }, { sourceWidget: 'CONTACT_FORM' });
    const data = prismaMock.lead.create.mock.calls[0][0].data;
    expect(data.metadata?.originWidget).toBeUndefined();
  });

  it('preserves existing metadata alongside the stamp', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(
      existingLead({
        sourceWidget: 'DRINK_CALCULATOR',
        metadata: { contactForm: { source: 'contact' } },
      }),
    );
    await upsertLead({ email: 'guest@example.com' }, { gclid: 'abc123' });
    const meta = prismaMock.lead.update.mock.calls[0][0].data.metadata;
    expect(meta.originWidget).toBe('DRINK_CALCULATOR');
    expect(meta.contactForm).toEqual({ source: 'contact' });
    expect(meta.attribution).toEqual({ gclid: 'abc123' });
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

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

import { upsertLead } from '../leadCapture';

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

/**
 * QuickBuy → Lead mirror: metadata surface + attribution merge, guarded
 * promotion (never downgrade), no-reopen (no trustedSubmit), never-throws.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsertLead = vi.fn();
const markLeadStatus = vi.fn();
const recordEvent = vi.fn();
const enrollLeadIfEligible = vi.fn();
const leadUpdate = vi.fn();

vi.mock('../leadCapture', () => ({
  upsertLead: (...args: unknown[]) => upsertLead(...args),
  markLeadStatus: (...args: unknown[]) => markLeadStatus(...args),
  recordEvent: (...args: unknown[]) => recordEvent(...args),
}));
vi.mock('../pipeline', () => ({
  enrollLeadIfEligible: (...args: unknown[]) => enrollLeadIfEligible(...args),
}));
vi.mock('@/lib/database/client', () => ({
  prisma: { lead: { update: (...args: unknown[]) => leadUpdate(...args) } },
}));

import { mirrorQuickBuyLead } from '../quickbuy-lead';

const baseRef = {
  occasion: 'wedding',
  mode: 'quote' as const,
  customerName: 'Nik Vee',
  customerEmail: 'nik@example.com',
  customerPhone: '',
  groupSize: 40,
  deliveryDate: '2026-08-17',
  draftOrderId: 'draft-1',
  total: 512.4,
  attribution: {
    landingPage: '/austin-wedding-alcohol-delivery',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'wedding-atx',
    gclid: 'g-123',
  },
};

function stubLead(overrides: Record<string, unknown> = {}) {
  return { id: 'lead-1', status: 'PARTIAL', sourceWidget: null, metadata: null, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  upsertLead.mockResolvedValue(stubLead());
  markLeadStatus.mockResolvedValue(undefined);
  recordEvent.mockResolvedValue(undefined);
  enrollLeadIfEligible.mockResolvedValue(true);
  leadUpdate.mockResolvedValue(undefined);
});

describe('mirrorQuickBuyLead', () => {
  it('upserts with split name, landing-page sourcePage, and full attribution ctx', async () => {
    await mirrorQuickBuyLead(baseRef);
    expect(upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nik@example.com', firstName: 'Nik', lastName: 'Vee' }),
      expect.objectContaining({
        sourceWidget: 'QUICK_BUY',
        sourcePage: '/austin-wedding-alcohol-delivery',
        utmSource: 'google',
        utmCampaign: 'wedding-atx',
        gclid: 'g-123',
      }),
    );
  });

  it('writes the quickBuy surface + merged attribution metadata', async () => {
    upsertLead.mockResolvedValue(
      stubLead({ metadata: { attribution: { fbclid: 'kept' }, chatQuiz: { partyType: 'boat' } } }),
    );
    await mirrorQuickBuyLead(baseRef);
    const data = leadUpdate.mock.calls[0][0].data;
    expect(data.metadata.quickBuy).toMatchObject({
      occasion: 'wedding',
      mode: 'quote',
      groupSize: 40,
      deliveryDate: '2026-08-17',
      draftOrderId: 'draft-1',
      total: 512.4,
    });
    // Merge, never clobber: prior surfaces + prior click ids survive.
    expect(data.metadata.chatQuiz).toEqual({ partyType: 'boat' });
    expect(data.metadata.attribution).toMatchObject({ fbclid: 'kept', gclid: 'g-123' });
  });

  it('promotes PARTIAL to SUBMITTED; enrolled leads only get enrollLeadIfEligible', async () => {
    await mirrorQuickBuyLead(baseRef);
    expect(markLeadStatus).toHaveBeenCalledWith('lead-1', 'SUBMITTED');
    expect(enrollLeadIfEligible).not.toHaveBeenCalled();

    vi.clearAllMocks();
    upsertLead.mockResolvedValue(stubLead({ status: 'SUBMITTED', sourceWidget: 'QUICK_BUY' }));
    leadUpdate.mockResolvedValue(undefined);
    await mirrorQuickBuyLead(baseRef);
    expect(markLeadStatus).not.toHaveBeenCalled();
    expect(enrollLeadIfEligible).toHaveBeenCalledWith('lead-1');
  });

  it('never sets trustedSubmit and upgrades only null/OTHER provenance', async () => {
    await mirrorQuickBuyLead(baseRef);
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CHECKOUT_START', widget: 'QUICK_BUY' }),
    );
    expect(recordEvent.mock.calls[0][0]).not.toHaveProperty('trustedSubmit');
    expect(leadUpdate.mock.calls[0][0].data.sourceWidget).toBe('QUICK_BUY');

    vi.clearAllMocks();
    upsertLead.mockResolvedValue(stubLead({ sourceWidget: 'CONTACT_FORM', status: 'SUBMITTED' }));
    leadUpdate.mockResolvedValue(undefined);
    await mirrorQuickBuyLead(baseRef);
    expect(leadUpdate.mock.calls[0][0].data.sourceWidget).toBeUndefined();
  });

  it('never throws when the upsert explodes', async () => {
    upsertLead.mockRejectedValue(new Error('db down'));
    await expect(mirrorQuickBuyLead(baseRef)).resolves.toBeUndefined();
    expect(recordEvent).not.toHaveBeenCalled();
  });
});

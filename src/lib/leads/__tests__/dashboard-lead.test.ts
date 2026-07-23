/**
 * Dashboard host → Lead mirror: contactability gate, placeholder-name skip,
 * guarded promotion (never downgrade), OTHER-provenance upgrade, no-reopen
 * (no trustedSubmit), and never-throws.
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

import { mirrorDashboardHostLead } from '../dashboard-lead';

const baseRef = {
  groupOrderId: 'g-1',
  shareCode: 'ABC123',
  hostName: 'Jane Doe',
  hostEmail: 'jane@example.com',
  hostPhone: null,
  createdVia: 'dashboard-order',
} as const;

function stubLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    status: 'PARTIAL',
    sourceWidget: null,
    metadata: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  upsertLead.mockResolvedValue(stubLead());
  markLeadStatus.mockResolvedValue(undefined);
  recordEvent.mockResolvedValue(undefined);
  enrollLeadIfEligible.mockResolvedValue(true);
  leadUpdate.mockResolvedValue(undefined);
});

describe('mirrorDashboardHostLead', () => {
  it('no email AND no phone → complete no-op', async () => {
    await mirrorDashboardHostLead({ ...baseRef, hostEmail: null, hostPhone: null });
    expect(upsertLead).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('drops the Party Host placeholder name but still mirrors the contact', async () => {
    await mirrorDashboardHostLead({ ...baseRef, hostName: 'Party Host' });
    expect(upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: null, lastName: null, email: 'jane@example.com' }),
      expect.objectContaining({ sourceWidget: 'GROUP_DASHBOARD' }),
    );
  });

  it('splits a real host name and stamps the dashboard sourcePage', async () => {
    await mirrorDashboardHostLead(baseRef);
    expect(upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }),
      expect.objectContaining({ sourcePage: '/dashboard/ABC123' }),
    );
  });

  it('promotes PARTIAL leads to SUBMITTED (columns), never touching closed statuses', async () => {
    await mirrorDashboardHostLead(baseRef);
    expect(markLeadStatus).toHaveBeenCalledWith('lead-1', 'SUBMITTED');
    expect(enrollLeadIfEligible).not.toHaveBeenCalled();
  });

  it('CONVERTED leads are not downgraded — enroll only', async () => {
    upsertLead.mockResolvedValue(stubLead({ status: 'CONVERTED', sourceWidget: 'CONTACT_FORM' }));
    await mirrorDashboardHostLead(baseRef);
    expect(markLeadStatus).not.toHaveBeenCalled();
    expect(enrollLeadIfEligible).toHaveBeenCalledWith('lead-1');
  });

  it('upgrades null/OTHER provenance to GROUP_DASHBOARD but never a real widget', async () => {
    upsertLead.mockResolvedValue(stubLead({ sourceWidget: 'OTHER' }));
    await mirrorDashboardHostLead(baseRef);
    expect(leadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceWidget: 'GROUP_DASHBOARD' }),
      }),
    );

    leadUpdate.mockClear();
    upsertLead.mockResolvedValue(stubLead({ status: 'SUBMITTED', sourceWidget: 'CONTACT_FORM' }));
    await mirrorDashboardHostLead(baseRef);
    const data = (leadUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.sourceWidget).toBeUndefined(); // real widget kept
    expect(data.metadata).toMatchObject({
      groupDashboard: expect.objectContaining({ groupOrderId: 'g-1', shareCode: 'ABC123' }),
    });
  });

  it('records a timeline event WITHOUT trustedSubmit (cannot reopen closed cards)', async () => {
    await mirrorDashboardHostLead(baseRef);
    const evt = recordEvent.mock.calls[0][0] as Record<string, unknown>;
    expect(evt.type).toBe('FORM_SUBMIT');
    expect(evt.widget).toBe('GROUP_DASHBOARD');
    expect('trustedSubmit' in evt).toBe(false);
  });

  it('never throws — dashboard creation survives a lead-layer failure', async () => {
    upsertLead.mockRejectedValue(new Error('db down'));
    await expect(mirrorDashboardHostLead(baseRef)).resolves.toBeUndefined();
  });
});

describe('mirrorDashboardHostLead — affiliate forwarding', () => {
  it("passes the group's affiliateId into the upsert ctx (fill-blank stamp)", async () => {
    await mirrorDashboardHostLead({ ...baseRef, affiliateId: 'aff-premier' });
    expect(upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ affiliateId: 'aff-premier' }),
    );
  });

  it('defaults to null when the dashboard has no affiliate', async () => {
    await mirrorDashboardHostLead(baseRef);
    expect(upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ affiliateId: null }),
    );
  });
});

describe('mirrorDashboardHostLead — attribution split (utm/clicks → ctx, landing/referrer → metadata)', () => {
  it('routes click ids into the upsert ctx and landing/referrer into metadata.attribution', async () => {
    await mirrorDashboardHostLead({
      ...baseRef,
      attribution: {
        utmSource: 'google',
        gclid: 'g-xyz',
        landingPage: '/austin-boat-party',
        referrer: 'https://google.com',
      },
    });
    // utm + click ids reach upsertLead ctx (columns + metadata merge there).
    expect(upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ utmSource: 'google', gclid: 'g-xyz' }),
    );
    // landingPage/referrer are NOT LeadContext fields — they must not leak in.
    const ctx = upsertLead.mock.calls[0][1];
    expect(ctx).not.toHaveProperty('landingPage');
    expect(ctx).not.toHaveProperty('referrer');
    // ...they fill-blank into metadata.attribution on the follow-up update.
    const meta = leadUpdate.mock.calls[0][0].data.metadata;
    expect(meta.attribution).toMatchObject({
      landingPage: '/austin-boat-party',
      referrer: 'https://google.com',
    });
  });
})

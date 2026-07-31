/**
 * Enroll route — prospect→lead back-link.
 *
 * The case this exists for: enroll resolves the Lead by websiteKey but
 * historically never persisted PartnerProspect.leadId — only the sync POST
 * did. The first live enrollment (2026-07-31) therefore showed as a bare
 * email in the campaign funnel panel (leadId-keyed prospect join) until the
 * next Sync click. Enroll must write the back-link idempotently the moment
 * it resolves the lead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/auth/ops-session', () => ({
  requireOpsAuth: vi.fn().mockResolvedValue({ role: 'admin' }),
}));

const mockLeadFindFirst = vi.fn();
const mockProspectUpdate = vi.fn().mockResolvedValue({});
vi.mock('@/lib/database/client', () => ({
  prisma: {
    lead: { findFirst: (...a: unknown[]) => mockLeadFindFirst(...a) },
    partnerProspect: { update: (...a: unknown[]) => mockProspectUpdate(...a) },
  },
}));

const mockEnqueue = vi.fn().mockResolvedValue({ enqueued: true, jobId: 'job-1' });
vi.mock('@/lib/followups/enqueue', () => ({
  enqueueJourney: (...a: unknown[]) => mockEnqueue(...a),
}));

vi.mock('@/lib/followups/suppression', () => ({
  isSuppressed: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/partners/enroll-gate', () => ({
  enrollGateReason: vi.fn().mockReturnValue(null),
}));

const mockGetProspect = vi.fn();
vi.mock('@/lib/partners/prospect-store', () => ({
  getProspectByWebsite: (...a: unknown[]) => mockGetProspect(...a),
  assignAbArm: vi.fn().mockReturnValue('A'),
}));

import { POST } from '../enroll/route';

const WEBSITE = 'https://512retreat.com/';

function prospect(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'prospect-1',
    name: '512 Retreat',
    website: WEBSITE,
    websiteKey: '512retreat.com',
    email: 'reservations@512retreat.com',
    partnerSlug: null,
    abArm: 'A', // pre-labeled so the arm safety-net write never fires
    leadId: null,
    ...overrides,
  };
}

function request(): NextRequest {
  return { json: async () => ({ websites: [WEBSITE] }) } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLeadFindFirst.mockResolvedValue({ id: 'lead-1', firstName: 'Robin' });
});

describe('enroll back-link', () => {
  it('persists PartnerProspect.leadId when it was never linked', async () => {
    mockGetProspect.mockResolvedValue(prospect({ leadId: null }));

    const res = await POST(request());
    const body = await res.json();

    expect(body.data.enrolled).toBe(1);
    expect(mockProspectUpdate).toHaveBeenCalledWith({
      where: { id: 'prospect-1' },
      data: { leadId: 'lead-1' },
    });
  });

  it('re-points a stale back-link at the freshly resolved lead', async () => {
    mockGetProspect.mockResolvedValue(prospect({ leadId: 'lead-old' }));

    await POST(request());

    expect(mockProspectUpdate).toHaveBeenCalledWith({
      where: { id: 'prospect-1' },
      data: { leadId: 'lead-1' },
    });
  });

  it('skips the write when the back-link is already correct (idempotent)', async () => {
    mockGetProspect.mockResolvedValue(prospect({ leadId: 'lead-1' }));

    const res = await POST(request());
    const body = await res.json();

    expect(body.data.enrolled).toBe(1);
    expect(mockProspectUpdate).not.toHaveBeenCalled();
  });

  it('still enqueues the journey against the resolved lead', async () => {
    mockGetProspect.mockResolvedValue(prospect({ leadId: null }));

    await POST(request());

    expect(mockEnqueue).toHaveBeenCalledWith(
      'partner-outreach',
      expect.objectContaining({ entityId: 'lead-1', leadId: 'lead-1' }),
    );
  });

  it('never touches the prospect when the lead is missing (not-synced)', async () => {
    mockGetProspect.mockResolvedValue(prospect({ leadId: null }));
    mockLeadFindFirst.mockResolvedValue(null);

    const res = await POST(request());
    const body = await res.json();

    expect(body.data.enrolled).toBe(0);
    expect(body.data.results[0].reason).toBe('not-synced');
    expect(mockProspectUpdate).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});

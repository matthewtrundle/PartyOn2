/**
 * POST /api/v1/admin/draft-orders — the ops-invoice lead mirror (2026-07-13
 * audit gap #7): an invoice to a brand-new contact must produce an
 * OPS_INVOICE board card; group-attached drafts must not (the dashboard-host
 * mirror owns those).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const draftOrdersMock = vi.hoisted(() => ({
  createDraftOrder: vi.fn(),
  listDraftOrders: vi.fn(),
  calculateDraftOrderAmounts: vi.fn(),
}));
vi.mock('@/lib/draft-orders', () => draftOrdersMock);

const leadCaptureMock = vi.hoisted(() => ({
  upsertLead: vi.fn(),
  markLeadStatus: vi.fn(),
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const pipelineMock = vi.hoisted(() => ({ enrollLeadIfEligible: vi.fn() }));
vi.mock('@/lib/leads/pipeline', () => pipelineMock);

const prismaMock = vi.hoisted(() => ({ lead: { update: vi.fn() } }));
vi.mock('@/lib/database/client', () => ({
  kv: {},
  isKVConfigured: () => false,
  prisma: prismaMock,
}));

// Ops-auth gate passes in these tests (a valid session); route logic is what's
// under test. A separate case flips it to assert the 401 short-circuit.
const opsAuthMock = vi.hoisted(() => ({ requireOpsAuth: vi.fn() }));
vi.mock('@/lib/auth/ops-session', () => opsAuthMock);

import { POST } from '../route';
import { NextResponse } from 'next/server';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/v1/admin/draft-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  customerEmail: 'new-contact@example.com',
  customerName: 'Pat Miller',
  customerPhone: '512-555-0100',
  deliveryAddress: '1 Main St',
  deliveryCity: 'Austin',
  deliveryZip: '78701',
  deliveryDate: '2026-08-01',
  deliveryTime: '12:00 PM - 2:00 PM',
  items: [
    { productId: 'p1', variantId: 'v1', title: 'Beer Bucket', quantity: 1, price: 50 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  opsAuthMock.requireOpsAuth.mockResolvedValue({ sub: 'ops-user' });
  draftOrdersMock.calculateDraftOrderAmounts.mockReturnValue({
    subtotal: 50,
    taxAmount: 4,
    deliveryFee: 20,
    discountAmount: 0,
  });
  draftOrdersMock.createDraftOrder.mockResolvedValue({ id: 'draft-1', token: 'tok_1' });
  leadCaptureMock.upsertLead.mockResolvedValue({
    id: 'lead-1',
    status: 'PARTIAL',
    sourceWidget: null,
    metadata: null,
  });
  prismaMock.lead.update.mockResolvedValue({});
});

describe('POST /api/v1/admin/draft-orders', () => {
  it('mirrors a non-group draft into an OPS_INVOICE lead linked to the draft', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new-contact@example.com', firstName: 'Pat' }),
      expect.objectContaining({ sourceWidget: 'OPS_INVOICE' }),
    );
    expect(prismaMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          draftOrderId: 'draft-1',
          sourceWidget: 'OPS_INVOICE', // null provenance upgraded
          metadata: expect.objectContaining({
            opsInvoice: expect.objectContaining({ draftOrderId: 'draft-1' }),
          }),
        }),
      }),
    );
    expect(leadCaptureMock.markLeadStatus).toHaveBeenCalledWith('lead-1', 'SUBMITTED');
  });

  it('skips the mirror for group-attached drafts', async () => {
    await POST(makeRequest({ ...validBody, groupOrderId: 'group-1' }));
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
  });

  it('keeps a real sourceWidget and never downgrades a CONVERTED lead', async () => {
    leadCaptureMock.upsertLead.mockResolvedValue({
      id: 'lead-2',
      status: 'CONVERTED',
      sourceWidget: 'CONTACT_FORM',
      metadata: null,
    });
    await POST(makeRequest(validBody));

    const data = (prismaMock.lead.update.mock.calls[0][0] as { data: Record<string, unknown> })
      .data;
    expect(data.sourceWidget).toBeUndefined();
    expect(leadCaptureMock.markLeadStatus).not.toHaveBeenCalled();
    expect(pipelineMock.enrollLeadIfEligible).toHaveBeenCalledWith('lead-2');
  });

  it('still returns the invoice when the lead mirror fails', async () => {
    leadCaptureMock.upsertLead.mockRejectedValue(new Error('db down'));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('short-circuits with the ops-auth response and never creates a draft', async () => {
    opsAuthMock.requireOpsAuth.mockResolvedValue(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    expect(draftOrdersMock.createDraftOrder).not.toHaveBeenCalled();
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
  });
});

/**
 * POST /api/contact — the 5th trusted lead route (2026-07-13 audit gap #10):
 * a contact-form send must promote the lead to SUBMITTED and fire a
 * trustedSubmit FORM_SUBMIT so the card enrolls (or reopens) in realtime.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const leadCaptureMock = vi.hoisted(() => ({
  upsertLead: vi.fn(),
  recordEvent: vi.fn(),
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const prismaMock = vi.hoisted(() => ({ lead: { update: vi.fn() } }));
vi.mock('@/lib/database/client', () => ({
  kv: {},
  isKVConfigured: () => false,
  prisma: prismaMock,
}));

vi.mock('@/lib/followups/enqueue', () => ({ enqueueJourney: vi.fn() }));
vi.mock('@/lib/premier/pod-leads-sheet', () => ({ mirrorLeadToSheet: vi.fn() }));
vi.mock('@/lib/leads/crm-mirror', () => ({ mirrorLeadToCrm: vi.fn() }));

import { POST } from '../route';

let ipCounter = 0;
function makeRequest(body: unknown): NextRequest {
  ipCounter += 1;
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.2.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '512-555-0187',
  eventType: 'wedding',
  eventDate: '2026-09-12',
  guestCount: 40,
  message: 'Need a bar setup for 40.',
};

beforeEach(() => {
  vi.clearAllMocks();
  leadCaptureMock.upsertLead.mockResolvedValue({ id: 'lead-1', metadata: null });
  leadCaptureMock.recordEvent.mockResolvedValue(null);
  prismaMock.lead.update.mockResolvedValue({});
});

describe('POST /api/contact', () => {
  it('promotes the lead to SUBMITTED with a last-touch source stamp', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    expect(prismaMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1' },
        data: expect.objectContaining({
          status: 'SUBMITTED',
          sourcePage: '/contact',
          sourceWidget: 'CONTACT_FORM',
        }),
      }),
    );
  });

  it('fires a trustedSubmit FORM_SUBMIT (realtime enroll/reopen)', async () => {
    await POST(makeRequest(validBody));
    expect(leadCaptureMock.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FORM_SUBMIT',
        leadId: 'lead-1',
        widget: 'CONTACT_FORM',
        trustedSubmit: true,
      }),
    );
  });

  it('still succeeds for the customer when lead storage fails', async () => {
    leadCaptureMock.upsertLead.mockRejectedValue(new Error('db down'));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(leadCaptureMock.recordEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without touching the lead layer', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
  });
});

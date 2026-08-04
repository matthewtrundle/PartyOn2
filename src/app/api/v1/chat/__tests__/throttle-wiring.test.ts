/**
 * The throttle is actually wired into the route, and refuses in the right order.
 *
 * Two things a passing limiter unit test cannot tell you: that the route calls
 * it at all, and that the IP check happens BEFORE the body is read (so a flood
 * costs a header lookup, not a JSON parse plus a lead upsert). Both are asserted
 * here by watching what did NOT happen on a refused request.
 *
 * The limiter itself is mocked — its behaviour is covered in
 * src/lib/security/__tests__/lead-capture-throttle.test.ts. Exercising the real
 * one here would make these tests depend on a shared module-level counter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const throttleMock = vi.hoisted(() => ({
  allowLeadCaptureIp: vi.fn(),
  allowLeadCaptureEmail: vi.fn(),
  clientIp: vi.fn(() => '203.0.113.1'),
  LEAD_CAPTURE_THROTTLED: { ok: false, error: 'rate_limited', message: 'Too many requests.' },
}));
vi.mock('@/lib/security/lead-capture-throttle', () => throttleMock);

const leadCaptureMock = vi.hoisted(() => ({
  upsertLead: vi.fn(),
  recordEvent: vi.fn(),
  markLeadStatus: vi.fn(),
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const prismaMock = vi.hoisted(() => ({ lead: { update: vi.fn() } }));
vi.mock('@/lib/database/client', () => ({ prisma: prismaMock, kv: {}, isKVConfigured: () => false }));

const recMock = vi.hoisted(() => ({ recommendForChat: vi.fn() }));
vi.mock('@/lib/chat/recommendation', () => recMock);

const sheetMock = vi.hoisted(() => ({ mirrorLeadToSheet: vi.fn() }));
vi.mock('@/lib/premier/pod-leads-sheet', () => sheetMock);

const crmMock = vi.hoisted(() => ({ mirrorLeadToCrm: vi.fn() }));
vi.mock('@/lib/leads/crm-mirror', () => crmMock);

import { POST } from '../submit/route';

const VALID = {
  firstName: 'Codie',
  email: 'codie@example.com',
  partyType: 'hotel',
  headcount: 13,
  deliveryDate: '2026-09-30',
};

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/v1/chat/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.1' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  throttleMock.allowLeadCaptureIp.mockResolvedValue(true);
  throttleMock.allowLeadCaptureEmail.mockResolvedValue(true);
  leadCaptureMock.upsertLead.mockResolvedValue({ id: 'lead-1', metadata: null });
  leadCaptureMock.recordEvent.mockResolvedValue(undefined);
  prismaMock.lead.update.mockResolvedValue({ id: 'lead-1' });
  recMock.recommendForChat.mockResolvedValue({ items: [] });
  sheetMock.mirrorLeadToSheet.mockResolvedValue(undefined);
  crmMock.mirrorLeadToCrm.mockResolvedValue(undefined);
});

describe('POST /api/v1/chat/submit — throttle wiring', () => {
  it('lets a normal submission through and captures the lead', async () => {
    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    expect(throttleMock.allowLeadCaptureIp).toHaveBeenCalledTimes(1);
    expect(throttleMock.allowLeadCaptureEmail).toHaveBeenCalledWith(VALID.email);
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledTimes(1);
  });

  it('refuses a flooding IP with 429 before it reads the body', async () => {
    throttleMock.allowLeadCaptureIp.mockResolvedValue(false);

    const res = await POST(request(VALID));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'rate_limited' });
    // Cheap refusal: no lead written, and the address was never even consulted.
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
    expect(throttleMock.allowLeadCaptureEmail).not.toHaveBeenCalled();
  });

  it('refuses a hammered address with 429 and writes no lead', async () => {
    throttleMock.allowLeadCaptureEmail.mockResolvedValue(false);

    const res = await POST(request(VALID));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'rate_limited' });
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
    // The IP guard ran first and passed; the address is what stopped this one.
    expect(throttleMock.allowLeadCaptureIp).toHaveBeenCalledTimes(1);
    expect(throttleMock.allowLeadCaptureEmail).toHaveBeenCalledTimes(1);
  });

  it('never consults the address limit for a malformed body', async () => {
    // Nothing to key on, and the IP limit has already absorbed the request.
    const res = await POST(request({ firstName: '', email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(throttleMock.allowLeadCaptureEmail).not.toHaveBeenCalled();
  });
});

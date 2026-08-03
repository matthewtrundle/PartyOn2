/**
 * The chat flow must send exactly ONE welcome email.
 *
 * It is a two-request flow — POST /chat/submit at the contact step, then
 * POST /quote/start when the customer clicks through to their order — and both
 * routes used to send the SAME eventQuizWelcomeEmail with the same subject.
 * Anyone who finished the chat got two identical emails seconds apart; four
 * real customers did, the closest pair 22 seconds (audit 2026-08-03).
 *
 * The fix is that /chat/submit no longer emails at all: quote/start owns the
 * send because its link goes to the customer's actual dashboard, where
 * chat/submit's only pointed back at the landing page.
 *
 * This test fails if anyone restores a send to chat/submit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const emailMock = vi.hoisted(() => ({ sendEmail: vi.fn(), sendEmailDetailed: vi.fn() }));
vi.mock('@/lib/email/resend-client', () => emailMock);

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

const mirrorMock = vi.hoisted(() => ({ mirrorLeadToSheet: vi.fn() }));
vi.mock('@/lib/premier/pod-leads-sheet', () => mirrorMock);

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  leadCaptureMock.upsertLead.mockResolvedValue({ id: 'lead-1', metadata: null });
  leadCaptureMock.recordEvent.mockResolvedValue(undefined);
  prismaMock.lead.update.mockResolvedValue({ id: 'lead-1' });
  recMock.recommendForChat.mockResolvedValue({ items: [] });
  mirrorMock.mirrorLeadToSheet.mockResolvedValue(undefined);
  crmMock.mirrorLeadToCrm.mockResolvedValue(undefined);
});

describe('POST /api/v1/chat/submit', () => {
  it('does NOT send an email — quote/start owns the single welcome', async () => {
    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
  });

  it('still captures the lead and returns the redirect', async () => {
    // The route's job is the Lead + the redirect; dropping the email must not
    // quietly drop the capture with it.
    const res = await POST(request(VALID));
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.leadId).toBe('lead-1');
    expect(typeof body.redirectTo).toBe('string');
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledTimes(1);
    expect(leadCaptureMock.recordEvent).toHaveBeenCalledTimes(1);
  });

  it('records the submit as trusted so a closed card can reopen', async () => {
    await POST(request(VALID));
    expect(leadCaptureMock.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FORM_SUBMIT', trustedSubmit: true }),
    );
  });

  it('sends nothing on a rejected body either', async () => {
    const res = await POST(request({ firstName: '', email: 'nope' }));
    expect(res.status).toBe(400);
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });
});

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

describe('POST /api/contact — which form sent it', () => {
  /** Three separate pages post here; the board has to tell them apart. */
  it('records /plan-event on BOTH the upsert and the last-touch update', async () => {
    await POST(makeRequest({ ...validBody, source: 'plan-event-page' }));

    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sourcePage: '/plan-event' }),
    );
    const update = prismaMock.lead.update.mock.calls[0][0];
    expect(update.data.sourcePage).toBe('/plan-event');
    expect(update.data.metadata.contactForm.source).toBe('plan-event-page');
  });

  it('records /book-now for the booking form', async () => {
    await POST(makeRequest({ ...validBody, source: 'book-now' }));
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sourcePage: '/book-now' }),
    );
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourcePage).toBe('/book-now');
  });

  it('falls back to /contact when no source is sent (older clients)', async () => {
    await POST(makeRequest(validBody));
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sourcePage: '/contact' }),
    );
    const update = prismaMock.lead.update.mock.calls[0][0];
    expect(update.data.sourcePage).toBe('/contact');
    expect(update.data.metadata.contactForm.source).toBe('contact');
  });

  it('never lets a caller-supplied string reach sourcePage', async () => {
    // sourcePage is rendered on the admin board, so it is mapped, not
    // interpolated. An unknown value falls back rather than passing through.
    await POST(makeRequest({ ...validBody, source: '../../evil?x=1' }));
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sourcePage: '/contact' }),
    );
    expect(prismaMock.lead.update.mock.calls[0][0].data.sourcePage).toBe('/contact');
  });

  it.each(['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'])(
    'resolves %s to a plain string, not an inherited property',
    async (source) => {
      // A plain-object lookup returns Object.prototype members instead of
      // undefined, so `?? fallback` never fires and a FUNCTION lands where a
      // string belongs — which Prisma refuses to serialize, silently losing
      // the whole submission, and which React throws on when the drawer
      // renders it. The tables are Maps for exactly this reason.
      await POST(makeRequest({ ...validBody, source }));

      const ctx = leadCaptureMock.upsertLead.mock.calls[0][1];
      expect(typeof ctx.sourcePage).toBe('string');
      expect(ctx.sourcePage).toBe('/contact');

      const data = prismaMock.lead.update.mock.calls[0][0].data;
      expect(typeof data.sourcePage).toBe('string');
      expect(data.sourcePage).toBe('/contact');
      // Only a recognised form id is ever persisted.
      expect(data.metadata.contactForm.source).toBe('contact');
    },
  );

  it('carries the form id onto the FORM_SUBMIT event page', async () => {
    await POST(makeRequest({ ...validBody, source: 'plan-event-page' }));
    expect(leadCaptureMock.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        page: '/plan-event',
        metadata: expect.objectContaining({ source: 'plan-event-page' }),
      }),
    );
  });
});

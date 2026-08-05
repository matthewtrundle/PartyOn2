/**
 * POST /api/v1/events/abandon-nudge/cancel
 *
 * The completion signal for the abandoned-cart nudge. `clearCart()` in the
 * drinks modal only touches localStorage, so without this the scheduled nudge
 * still fires 30 minutes later and tells someone who already ordered to
 * "finish your order".
 *
 * Two properties matter beyond the happy path: it must never CREATE a Lead
 * (that would make an unauthenticated cancel a write primitive), and it must
 * answer identically for a known and an unknown address so it can't be used
 * to enumerate who is in our list.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const leadCaptureMock = vi.hoisted(() => ({
  findLead: vi.fn(),
  upsertLead: vi.fn(),
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const prismaMock = vi.hoisted(() => ({ lead: { update: vi.fn() } }));
vi.mock('@/lib/database/client', () => ({
  prisma: prismaMock,
  kv: {},
  isKVConfigured: () => false,
}));

import { POST } from '../route';

// The throttle keys on IP, so vary it per request or the suite trips its own
// limit partway through.
let ipCounter = 0;
function makeRequest(body: unknown): NextRequest {
  ipCounter += 1;
  return new NextRequest('http://localhost/api/v1/events/abandon-nudge/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-forwarded-for': `10.9.0.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  eventSlug: 'brian-41st-birthday',
  email: 'Sam.Reyes@Example.com',
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.lead.update.mockResolvedValue({});
});

describe('POST /api/v1/events/abandon-nudge/cancel', () => {
  it('stamps the pending nudge as canceled, leaving other metadata alone', async () => {
    leadCaptureMock.findLead.mockResolvedValue({
      id: 'lead-9',
      metadata: {
        contactForm: { source: 'contact' },
        abandonedCart: { eventSlug: 'brian-41st-birthday', nudgeSentAt: null },
      },
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const meta = prismaMock.lead.update.mock.calls[0][0].data.metadata;
    expect(meta.abandonedCart.canceledAt).toEqual(expect.any(String));
    expect(meta.contactForm).toEqual({ source: 'contact' });
  });

  it('keeps the abandonedCart key so the leads board still labels the lead', async () => {
    // source-taxonomy.ts keys the "Event RSVP Cart" label off the presence of
    // metadata.abandonedCart — deleting it would silently change the board.
    leadCaptureMock.findLead.mockResolvedValue({
      id: 'lead-9',
      metadata: {
        abandonedCart: {
          eventSlug: 'brian-41st-birthday',
          eventTitle: "Brian's 41st Birthday Bash",
          itemCount: 3,
        },
      },
    });
    await POST(makeRequest(validBody));
    const cart = prismaMock.lead.update.mock.calls[0][0].data.metadata.abandonedCart;
    expect(cart).not.toBeUndefined();
    expect(cart.eventTitle).toBe("Brian's 41st Birthday Bash");
    expect(cart.itemCount).toBe(3);
  });

  it('does not re-stamp a nudge that was already canceled', async () => {
    leadCaptureMock.findLead.mockResolvedValue({
      id: 'lead-9',
      metadata: {
        abandonedCart: {
          eventSlug: 'brian-41st-birthday',
          canceledAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });
    const res = await POST(makeRequest(validBody));
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('leaves a nudge scheduled for a DIFFERENT event untouched', async () => {
    // A guest can be invited to two parties — finishing one order must not
    // silence the other.
    leadCaptureMock.findLead.mockResolvedValue({
      id: 'lead-9',
      metadata: { abandonedCart: { eventSlug: 'some-other-party' } },
    });

    const res = await POST(makeRequest(validBody));
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('answers the same for an unknown address, and never creates a Lead', async () => {
    leadCaptureMock.findLead.mockResolvedValue(null);

    const res = await POST(makeRequest({ ...validBody, email: 'stranger@example.com' }));
    expect(res.status).toBe(200);
    // Same shape as the "found but nothing to clear" case — no enumeration oracle.
    expect(await res.json()).toEqual({ ok: true });
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('is a no-op when the lead has no pending nudge at all', async () => {
    leadCaptureMock.findLead.mockResolvedValue({ id: 'lead-9', metadata: null });
    const res = await POST(makeRequest(validBody));
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('400s on a malformed body without touching the lead layer', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'nope' }));
    expect(res.status).toBe(400);
    expect(leadCaptureMock.findLead).not.toHaveBeenCalled();
  });

  it('returns a byte-identical body across every internal branch', async () => {
    // CWE-204. Reporting which branch ran would tell an attacker who guessed
    // an email + a (public) slug whether that person has an unfinished drink
    // order for that party. Same status code is not enough — same BODY.
    const branches = [
      null, // address unknown to us
      { id: 'l', metadata: null }, // known, no cart at all
      { id: 'l', metadata: { abandonedCart: { eventSlug: 'other-party' } } }, // cart, wrong event
      {
        id: 'l',
        metadata: { abandonedCart: { eventSlug: 'brian-41st-birthday', canceledAt: 'x' } },
      }, // already canceled
      {
        id: 'l',
        metadata: { abandonedCart: { eventSlug: 'brian-41st-birthday', nudgeSentAt: null } },
      }, // the one that actually cancels
    ];

    const seen = new Set<string>();
    for (const lead of branches) {
      leadCaptureMock.findLead.mockResolvedValue(lead);
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      seen.add(JSON.stringify(await res.json()));
    }
    expect([...seen]).toEqual(['{"ok":true}']);
  });

  it('throttles a caller hammering it from one address', async () => {
    leadCaptureMock.findLead.mockResolvedValue(null);
    const sameIp = (): NextRequest =>
      new NextRequest('http://localhost/api/v1/events/abandon-nudge/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-forwarded-for': '203.0.113.42',
        },
        body: JSON.stringify(validBody),
      });

    const statuses: number[] = [];
    for (let i = 0; i < 20; i += 1) statuses.push((await POST(sameIp())).status);
    expect(statuses).toContain(429);
  });
});

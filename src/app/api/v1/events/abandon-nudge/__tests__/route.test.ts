/**
 * POST /api/v1/events/abandon-nudge — routes through the shared lead writer.
 *
 * The route used to run its own `findFirst({ email: lowercased })` + create,
 * which skipped email normalization (so a lead stored via any other path could
 * be missed and duplicated), phone matching, and the keystroke-fragment merge.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const leadCaptureMock = vi.hoisted(() => ({
  upsertLead: vi.fn(),
  sanitizeName: (v: string | null | undefined) =>
    v == null ? null : String(v).replace(/\s+/g, ' ').trim() || null,
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const prismaMock = vi.hoisted(() => ({ lead: { update: vi.fn(), findFirst: vi.fn() } }));
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
  return new NextRequest('http://localhost/api/v1/events/abandon-nudge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-forwarded-for': `10.7.0.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  });
}

// No eventTitle / resumeUrl — the route reads both off the event registry now.
const validBody = {
  eventSlug: 'brian-41st-birthday',
  firstName: 'Sam',
  lastName: 'Reyes',
  email: 'Sam.Reyes@Example.com',
  phone: '512-555-0134',
  itemCount: 3,
  cartTotal: 128.5,
};

beforeEach(() => {
  vi.clearAllMocks();
  leadCaptureMock.upsertLead.mockResolvedValue({ id: 'lead-9', metadata: null });
  prismaMock.lead.update.mockResolvedValue({});
});

describe('POST /api/v1/events/abandon-nudge', () => {
  it('resolves the lead through upsertLead, not a local email lookup', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'Sam.Reyes@Example.com',
        phone: '512-555-0134',
      }),
      expect.objectContaining({
        sourcePage: '/events/brian-41st-birthday',
        sourceWidget: 'A_LA_CARTE',
      }),
    );
    // The old ad-hoc dedupe must be gone.
    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
  });

  it('schedules the nudge with a reset nudgeSentAt', async () => {
    await POST(makeRequest(validBody));
    const data = prismaMock.lead.update.mock.calls[0][0].data;
    expect(data.metadata.abandonedCart).toEqual(
      expect.objectContaining({
        eventSlug: 'brian-41st-birthday',
        itemCount: 3,
        nudgeSentAt: null,
      }),
    );
    expect(data.resumeCart).toEqual({ itemCount: 3, cartTotal: 128.5 });
  });

  it('preserves unrelated metadata already on the lead', async () => {
    leadCaptureMock.upsertLead.mockResolvedValue({
      id: 'lead-9',
      metadata: { contactForm: { source: 'contact' } },
    });
    await POST(makeRequest(validBody));
    const meta = prismaMock.lead.update.mock.calls[0][0].data.metadata;
    expect(meta.contactForm).toEqual({ source: 'contact' });
    expect(meta.abandonedCart).toBeDefined();
  });

  it('does not reschedule once a nudge has been sent for that event', async () => {
    leadCaptureMock.upsertLead.mockResolvedValue({
      id: 'lead-9',
      metadata: {
        abandonedCart: {
          eventSlug: 'brian-41st-birthday',
          nudgeSentAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });
    const res = await POST(makeRequest(validBody));
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('reschedules when the prior nudge was for a different event', async () => {
    leadCaptureMock.upsertLead.mockResolvedValue({
      id: 'lead-9',
      metadata: {
        abandonedCart: {
          eventSlug: 'some-other-party',
          nudgeSentAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });
    await POST(makeRequest(validBody));
    expect(prismaMock.lead.update).toHaveBeenCalledTimes(1);
  });

  it('400s when the writer cannot resolve a lead', async () => {
    leadCaptureMock.upsertLead.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('400s on a malformed body without touching the lead layer', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'nope' }));
    expect(res.status).toBe(400);
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
  });

  // --- Unauthenticated-input containment (security review) -----------------
  // This endpoint takes no auth, so anything it stores can end up in a
  // domain-authenticated email. It used to accept eventTitle + resumeUrl from
  // the body, which handed an anonymous caller both the copy and the link.

  it('400s on an event slug that is not one of ours', async () => {
    const res = await POST(
      makeRequest({ ...validBody, eventSlug: 'not-a-real-party' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'Unknown event' });
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('400s on inherited Object.prototype keys posing as a slug', async () => {
    // The registry is a plain object, so a bare DEMO_EVENTS[slug] would hand
    // back Object.prototype.constructor — truthy, so the guard would pass and
    // every field read off it would be undefined.
    for (const slug of ['constructor', 'toString', '__proto__', 'valueOf']) {
      const res = await POST(makeRequest({ ...validBody, eventSlug: slug }));
      expect(res.status, `slug leaked through: ${slug}`).toBe(400);
    }
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('reads the stored event title off the registry, not the request body', async () => {
    await POST(makeRequest({ ...validBody, eventTitle: 'CLICK HERE FOR FREE MONEY' }));
    const stored = prismaMock.lead.update.mock.calls[0][0].data.metadata.abandonedCart;
    expect(stored.eventTitle).toBe("Brian's 41st Birthday Bash");
    expect(JSON.stringify(stored)).not.toContain('FREE MONEY');
  });

  it('never persists a caller-supplied resumeUrl', async () => {
    await POST(makeRequest({ ...validBody, resumeUrl: 'https://evil.example/phish' }));
    const data = prismaMock.lead.update.mock.calls[0][0].data;
    expect(data.metadata.abandonedCart).not.toHaveProperty('resumeUrl');
    expect(JSON.stringify(data)).not.toContain('evil.example');
  });

  it('returns a byte-identical body whether it scheduled or already nudged', async () => {
    // CWE-204, same reasoning as the /cancel sibling: 'scheduled' vs
    // 'already-nudged' would reveal whether a guessed email already has a
    // nudge for a (public) slug. The old body also echoed the internal leadId.
    const seen = new Set<string>();
    for (const metadata of [
      null,
      {
        abandonedCart: {
          eventSlug: 'brian-41st-birthday',
          nudgeSentAt: '2026-08-01T00:00:00.000Z',
        },
      },
    ]) {
      leadCaptureMock.upsertLead.mockResolvedValue({ id: 'lead-9', metadata });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      seen.add(JSON.stringify(await res.json()));
    }
    expect([...seen]).toEqual(['{"ok":true}']);
  });

  it('throttles a caller hammering it from one address', async () => {
    // Unauthenticated, and every call now runs a fragment-merge scan, so an
    // unthrottled loop is real DB cost. Same IP each time, unlike makeRequest.
    const sameIp = (): NextRequest =>
      new NextRequest('http://localhost/api/v1/events/abandon-nudge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-forwarded-for': '203.0.113.9',
        },
        body: JSON.stringify(validBody),
      });

    const statuses: number[] = [];
    for (let i = 0; i < 20; i += 1) statuses.push((await POST(sameIp())).status);
    expect(statuses).toContain(429);
    // The throttle runs before the body is parsed, so blocked calls cost nothing.
    expect(leadCaptureMock.upsertLead.mock.calls.length).toBeLessThan(20);
  });
});

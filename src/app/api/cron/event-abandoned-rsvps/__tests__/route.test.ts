/**
 * GET /api/cron/event-abandoned-rsvps
 *
 * This cron turns rows written by an UNAUTHENTICATED endpoint into real,
 * domain-authenticated mail, so it is the last place a hostile value can be
 * caught. It used to:
 *   - fail OPEN when CRON_SECRET was unset (public GET that sends mail)
 *   - pass any stored `http`-prefixed resumeUrl straight into the CTA
 *   - text the same content to any phone number, with no opt-in record
 *   - filter status:'PARTIAL', which skipped every genuine RSVPer
 *
 * These tests pin all four. Legacy rows written before the writer was fixed
 * still exist in the DB, so several cases feed the OLD metadata shape
 * (rogue eventTitle + absolute resumeUrl) on purpose.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

const SECRET = 'cron-test-secret';

vi.hoisted(() => {
  // The route captures CRON_SECRET at module load, so it must exist before
  // the import below.
  process.env.CRON_SECRET = 'cron-test-secret';
});

const prismaMock = vi.hoisted(() => ({
  lead: { findMany: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/database/client', () => ({
  prisma: prismaMock,
  kv: {},
  isKVConfigured: () => false,
}));

const emailMock = vi.hoisted(() => ({ sendEmailDetailed: vi.fn() }));
vi.mock('@/lib/email/resend-client', () => emailMock);

// Not imported by the route any more. Kept mocked so the "never texts"
// assertions below fail loudly if someone re-adds the SMS leg.
const ghlMock = vi.hoisted(() => ({ postToCoreLinq: vi.fn() }));
vi.mock('@/lib/webhooks/ghl', () => ghlMock);

import { GET } from '../route';

const ENV_BACKUP = {
  CRON_SECRET: process.env.CRON_SECRET,
  UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
};

function makeRequest(auth: string | null = `Bearer ${SECRET}`): NextRequest {
  return new NextRequest('http://localhost/api/cron/event-abandoned-rsvps', {
    method: 'GET',
    headers: auth ? { authorization: auth } : {},
  });
}

const HOUR = 60 * 60 * 1000;

/** A lead in the OLD metadata shape — rogue title, attacker-chosen link. */
function legacyLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    email: 'sam@example.com',
    phone: '512-555-0134',
    firstName: 'Sam',
    lastName: 'Reyes',
    orderId: null,
    metadata: {
      abandonedCart: {
        eventSlug: 'brian-41st-birthday',
        eventTitle: 'URGENT: verify your account',
        itemCount: 3,
        cartTotal: 128.5,
        resumeUrl: 'https://evil.example/phish',
        nudgeAt: new Date(Date.now() - HOUR).toISOString(),
        nudgeSentAt: null,
        ...(overrides.abandonedCart as object | undefined),
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  process.env.UNSUBSCRIBE_SECRET = 'unsub-test-secret';
  prismaMock.lead.findMany.mockResolvedValue([]);
  prismaMock.lead.update.mockResolvedValue({});
  emailMock.sendEmailDetailed.mockResolvedValue({
    sent: true,
    emailLogId: 'log-1',
    resendId: 'res-1',
  });
});

afterAll(() => {
  process.env.CRON_SECRET = ENV_BACKUP.CRON_SECRET;
  if (ENV_BACKUP.UNSUBSCRIBE_SECRET === undefined) delete process.env.UNSUBSCRIBE_SECRET;
  else process.env.UNSUBSCRIBE_SECRET = ENV_BACKUP.UNSUBSCRIBE_SECRET;
});

describe('auth', () => {
  it('401s without the bearer token', async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
  });

  it('401s on the wrong bearer token', async () => {
    const res = await GET(makeRequest('Bearer nope'));
    expect(res.status).toBe(401);
  });

  it('fails CLOSED when CRON_SECRET is not configured', async () => {
    // The old guard was `if (CRON_SECRET && ...)`, so an unset env var turned
    // a route that sends mail into a public GET.
    vi.resetModules();
    delete process.env.CRON_SECRET;
    const { GET: freshGet } = await import('../route');
    const res = await freshGet(makeRequest(null));
    expect(res.status).toBe(401);
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
    process.env.CRON_SECRET = SECRET;
    vi.resetModules();
  });

  it('503s rather than sending an unsubscribe link that cannot verify', async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
  });
});

describe('candidate selection', () => {
  it('no longer filters on status PARTIAL, and excludes converted leads', async () => {
    // The PARTIAL filter looked like a guard but skipped every genuine
    // RSVPer, since the RSVP form promotes the lead to SUBMITTED.
    await GET(makeRequest());
    const where = prismaMock.lead.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ not: 'CONVERTED' });
    expect(where.orderId).toBeNull();
  });

  it('skips a nudge that has already been sent', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({ abandonedCart: { nudgeSentAt: '2026-08-01T00:00:00.000Z' } }),
    ]);
    const res = await GET(makeRequest());
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
    expect((await res.json()).skipped).toBe(1);
  });

  it('skips a nudge the guest already completed (canceled by the modal)', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({ abandonedCart: { canceledAt: new Date().toISOString() } }),
    ]);
    const res = await GET(makeRequest());
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
    expect((await res.json()).skipped).toBe(1);
  });

  it('skips a nudge that is not due yet', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({
        abandonedCart: { nudgeAt: new Date(Date.now() + HOUR).toISOString() },
      }),
    ]);
    await GET(makeRequest());
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
  });

  it('skips a nudge older than 24h instead of blasting a backlog', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({
        abandonedCart: { nudgeAt: new Date(Date.now() - 48 * HOUR).toISOString() },
      }),
    ]);
    const res = await GET(makeRequest());
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
    expect((await res.json()).skipped).toBe(1);
  });

  it('skips inherited Object.prototype keys posing as a stored slug', async () => {
    // Legacy rows can carry any slug. A bare registry lookup would return
    // Object.prototype.constructor here — truthy, so the skip would not fire
    // and we'd mail "Finish your drink order for undefined".
    for (const slug of ['constructor', 'toString', '__proto__']) {
      vi.clearAllMocks();
      prismaMock.lead.findMany.mockResolvedValue([
        legacyLead({ abandonedCart: { eventSlug: slug } }),
      ]);
      await GET(makeRequest());
      expect(emailMock.sendEmailDetailed, `slug leaked through: ${slug}`).not.toHaveBeenCalled();
    }
  });

  it('skips an event slug that does not resolve, rather than sending a stub', async () => {
    // Previously this sent with "soon" / "the venue" filled in, so a made-up
    // event still produced real mail.
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({ abandonedCart: { eventSlug: 'not-a-real-party' } }),
    ]);
    const res = await GET(makeRequest());
    expect(emailMock.sendEmailDetailed).not.toHaveBeenCalled();
    expect((await res.json()).skipped).toBe(1);
  });
});

describe('outbound content is derived from our own registry', () => {
  beforeEach(() => {
    prismaMock.lead.findMany.mockResolvedValue([legacyLead()]);
  });

  it('ignores a stored foreign resumeUrl and links to our own origin', async () => {
    await GET(makeRequest());
    const sent = emailMock.sendEmailDetailed.mock.calls[0][0];
    expect(sent.html).toContain(
      'href="https://partyondelivery.com/events/brian-41st-birthday"',
    );
    expect(sent.html).not.toContain('evil.example');
    expect(sent.text).not.toContain('evil.example');
    expect(sent.subject).not.toContain('evil.example');
  });

  it('ignores a stored rogue eventTitle and uses the registry title', async () => {
    await GET(makeRequest());
    const sent = emailMock.sendEmailDetailed.mock.calls[0][0];
    expect(sent.subject).toContain("Brian's 41st Birthday Bash");
    expect(sent.subject).not.toContain('URGENT');
    expect(sent.html).not.toContain('URGENT');
  });

  it('coerces a hostile itemCount from the untyped metadata blob', async () => {
    // itemCount is typed as a number and reaches the HTML unescaped, so a
    // string in the JSON blob would be an injection sink.
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({
        abandonedCart: { itemCount: '<script>alert(1)</script>' as unknown as number },
      }),
    ]);
    await GET(makeRequest());
    const sent = emailMock.sendEmailDetailed.mock.calls[0][0];
    expect(sent.html).not.toContain('<script>');
    expect(sent.text).not.toContain('<script>');
  });

  it('drops a non-numeric cartTotal rather than rendering it', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      legacyLead({ abandonedCart: { cartTotal: '99 FREE' as unknown as number } }),
    ]);
    await GET(makeRequest());
    const sent = emailMock.sendEmailDetailed.mock.calls[0][0];
    expect(sent.html).not.toContain('FREE');
    expect(sent.text).not.toContain('FREE');
  });

  it('stamps nudgeSentAt so the row is not picked up again', async () => {
    const res = await GET(makeRequest());
    const meta = prismaMock.lead.update.mock.calls[0][0].data.metadata;
    expect(meta.abandonedCart.nudgeSentAt).toEqual(expect.any(String));
    expect((await res.json()).sent).toBe(1);
  });
});

describe('consent and deliverability', () => {
  beforeEach(() => {
    prismaMock.lead.findMany.mockResolvedValue([legacyLead()]);
  });

  it('never sends an SMS, even though the lead has a phone number', async () => {
    await GET(makeRequest());
    expect(ghlMock.postToCoreLinq).not.toHaveBeenCalled();
    // The GHL webhook leg used a raw fetch (setup.ts stubs global.fetch).
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('respects the suppression list and sends RFC 8058 unsubscribe headers', async () => {
    await GET(makeRequest());
    const sent = emailMock.sendEmailDetailed.mock.calls[0][0];
    expect(sent.respectSuppression).toBe(true);
    expect(sent.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/partyondelivery\.com\/api\/email\/unsubscribe\?/,
    );
    expect(sent.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('renders an unsubscribe link and postal address in the body', async () => {
    await GET(makeRequest());
    const sent = emailMock.sendEmailDetailed.mock.calls[0][0];
    expect(sent.html).toContain('/email/preferences');
    expect(sent.html).toContain('Austin, TX 78752');
    expect(sent.html).not.toContain('Reply STOP');
  });

  it('stamps a suppressed recipient so it is not rescanned every 15 minutes', async () => {
    emailMock.sendEmailDetailed.mockResolvedValue({
      sent: false,
      emailLogId: null,
      resendId: null,
      suppressed: true,
    });
    const res = await GET(makeRequest());
    expect(prismaMock.lead.update).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
  });
});

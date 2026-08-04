/**
 * Throttles for the public routes that email a caller-supplied address.
 *
 * The property that matters: a real visitor's chat flow (POST /chat/submit then
 * POST /quote/start with the same address, seconds apart) must sail through,
 * while someone hammering one victim's address is stopped — including from
 * rotating IPs, which is why the email limit exists at all.
 *
 * KV is a no-op stub outside production, so these exercise the in-memory
 * fallback inside checkRateLimit. That counter is module-level and shared
 * across the sibling routes by design, so every test below uses its own
 * identifier rather than resetting shared state.
 */

import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Force the in-memory path: with KV "configured" the limiter would try to talk
// to a stub that only pretends to store things.
vi.mock('@/lib/database/client', () => ({
  kv: { get: vi.fn(), set: vi.fn() },
  isKVConfigured: () => false,
  prisma: {},
}));

import {
  allowLeadCaptureEmail,
  allowLeadCaptureIp,
  canonicalizeEmail,
  clientIp,
  LEAD_CAPTURE_THROTTLED,
} from '../lead-capture-throttle';

/** A request carrying just the proxy headers the limiter reads. */
function req(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/v1/chat/submit', { method: 'POST', headers });
}

/** Unique per test so the shared module-level counter can't bleed between them. */
let seq = 0;
const uniqueEmail = (): string => `t${++seq}-${Date.now()}@example.com`;
const uniqueIp = (): string => `10.0.${seq}.${++seq}`;

describe('clientIp', () => {
  it('prefers the platform-set header over the one a caller can forge', () => {
    // The whole throttle rests on this. x-forwarded-for is an ordinary request
    // header, so if it won, an attacker would mint a fresh bucket per request
    // by changing one string and the IP limit would be decorative.
    expect(
      clientIp(req({ 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '203.0.113.7' })),
    ).toBe('198.51.100.4');
    expect(
      clientIp(
        req({ 'x-vercel-forwarded-for': '198.51.100.9', 'x-forwarded-for': '203.0.113.7' }),
      ),
    ).toBe('198.51.100.9');
  });

  it('falls back through to x-forwarded-for, then to unknown', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe('203.0.113.7');
    expect(clientIp(req({}))).toBe('unknown');
  });
});

describe('canonicalizeEmail', () => {
  it('strips sub-address tags — one mailbox, one budget', () => {
    // victim+1@, victim+2@ ... all land in victim@. Without this the email
    // limit is bypassed for free, with no proxy pool needed.
    expect(canonicalizeEmail('victim+1@fastmail.com')).toBe('victim@fastmail.com');
    expect(canonicalizeEmail('victim+anything+else@fastmail.com')).toBe('victim@fastmail.com');
  });

  it('collapses dots for Gmail only', () => {
    expect(canonicalizeEmail('vic.tim@gmail.com')).toBe('victim@gmail.com');
    expect(canonicalizeEmail('vic.tim@googlemail.com')).toBe('victim@googlemail.com');
    // Some corporate mail treats dots as significant, so this must NOT be global.
    expect(canonicalizeEmail('vic.tim@company.com')).toBe('vic.tim@company.com');
  });

  it('lower-cases and trims', () => {
    expect(canonicalizeEmail('  Victim@Example.COM ')).toBe('victim@example.com');
  });

  it('leaves malformed input alone rather than throwing', () => {
    expect(canonicalizeEmail('not-an-email')).toBe('not-an-email');
    expect(canonicalizeEmail('@nope.com')).toBe('@nope.com');
    expect(canonicalizeEmail('trailing@')).toBe('trailing@');
  });
});

describe('allowLeadCaptureEmail', () => {
  it('lets a real chat flow through — the same address twice, moments apart', async () => {
    // /chat/submit then /quote/start. If this ever fails, the throttle is
    // breaking the funnel it was meant to protect.
    const email = uniqueEmail();
    expect(await allowLeadCaptureEmail(email)).toBe(true);
    expect(await allowLeadCaptureEmail(email)).toBe(true);
  });

  it('stops a run of sends to one address', async () => {
    const email = uniqueEmail();
    const results: boolean[] = [];
    for (let i = 0; i < 8; i++) results.push(await allowLeadCaptureEmail(email));

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(results.slice(0, 5).every(Boolean)).toBe(true);
    expect(results.slice(5).some(Boolean)).toBe(false);
  });

  it('cannot be bypassed by case, padding, or a +tag', async () => {
    // Otherwise "victim@x.com", "Victim@x.com" and " victim@x.com " are three
    // separate budgets for one inbox.
    const base = uniqueEmail();
    const [localPart, domain] = base.split('@');
    const spellings = [
      base,
      base.toUpperCase(),
      `  ${base}  `,
      `${localPart}+tag@${domain}`, // sub-addressing — same inbox
    ];
    const results: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      results.push(await allowLeadCaptureEmail(spellings[i % spellings.length]));
    }
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it('does not blow up on an empty address — the IP limit still covers it', async () => {
    expect(await allowLeadCaptureEmail('')).toBe(true);
    expect(await allowLeadCaptureEmail('   ')).toBe(true);
  });

  it('keeps separate budgets for different addresses', async () => {
    const a = uniqueEmail();
    const b = uniqueEmail();
    for (let i = 0; i < 5; i++) await allowLeadCaptureEmail(a);
    expect(await allowLeadCaptureEmail(a)).toBe(false);
    expect(await allowLeadCaptureEmail(b)).toBe(true);
  });
});

describe('allowLeadCaptureIp', () => {
  it('absorbs a normal session but stops a flood from one machine', async () => {
    const ip = uniqueIp();
    const results: boolean[] = [];
    for (let i = 0; i < 18; i++) results.push(await allowLeadCaptureIp(req({ 'x-forwarded-for': ip })));

    expect(results.filter(Boolean)).toHaveLength(15);
    expect(results.slice(0, 15).every(Boolean)).toBe(true);
    expect(results.slice(15).some(Boolean)).toBe(false);
  });

  it('is generous enough that a couple of real submissions never trip it', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 3; i++) {
      expect(await allowLeadCaptureIp(req({ 'x-forwarded-for': ip }))).toBe(true);
    }
  });

  it('keeps separate budgets per IP', async () => {
    const a = uniqueIp();
    const b = uniqueIp();
    for (let i = 0; i < 15; i++) await allowLeadCaptureIp(req({ 'x-forwarded-for': a }));
    expect(await allowLeadCaptureIp(req({ 'x-forwarded-for': a }))).toBe(false);
    expect(await allowLeadCaptureIp(req({ 'x-forwarded-for': b }))).toBe(true);
  });
});

describe('the email limit is the one that survives rotating IPs', () => {
  it('blocks a victim being mailed from a fresh IP every time', async () => {
    // The whole point: per-IP alone is defeated by any attacker with a proxy
    // pool, so the address itself has to carry a budget.
    const victim = uniqueEmail();
    const outcomes: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      const ipAllowed = await allowLeadCaptureIp(req({ 'x-forwarded-for': uniqueIp() }));
      expect(ipAllowed).toBe(true); // every request comes from a brand-new IP
      outcomes.push(await allowLeadCaptureEmail(victim));
    }
    expect(outcomes.filter(Boolean)).toHaveLength(5);
  });
});

describe('LEAD_CAPTURE_THROTTLED', () => {
  it('matches the { ok: false } shape these routes already return', () => {
    expect(LEAD_CAPTURE_THROTTLED.ok).toBe(false);
    expect(LEAD_CAPTURE_THROTTLED.error).toBe('rate_limited');
    expect(typeof LEAD_CAPTURE_THROTTLED.message).toBe('string');
  });
});

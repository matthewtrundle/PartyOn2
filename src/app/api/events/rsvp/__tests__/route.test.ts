/**
 * Tests for POST /api/events/rsvp — the one-off event invite RSVP endpoint
 * (e.g. the /dads-gone-wild Father's Day boat party).
 *
 * The load-bearing guarantee: a guest is only ever told "you're confirmed"
 * when we actually persisted a row (response carries an `id`). A honeypot trip
 * must drop silently WITHOUT an `id`, and a bad payload must 400 — neither may
 * write to the DB.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  eventRsvp: { create: vi.fn() },
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { POST } from '../route';

let ipCounter = 0;

/** Build a POST request with a fresh per-test IP so the in-memory rate limiter never bleeds across cases. */
function makeRequest(body: unknown): NextRequest {
  ipCounter += 1;
  return new NextRequest('http://localhost/api/events/rsvp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  event: 'dads-gone-wild',
  name: 'Matt Rundle',
  adults: 2,
  kids: 1,
  dish: 'Queso',
};

beforeEach(() => {
  prismaMock.eventRsvp.create.mockReset();
});

describe('POST /api/events/rsvp', () => {
  it('persists a valid RSVP and returns ok + id', async () => {
    prismaMock.eventRsvp.create.mockResolvedValue({ id: 'rsvp_123' });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, id: 'rsvp_123' });
    expect(prismaMock.eventRsvp.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.eventRsvp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: 'dads-gone-wild',
          name: 'Matt Rundle',
          adults: 2,
          kids: 1,
          dish: 'Queso',
          totalHeads: 3,
        }),
      }),
    );
  });

  it('drops a honeypot submission WITHOUT an id and never writes to the DB', async () => {
    const res = await POST(makeRequest({ ...validBody, hp_event_notes: 'http://spam.example' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // ok:true keeps bots in the dark, but no `id` means the client won't show a
    // "confirmed" card — exactly what protects a real guest from a false confirm.
    expect(json.id).toBeUndefined();
    expect(prismaMock.eventRsvp.create).not.toHaveBeenCalled();
  });

  it('ignores an empty honeypot and still saves', async () => {
    prismaMock.eventRsvp.create.mockResolvedValue({ id: 'rsvp_456' });

    const res = await POST(makeRequest({ ...validBody, hp_event_notes: '' }));
    const json = await res.json();

    expect(json).toEqual({ ok: true, id: 'rsvp_456' });
    expect(prismaMock.eventRsvp.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing name with 400 and does not write', async () => {
    const res = await POST(makeRequest({ ...validBody, name: '' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(prismaMock.eventRsvp.create).not.toHaveBeenCalled();
  });

  it('coerces stringified counts and computes totalHeads', async () => {
    prismaMock.eventRsvp.create.mockResolvedValue({ id: 'rsvp_789' });

    await POST(makeRequest({ ...validBody, adults: '3', kids: '2' }));

    expect(prismaMock.eventRsvp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adults: 3, kids: 2, totalHeads: 5 }),
      }),
    );
  });
});

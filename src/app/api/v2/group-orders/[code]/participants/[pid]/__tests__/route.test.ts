/**
 * PATCH /api/v2/group-orders/[code]/participants/[pid] — name sanitization
 * (security review HIGH-1b, PR #306 follow-up).
 *
 * NOTE ON AUTHORIZATION: this route has no real caller-identity check — the
 * group-order-v2 model has no server-established participant identity (participant
 * ids are public in the dashboard payload), so any body-field "acting id" check is
 * trivially bypassable and would be security theater. That is deliberately NOT
 * done here; the real fix is a per-participant secret token (tracked follow-up).
 * What IS enforced at this layer, and tested below, is that the stored display
 * name is neutralized of control/format-char spoofing before it reaches the
 * dashboard + emails.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  groupParticipantV2: { findUnique: vi.fn(), update: vi.fn() },
  groupOrderV2: { update: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));
// leadCapture (kept real for sanitizeName) transitively imports the prisma
// singleton — stub it so no live client is constructed.
vi.mock('@/lib/database/client', () => ({ prisma: {}, kv: {}, isKVConfigured: () => false }));

const serviceMock = vi.hoisted(() => ({
  getGroupOrderByCode: vi.fn(),
  removeParticipant: vi.fn(),
  isParticipantHost: vi.fn(),
}));
vi.mock('@/lib/group-orders-v2/service', () => serviceMock);

import { PATCH } from '../route';

const GROUP = {
  id: 'group-1',
  participants: [
    { id: 'p-self', isHost: false },
    { id: 'p-host', isHost: true },
  ],
};

function call(body: unknown, pid = 'p-self') {
  const req = new NextRequest(
    `http://localhost/api/v2/group-orders/ABC/participants/${pid}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  return PATCH(req, { params: Promise.resolve({ code: 'ABC', pid }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getGroupOrderByCode.mockResolvedValue(GROUP);
  prismaMock.groupParticipantV2.update.mockResolvedValue({});
  prismaMock.groupOrderV2.update.mockResolvedValue({});
});

describe('PATCH participant — name sanitization', () => {
  it('stores a clean name unchanged', async () => {
    const res = await call({ name: 'Jane Doe' });
    expect(res.status).toBe(200);
    expect(prismaMock.groupParticipantV2.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p-self' }, data: { guestName: 'Jane Doe' } }),
    );
  });

  it('strips control/format chars from the stored name', async () => {
    const res = await call({ name: 'Evil\u202eName' });
    expect(res.status).toBe(200);
    expect(prismaMock.groupParticipantV2.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { guestName: 'Evil Name' } }),
    );
  });

  it('rejects a name that is entirely control/format chars with 400', async () => {
    const res = await call({ name: '\u202e\u200b' });
    expect(res.status).toBe(400);
    expect(prismaMock.groupParticipantV2.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the participant is not in the group', async () => {
    const res = await call({ name: 'X' }, 'p-nonexistent');
    expect(res.status).toBe(404);
    expect(prismaMock.groupParticipantV2.update).not.toHaveBeenCalled();
  });
});

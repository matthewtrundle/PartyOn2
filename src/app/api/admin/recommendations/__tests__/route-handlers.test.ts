/**
 * Integration tests for the unified recommendation [id] handlers.
 *
 * Tests are tightly mocked — they verify wiring (status transitions, log
 * appends, validation) without standing up a real DB.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  recommendationItem: { findUnique: vi.fn(), update: vi.fn() },
  operationsRecommendation: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));

const authMock = vi.hoisted(() => ({ requireOpsAuth: vi.fn() }));
const reconcileMock = vi.hoisted(() => ({ reconcilePackForOrder: vi.fn() }));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth/ops-session', () => ({ requireOpsAuth: authMock.requireOpsAuth }));
vi.mock('@/lib/operations/reconcile-pack', () => ({
  reconcilePackForOrder: reconcileMock.reconcilePackForOrder,
}));

import { POST as executeHandler } from '../[id]/execute/route';
import { POST as snoozeHandler } from '../[id]/snooze/route';
import { POST as dismissHandler } from '../[id]/dismiss/route';

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest('http://x/foo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  Object.values(prismaMock).forEach((m) => {
    if (typeof m === 'object') {
      Object.values(m).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) (fn as { mockReset: () => void }).mockReset();
      });
    } else if (typeof m === 'function' && 'mockReset' in m) {
      (m as { mockReset: () => void }).mockReset();
    }
  });
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) =>
    cb(prismaMock)
  );
  authMock.requireOpsAuth.mockResolvedValue({ id: 'op_1', role: 'admin' });
  reconcileMock.reconcilePackForOrder.mockReset();
});

describe('POST /api/admin/recommendations/[id]/execute', () => {
  it('returns 404 when no rec matches the id', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue(null);
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    const res = await executeHandler(makeRequest(), params('missing'));
    expect(res.status).toBe(404);
  });

  it('navigate happy path: bumps open → approved, returns href + result=navigated', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' }) // findRecommendationLocation
      .mockResolvedValueOnce({
        actionPayload: { kind: 'navigate', label: 'Open receiving', params: { href: '/ops/inventory/receiving/x' } },
      });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockResolvedValue({});
    // appendActionLog issues a $transaction that selects actionLog
    prismaMock.operationsRecommendation.findUnique.mockResolvedValueOnce({ actionLog: [] });

    const res = await executeHandler(makeRequest(), params('o1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.result).toBe('navigated');
    expect(json.href).toBe('/ops/inventory/receiving/x');

    // status transition was open → approved
    const updateCall = prismaMock.operationsRecommendation.update.mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === 'approved'
    );
    expect(updateCall).toBeDefined();
  });

  it('apiCall with an unwired path returns 501 not_implemented and logs the attempt', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' })
      .mockResolvedValueOnce({
        actionPayload: {
          kind: 'apiCall',
          label: 'Apply note',
          params: { path: '/api/v1/inventory/notes/abc/apply', body: {} },
        },
      })
      .mockResolvedValueOnce({ actionLog: [] });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockResolvedValue({});

    const res = await executeHandler(makeRequest(), params('o1'));
    expect(res.status).toBe(501);
    const json = await res.json();
    expect(json.error).toBe('not_implemented');
    expect(json.message).toContain('not implemented');
    expect(json.path).toBe('/api/v1/inventory/notes/abc/apply');
  });

  it('apiCall to reconcile-pack runs the mutation and bumps status open→approved→shipped', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' }) // findRecommendationLocation
      .mockResolvedValueOnce({
        actionPayload: {
          kind: 'apiCall',
          label: 'Reconcile pick → inventory',
          params: {
            path: '/api/admin/operations/recommendations/reconcile-pack',
            body: { orderId: 'ord_42' },
          },
        },
      })
      .mockResolvedValueOnce({ actionLog: [] }); // appendActionLog read
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockResolvedValue({});
    // applyStatusUpdate's open→approved guard re-reads the rec status; mock both reads
    // for the two transitions.
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'open' });
    reconcileMock.reconcilePackForOrder.mockResolvedValue({
      orderId: 'ord_42',
      packedLines: 3,
      alreadyReconciled: 0,
      reconciled: 3,
      skipped: [],
    });

    const res = await executeHandler(makeRequest(), params('o1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.result.reconciled).toBe(3);
    expect(reconcileMock.reconcilePackForOrder).toHaveBeenCalledWith('ord_42');

    // Status got bumped open → approved → shipped via two update calls.
    const statuses = prismaMock.operationsRecommendation.update.mock.calls
      .map((c) => (c[0] as { data: { status?: string } }).data.status)
      .filter((s) => s);
    expect(statuses).toEqual(expect.arrayContaining(['approved', 'shipped']));
  });

  it('apiCall to reconcile-pack returns 400 when orderId is missing', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' })
      .mockResolvedValueOnce({
        actionPayload: {
          kind: 'apiCall',
          params: { path: '/api/admin/operations/recommendations/reconcile-pack', body: {} },
        },
      })
      .mockResolvedValueOnce({ actionLog: [] });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);

    const res = await executeHandler(makeRequest(), params('o1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('bad_request');
    expect(reconcileMock.reconcilePackForOrder).not.toHaveBeenCalled();
  });

  it('rejects execution when status is not open/approved', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'rejected' });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    const res = await executeHandler(makeRequest(), params('o1'));
    expect(res.status).toBe(409);
  });

  it('returns 400 for a marketing rec (no inline action available)', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue(null);
    prismaMock.recommendationItem.findUnique.mockResolvedValue({ status: 'open' });
    const res = await executeHandler(makeRequest(), params('m1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('no_action');
  });
});

describe('POST /api/admin/recommendations/[id]/snooze', () => {
  it('snoozes an ops rec with status=snoozed and snoozeUntil = now + days', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' }) // findRecommendationLocation
      .mockResolvedValueOnce({ actionLog: [] }); // appendActionLog
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockResolvedValue({});

    const before = Date.now();
    const res = await snoozeHandler(makeRequest({ days: 3 }), params('o1'));
    const after = Date.now();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.days).toBe(3);
    const ts = new Date(json.snoozeUntil).getTime();
    expect(ts).toBeGreaterThanOrEqual(before + 3 * 86400 * 1000 - 1000);
    expect(ts).toBeLessThanOrEqual(after + 3 * 86400 * 1000 + 1000);

    const data = prismaMock.operationsRecommendation.update.mock.calls[0][0] as { data: { status: string; snoozeUntil: Date } };
    expect(data.data.status).toBe('snoozed');
    expect(data.data.snoozeUntil).toBeInstanceOf(Date);
  });

  it('defaults to 7 days when days is missing', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' })
      .mockResolvedValueOnce({ actionLog: [] });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockResolvedValue({});

    const res = await snoozeHandler(makeRequest({}), params('o1'));
    const json = await res.json();
    expect(json.days).toBe(7);
  });

  it('returns 409 if the rec is already shipped (invalid transition)', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'shipped' });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockRejectedValue(new Error('should not be called'));

    const res = await snoozeHandler(makeRequest({ days: 7 }), params('o1'));
    expect(res.status).toBe(409);
  });
});

describe('POST /api/admin/recommendations/[id]/dismiss', () => {
  it('rejects an empty reason with 400', async () => {
    const res = await dismissHandler(makeRequest({ reason: '   ' }), params('o1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('reason_required');
  });

  it('persists reason and sets status=rejected on an ops rec', async () => {
    prismaMock.operationsRecommendation.findUnique
      .mockResolvedValueOnce({ status: 'open' })
      .mockResolvedValueOnce({ actionLog: [] });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    prismaMock.operationsRecommendation.update.mockResolvedValue({});

    const res = await dismissHandler(makeRequest({ reason: 'intentional buffer' }), params('o1'));
    expect(res.status).toBe(200);
    const data = prismaMock.operationsRecommendation.update.mock.calls[0][0] as {
      data: { status: string; dismissReason: string };
    };
    expect(data.data.status).toBe('rejected');
    expect(data.data.dismissReason).toBe('intentional buffer');
  });

  it('persists reason into notes on a marketing rec', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue(null);
    prismaMock.recommendationItem.findUnique.mockResolvedValue({ status: 'open' });
    prismaMock.recommendationItem.update.mockResolvedValue({});

    const res = await dismissHandler(makeRequest({ reason: 'duplicate of ADR M0001' }), params('m1'));
    expect(res.status).toBe(200);
    const data = prismaMock.recommendationItem.update.mock.calls[0][0] as {
      data: { status: string; notes: string };
    };
    expect(data.data.status).toBe('rejected');
    expect(data.data.notes).toBe('duplicate of ADR M0001');
  });
});

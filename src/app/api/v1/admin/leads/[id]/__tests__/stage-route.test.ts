/**
 * PATCH /api/v1/admin/leads/[id]/stage — the `via` whitelist.
 *
 * `via` is persisted into the stage.changed LeadEvent, so it is audit
 * provenance. Only the two human-initiated origins may come from a client; the
 * system values must be rejected outright, or a caller could write an audit
 * record claiming a sweep or a payment moved the card.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const pipelineMock = vi.hoisted(() => ({ transitionStage: vi.fn() }));
vi.mock('@/lib/leads/pipeline', () => pipelineMock);

const opsAuthMock = vi.hoisted(() => ({ requireAdminRole: vi.fn() }));
vi.mock('@/lib/auth/ops-session', () => opsAuthMock);

import { PATCH } from '../stage/route';

const LEAD_ID = 'lead-123';
const params = Promise.resolve({ id: LEAD_ID });

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/v1/admin/leads/${LEAD_ID}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  opsAuthMock.requireAdminRole.mockResolvedValue({ role: 'admin', email: 'ops@example.com' });
  pipelineMock.transitionStage.mockResolvedValue({ ok: true, moved: true, lead: { id: LEAD_ID } });
});

describe('stage route — via whitelist', () => {
  it.each(['auto', 'order', 'enroll', 'reopen', 'reply', 'touch'])(
    'rejects the system-origin value %s without touching the pipeline',
    async (via) => {
      const res = await PATCH(makeRequest({ stage: 'LOST', via }), { params });
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({ success: false, error: 'invalid_body' });
      expect(pipelineMock.transitionStage).not.toHaveBeenCalled();
    },
  );

  it('accepts queue and forwards it as the audit origin', async () => {
    const res = await PATCH(makeRequest({ stage: 'LOST', lostReason: 'No response', via: 'queue' }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(pipelineMock.transitionStage).toHaveBeenCalledWith(
      LEAD_ID,
      'LOST',
      expect.objectContaining({ via: 'queue', lostReason: 'No response' }),
    );
  });

  it('defaults to drag when the caller omits via, preserving the board path', async () => {
    await PATCH(makeRequest({ stage: 'CONTACTED' }), { params });
    expect(pipelineMock.transitionStage).toHaveBeenCalledWith(
      LEAD_ID,
      'CONTACTED',
      expect.objectContaining({ via: 'drag' }),
    );
  });

  it('still enforces auth before reading the body', async () => {
    opsAuthMock.requireAdminRole.mockResolvedValue(
      NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }),
    );
    const res = await PATCH(makeRequest({ stage: 'LOST', via: 'queue' }), { params });
    expect(res.status).toBe(401);
    expect(pipelineMock.transitionStage).not.toHaveBeenCalled();
  });

  it('reports a no-op move honestly instead of claiming success', async () => {
    // transitionStage answers ok:true/moved:false on a lost race; the route
    // surfaces that flag so the client can treat it as a failure.
    pipelineMock.transitionStage.mockResolvedValue({
      ok: true,
      moved: false,
      reason: 'concurrent-change',
    });
    const res = await PATCH(makeRequest({ stage: 'LOST', via: 'queue' }), { params });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { moved: false, reason: 'concurrent-change' },
    });
  });
});

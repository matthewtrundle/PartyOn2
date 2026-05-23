import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  operationsRecommendation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import {
  upsertRecommendations,
  markStatus,
  appendActionLog,
  findRecentResolved,
  getActiveByDedupeKey,
} from '../recommendation-store';
import type { OperationsRecommendationInput } from '../types';

function sampleInput(overrides: Partial<OperationsRecommendationInput> = {}): OperationsRecommendationInput {
  return {
    signalKind: 'receiving-lag',
    severity: 'high',
    title: 'Invoice INV-1 stuck',
    evidence: [{ metricName: 'hours_pending', metricValue: 30 }],
    targetEntityType: 'receivingInvoice',
    targetEntityId: 'inv_1',
    actionPayload: { kind: 'navigate', params: { href: '/ops/inventory/receiving/inv_1' } },
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.operationsRecommendation.findUnique.mockReset();
  prismaMock.operationsRecommendation.findFirst.mockReset();
  prismaMock.operationsRecommendation.create.mockReset();
  prismaMock.operationsRecommendation.update.mockReset();
  prismaMock.$transaction.mockReset();
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) =>
    cb(prismaMock)
  );
});

describe('upsertRecommendations', () => {
  it('creates a new rec when no dedupe match exists', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue(null);
    const summary = await upsertRecommendations([sampleInput()]);
    expect(summary).toEqual({ created: 1, updated: 0, skipped: 0, reopened: 0, suppressed: 0 });
    expect(prismaMock.operationsRecommendation.create).toHaveBeenCalledOnce();
    const args = prismaMock.operationsRecommendation.create.mock.calls[0][0] as { data: { dedupeKey: string } };
    expect(args.data.dedupeKey).toBe('receiving-lag:inv_1');
  });

  it('updates an existing open rec (refresh evidence)', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      id: 'rec_1', status: 'open', severity: 'normal',
    });
    const summary = await upsertRecommendations([sampleInput({ severity: 'high' })]);
    expect(summary).toEqual({ created: 0, updated: 1, skipped: 0, reopened: 0, suppressed: 0 });
    const updateArgs = prismaMock.operationsRecommendation.update.mock.calls[0][0] as { data: { severity: string } };
    expect(updateArgs.data.severity).toBe('high'); // bumped up
  });

  it("doesn't lower severity on existing open rec", async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      id: 'rec_1', status: 'open', severity: 'urgent',
    });
    await upsertRecommendations([sampleInput({ severity: 'normal' })]);
    const updateArgs = prismaMock.operationsRecommendation.update.mock.calls[0][0] as { data: { severity: string } };
    expect(updateArgs.data.severity).toBe('urgent'); // preserved
  });

  it('skips a recently-dismissed rec (still within the no-re-emission window)', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      id: 'rec_1',
      status: 'rejected',
      severity: 'high',
      updatedAt: new Date(),
      actionLog: [{ actionKind: 'dismiss', result: 'success' }],
    });
    const summary = await upsertRecommendations([sampleInput()]);
    expect(summary).toEqual({ created: 0, updated: 0, skipped: 1, reopened: 0, suppressed: 0 });
    expect(prismaMock.operationsRecommendation.update).not.toHaveBeenCalled();
  });

  it('re-opens an aged-out single-dismissal rec at knocked-down severity', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      id: 'rec_1',
      status: 'rejected',
      severity: 'urgent',
      updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40d ago
      actionLog: [{ actionKind: 'dismiss', result: 'success' }],
    });
    const summary = await upsertRecommendations([sampleInput({ severity: 'urgent' })]);
    expect(summary).toEqual({ created: 0, updated: 0, skipped: 0, reopened: 1, suppressed: 0 });
    const updateArgs = prismaMock.operationsRecommendation.update.mock.calls[0][0] as {
      data: { status: string; severity: string; dismissReason: string | null; snoozeUntil: Date | null };
    };
    expect(updateArgs.data.status).toBe('open');
    // urgent → high after one dismissal
    expect(updateArgs.data.severity).toBe('high');
    expect(updateArgs.data.dismissReason).toBeNull();
    expect(updateArgs.data.snoozeUntil).toBeNull();
  });

  it('suppresses re-emission once dismissCount crosses the threshold', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      id: 'rec_1',
      status: 'rejected',
      severity: 'normal',
      updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      actionLog: [
        { actionKind: 'dismiss', result: 'success' },
        { actionKind: 'dismiss', result: 'success' },
        { actionKind: 'dismiss', result: 'success' },
      ],
    });
    const summary = await upsertRecommendations([sampleInput({ severity: 'high' })]);
    expect(summary).toEqual({ created: 0, updated: 0, skipped: 0, reopened: 0, suppressed: 1 });
    expect(prismaMock.operationsRecommendation.update).not.toHaveBeenCalled();
  });

  it('respects an active snooze window — skips even when aged out', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      id: 'rec_1',
      status: 'snoozed',
      severity: 'high',
      updatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      snoozeUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5d in the future
      actionLog: [],
    });
    const summary = await upsertRecommendations([sampleInput()]);
    expect(summary.skipped).toBe(1);
    expect(prismaMock.operationsRecommendation.update).not.toHaveBeenCalled();
  });
});

describe('markStatus', () => {
  it('transitions open → approved', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'open' });
    prismaMock.operationsRecommendation.update.mockResolvedValue({ id: 'r', status: 'approved' });
    await markStatus('r', 'approved');
    const args = prismaMock.operationsRecommendation.update.mock.calls[0][0] as { data: { status: string } };
    expect(args.data.status).toBe('approved');
  });

  it('stamps shippedAt on transition to shipped', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'approved' });
    prismaMock.operationsRecommendation.update.mockResolvedValue({ id: 'r' });
    await markStatus('r', 'shipped');
    const args = prismaMock.operationsRecommendation.update.mock.calls[0][0] as { data: { shippedAt?: Date } };
    expect(args.data.shippedAt).toBeInstanceOf(Date);
  });

  it('rejects invalid transitions (shipped → snoozed)', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'shipped' });
    await expect(markStatus('r', 'snoozed')).rejects.toThrow(/Invalid transition/);
  });

  it('clears dismissReason + snoozeUntil on re-open', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'rejected' });
    prismaMock.operationsRecommendation.update.mockResolvedValue({});
    await markStatus('r', 'open');
    const args = prismaMock.operationsRecommendation.update.mock.calls[0][0] as { data: { dismissReason: null; snoozeUntil: null } };
    expect(args.data.dismissReason).toBeNull();
    expect(args.data.snoozeUntil).toBeNull();
  });
});

describe('appendActionLog', () => {
  it('appends atomically inside a transaction', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ actionLog: [] });
    prismaMock.operationsRecommendation.update.mockResolvedValue({});
    await appendActionLog('r', {
      timestamp: '2026-05-13T10:00:00Z',
      actionLabel: 'Reconcile pick → inventory',
      result: 'success',
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    const args = prismaMock.operationsRecommendation.update.mock.calls[0][0] as {
      data: { actionLog: Array<{ actionLabel: string }> };
    };
    expect(args.data.actionLog).toHaveLength(1);
    expect(args.data.actionLog[0].actionLabel).toBe('Reconcile pick → inventory');
  });

  it('preserves prior log entries', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({
      actionLog: [{ timestamp: 't1', actionLabel: 'prior', result: 'success' }],
    });
    prismaMock.operationsRecommendation.update.mockResolvedValue({});
    await appendActionLog('r', { timestamp: 't2', actionLabel: 'next', result: 'error', errorMessage: 'x' });
    const args = prismaMock.operationsRecommendation.update.mock.calls[0][0] as {
      data: { actionLog: Array<{ actionLabel: string }> };
    };
    expect(args.data.actionLog.map((e) => e.actionLabel)).toEqual(['prior', 'next']);
  });
});

describe('findRecentResolved / getActiveByDedupeKey', () => {
  it('findRecentResolved queries snoozed/rejected/invalidated', async () => {
    prismaMock.operationsRecommendation.findFirst.mockResolvedValue(null);
    await findRecentResolved('k', 30);
    const args = prismaMock.operationsRecommendation.findFirst.mock.calls[0][0] as {
      where: { status: { in: string[] } };
    };
    expect(args.where.status.in).toEqual(['snoozed', 'rejected', 'invalidated']);
  });

  it('getActiveByDedupeKey looks up by unique dedupeKey', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ id: 'r' });
    const result = await getActiveByDedupeKey('receiving-lag:inv_1');
    expect(result).toEqual({ id: 'r' });
  });
});

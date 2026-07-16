/**
 * useHeroExperiment — the skip option is a data-integrity invariant: when a
 * page opts out (Brian's test running, /order auto-mode, quiz arrivals), the
 * hook must make NO network calls at all — an assign call records an
 * impression server-side, which would pollute the experiment sample.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHeroExperiment } from '@/hooks/useHeroExperiment';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      experimentId: null,
      variantDbId: null,
      content: null,
      goalMetric: null,
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('useHeroExperiment skip', () => {
  it('skip: true → ready immediately, NO assign fetch, NO impression', async () => {
    const { result } = renderHook(() => useHeroExperiment('/order', { skip: true }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.content).toBeNull();
    expect(result.current.experimentId).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skip omitted → assign fetch fires', async () => {
    const { result } = renderHook(() => useHeroExperiment('/boat-parties'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(fetchMock).toHaveBeenCalled();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/experiments/assign');
    expect(url).toContain('page=%2Fboat-parties');
  });

  it('no active experiment → defaults, and no impression POST', async () => {
    const { result } = renderHook(() => useHeroExperiment('/boat-parties'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.content).toBeNull();
    // Only the assign GET — no POST /api/experiments/track without a variant.
    const posts = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method === 'POST'
    );
    expect(posts).toHaveLength(0);
  });
});

/**
 * Smoke tests for the Server Traffic strip: the fetch wiring, the empty state,
 * and the bot-share math. Chart internals belong to recharts and aren't asserted
 * beyond "it mounts" — jsdom gives ResponsiveContainer no real dimensions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ServerTrafficStrip from '../ServerTrafficStrip';

function mockTraffic(body: unknown): void {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

describe('ServerTrafficStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests the window matching the dashboard period, with the daily series', async () => {
    mockTraffic({
      days: 7,
      data: { days: 7, pageViews: 61, botViews: 38, uniqueVisitors: 9, topPages: [] },
      daily: [{ day: '2026-08-30', human: 61, bot: 38 }],
    });

    render(<ServerTrafficStrip period="7d" />);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/analytics/traffic?days=7&include=daily',
        { cache: 'no-store' }
      )
    );
    expect(await screen.findByText('61')).toBeTruthy();
    // 38 / 99 total → 38%
    expect(screen.getByText('38%')).toBeTruthy();
  });

  it('shows the day-one empty state instead of a wall of zeros', async () => {
    mockTraffic({
      days: 90,
      data: { days: 90, pageViews: 0, botViews: 0, uniqueVisitors: 0, topPages: [] },
      daily: [],
    });

    render(<ServerTrafficStrip period="90d" />);

    expect(await screen.findByText(/No traffic recorded in this window yet/)).toBeTruthy();
  });

  it('lists top pages with their view counts', async () => {
    mockTraffic({
      days: 30,
      data: {
        days: 30,
        pageViews: 10,
        botViews: 2,
        uniqueVisitors: 4,
        topPages: [{ path: '/kegs', views: 6 }],
      },
      daily: [{ day: '2026-08-30', human: 10, bot: 2 }],
    });

    render(<ServerTrafficStrip period="30d" />);

    expect(await screen.findByText('/kegs')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('surfaces the API error instead of rendering zeros as if they were data', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'relation does not exist' }),
    });

    render(<ServerTrafficStrip period="30d" />);

    expect(await screen.findByText('relation does not exist')).toBeTruthy();
  });
});

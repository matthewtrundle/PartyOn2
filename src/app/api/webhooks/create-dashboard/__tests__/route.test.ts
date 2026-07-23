/**
 * Tests for POST /api/webhooks/create-dashboard — the affiliate booking webhook.
 *
 * Security focus (PR #306 MEDIUM follow-up): the affiliate-supplied
 * `customer_name` must be neutralized before it flows into the dashboard
 * title/tab, the stored hostName, and the GHL `dashboard.created` webhook. This
 * path is authenticated per-affiliate, so a compromised affiliate integration is
 * the injection vector. `affiliate-dashboard` (zod schema + name builders) and
 * `sanitizeName` run for real here so the assertions exercise real sanitization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Real prisma is a live PrismaClient — mock the route's DB module.
const prismaMock = vi.hoisted(() => ({
  affiliate: { findUnique: vi.fn() },
  groupOrderV2: { update: vi.fn() },
  affiliateWebhookLog: { create: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));

// leadCapture (kept real for sanitizeName) transitively imports the prisma
// singleton from database/client — stub it so no live client is constructed.
vi.mock('@/lib/database/client', () => ({
  prisma: {},
  kv: {},
  isKVConfigured: () => false,
}));

const createDashboardMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/group-orders-v2/service', () => ({
  createMultiTabDashboardOrder: createDashboardMock,
}));

const notifyDashboardCreatedMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/webhooks/ghl', () => ({
  notifyDashboardCreated: notifyDashboardCreatedMock,
}));

import { POST } from '../route';

function makeRequest(body: unknown, apiKey = 'test-key'): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/create-dashboard', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  customer_name: 'Injected\u202eName', // bidi override (Cf) — display-spoofing vector
  customer_phone: '+15551234567',
  customer_email: 'affiliate-customer@example.com',
  cruise_date: '2026-08-15',
  cruise_start_time: '14:00',
  items_name: 'Private Cruise', // -> normalizeCruiseType('private')
  guest_count: 10,
  booking_id: 'BK-123',
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.affiliate.findUnique.mockResolvedValue({
    id: 'aff-1',
    status: 'ACTIVE',
    webhookApiKey: 'test-key',
    callbackUrl: null, // skips the outbound callback branch (no network)
    callbackApiKey: null,
  });
  prismaMock.groupOrderV2.update.mockResolvedValue({});
  prismaMock.affiliateWebhookLog.create.mockResolvedValue({ id: 'log-1' });
  prismaMock.affiliateWebhookLog.update.mockResolvedValue({});
  createDashboardMock.mockResolvedValue({
    id: 'gov-1',
    shareCode: 'ABC123',
    hostClaimToken: 'claim-tok',
  });
  notifyDashboardCreatedMock.mockResolvedValue(undefined);
});

describe('POST /api/webhooks/create-dashboard — name sanitization', () => {
  it('sanitizes the affiliate name before the dashboard + GHL notify', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    // Dashboard title/tab + stored hostName all carry the sanitized name
    // ('Injected\u202eName' -> the Cf char becomes a space -> 'Injected Name').
    expect(createDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hostName: 'Injected Name',
        dashboardTitle: 'Injected Name Drink Delivery!',
        tabs: expect.arrayContaining([
          expect.objectContaining({ name: 'Injected Name Private Cruise Drink Delivery!' }),
        ]),
      }),
    );

    // GHL dashboard.created webhook gets the sanitized, split name.
    expect(notifyDashboardCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Injected', last_name: 'Name' }),
    );

    // Explicit: the bidi override never leaves for the dashboard or GHL.
    const dashArg = createDashboardMock.mock.calls[0][0];
    const ghlArg = notifyDashboardCreatedMock.mock.calls[0][0];
    expect(dashArg.hostName).not.toContain('\u202e');
    expect(`${ghlArg.first_name}${ghlArg.last_name}`).not.toContain('\u202e');
  });

  it('falls back to "Guest" when the name is entirely control/format chars', async () => {
    // U+202E + U+200B are both format chars; sanitizeName reduces them to null.
    const res = await POST(makeRequest({ ...validBody, customer_name: '\u202e\u200b' }));
    expect(res.status).toBe(200);

    expect(createDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({ hostName: 'Guest', dashboardTitle: 'Guest Drink Delivery!' }),
    );
    expect(notifyDashboardCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Guest', last_name: '' }),
    );
  });
});

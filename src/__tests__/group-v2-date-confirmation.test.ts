/**
 * Delivery-date honesty at creation (wrong-date fix 2026-08-01).
 *
 * Self-serve dashboards used to be born with a silent "+7 days" placeholder
 * that customers unknowingly checked out against. These tests pin the new
 * contract:
 *   - no caller date  → deliveryDate/orderDeadline NULL, confirmed=false
 *   - caller date     → real date (noon UTC), deadline computed, confirmed=true
 *   - updateTab date PATCH remains the customer-facing confirm flip
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGroupFindUnique = vi.fn();
const mockGroupCreate = vi.fn();
const mockGroupUpdate = vi.fn();
const mockSubOrderAggregate = vi.fn();
const mockSubOrderCreate = vi.fn();
const mockSubOrderUpdate = vi.fn();
const mockSubOrderFindMany = vi.fn();
const mockSubOrderFindUnique = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    groupOrderV2: {
      findUnique: (...a: unknown[]) => mockGroupFindUnique(...a),
      create: (...a: unknown[]) => mockGroupCreate(...a),
      update: (...a: unknown[]) => mockGroupUpdate(...a),
    },
    subOrder: {
      aggregate: (...a: unknown[]) => mockSubOrderAggregate(...a),
      create: (...a: unknown[]) => mockSubOrderCreate(...a),
      update: (...a: unknown[]) => mockSubOrderUpdate(...a),
      findMany: (...a: unknown[]) => mockSubOrderFindMany(...a),
      findUnique: (...a: unknown[]) => mockSubOrderFindUnique(...a),
    },
  },
}));

vi.mock('@/lib/leads/dashboard-lead', () => ({
  mirrorDashboardHostLead: vi.fn().mockResolvedValue(undefined),
}));

import {
  createDashboardOrder,
  createMultiTabDashboardOrder,
  createTab,
  updateTab,
} from '@/lib/group-orders-v2/service';

/* eslint-disable @typescript-eslint/no-explicit-any */
function fullTab(over: Record<string, any> = {}) {
  return {
    id: 'tab-1',
    groupOrderId: 'g1',
    name: 'Location 1',
    position: 0,
    status: 'OPEN',
    orderType: null,
    partyType: null,
    deliveryContextType: 'HOUSE',
    deliveryDate: null,
    deliveryDateConfirmed: false,
    deliveryTime: 'TBD',
    deliveryAddress: { address1: '', city: '', province: 'TX', zip: '', country: 'US' },
    deliveryPhone: null,
    deliveryNotes: null,
    orderDeadline: null,
    deliveryFee: 40,
    deliveryFeeWaived: false,
    draftItems: [],
    purchasedItems: [],
    deliveryInvoice: null,
    ...over,
  };
}

function fullGroup(over: Record<string, any> = {}) {
  return {
    id: 'g1',
    name: "Host's Party",
    subtitle: null,
    heroVibeKey: null,
    shareCode: 'ABC123',
    status: 'ACTIVE',
    hostName: 'Host',
    hostEmail: null,
    hostPhone: null,
    partyType: null,
    affiliateId: null,
    affiliate: null,
    source: 'PARTNER_PAGE',
    isLastMinute: false,
    expiresAt: new Date('2026-09-01T00:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    tabs: [fullTab()],
    participants: [
      {
        id: 'p1',
        guestName: 'Host',
        guestEmail: null,
        guestPhone: null,
        isHost: true,
        ageVerified: true,
        status: 'ACTIVE',
        joinedAt: new Date('2026-08-01T00:00:00Z'),
      },
    ],
    ...over,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  vi.clearAllMocks();
  mockGroupFindUnique.mockResolvedValue(null); // share-code collision check
  mockGroupCreate.mockResolvedValue(fullGroup());
  mockGroupUpdate.mockResolvedValue({});
  mockSubOrderAggregate.mockResolvedValue({ _max: { position: 0 } });
  mockSubOrderCreate.mockResolvedValue(fullTab());
  mockSubOrderUpdate.mockResolvedValue(fullTab());
  mockSubOrderFindMany.mockResolvedValue([]);
  mockSubOrderFindUnique.mockResolvedValue(fullTab());
});

describe('createDashboardOrder delivery date', () => {
  it('creates a DATELESS unconfirmed tab when no date is supplied (self-serve)', async () => {
    await createDashboardOrder({ hostName: 'Host', source: 'PARTNER_PAGE' });

    const data = mockGroupCreate.mock.calls[0][0].data;
    expect(data.tabs.create.deliveryDate).toBeNull();
    expect(data.tabs.create.orderDeadline).toBeNull();
    expect(data.tabs.create.deliveryDateConfirmed).toBe(false);
    expect(data.tabs.create.deliveryTime).toBe('TBD');
  });

  it('stores a supplied date at noon UTC, computes the deadline, and confirms it', async () => {
    await createDashboardOrder({
      hostName: 'Host',
      source: 'PARTNER_PAGE',
      deliveryDate: '2026-08-28',
    });

    const data = mockGroupCreate.mock.calls[0][0].data;
    const tab = data.tabs.create;
    expect(tab.deliveryDateConfirmed).toBe(true);
    expect(tab.deliveryDate).toBeInstanceOf(Date);
    expect(tab.deliveryDate.toISOString()).toBe('2026-08-28T12:00:00.000Z');
    expect(tab.orderDeadline).toBeInstanceOf(Date);
    expect(tab.orderDeadline.getTime()).toBeLessThan(tab.deliveryDate.getTime());
  });
});

describe('createTab delivery date', () => {
  it('creates a DATELESS unconfirmed tab when no date is supplied (e.g. the LTYR House Order tab)', async () => {
    await createTab('g1', { name: 'House Order' });

    const data = mockSubOrderCreate.mock.calls[0][0].data;
    expect(data.deliveryDate).toBeNull();
    expect(data.orderDeadline).toBeNull();
    expect(data.deliveryDateConfirmed).toBe(false);
  });

  it('confirms a supplied date', async () => {
    await createTab('g1', { name: 'Second Stop', deliveryDate: '2026-08-15' });

    const data = mockSubOrderCreate.mock.calls[0][0].data;
    expect(data.deliveryDate.toISOString()).toBe('2026-08-15T12:00:00.000Z');
    expect(data.deliveryDateConfirmed).toBe(true);
    expect(data.orderDeadline).toBeInstanceOf(Date);
  });
});

describe('createMultiTabDashboardOrder delivery date', () => {
  it('marks every tab confirmed (webhook cruise dates / portal dates are authoritative)', async () => {
    mockGroupCreate.mockResolvedValue(
      fullGroup({ tabs: [fullTab(), fullTab({ id: 'tab-2', position: 1 })] })
    );

    await createMultiTabDashboardOrder({
      hostName: 'Cruise Host',
      dashboardTitle: 'Cruise Drink Delivery!',
      deliveryDate: '2026-09-16',
      deliveryTime: '10:00 AM - 11:00 AM',
      affiliateId: 'aff-1',
      source: 'WEBHOOK',
      tabs: [{ name: 'Marina Delivery' }, { name: 'Stock-the-House' }],
    });

    const data = mockGroupCreate.mock.calls[0][0].data;
    expect(data.tabs.create).toHaveLength(2);
    for (const tab of data.tabs.create) {
      expect(tab.deliveryDateConfirmed).toBe(true);
      expect(tab.deliveryDate.toISOString()).toBe('2026-09-16T12:00:00.000Z');
    }
  });
});

describe('updateTab delivery date', () => {
  it('a date PATCH sets the date, recomputes the deadline, and flips confirmed=true', async () => {
    await updateTab('tab-1', { deliveryDate: '2026-08-22' });

    const data = mockSubOrderUpdate.mock.calls[0][0].data;
    expect(data.deliveryDate.toISOString()).toBe('2026-08-22T12:00:00.000Z');
    expect(data.deliveryDateConfirmed).toBe(true);
    expect(data.orderDeadline).toBeInstanceOf(Date);
  });

  it('a non-date PATCH leaves the confirmation flag untouched', async () => {
    await updateTab('tab-1', { name: 'Renamed Tab' });

    const data = mockSubOrderUpdate.mock.calls[0][0].data;
    expect(data.deliveryDate).toBeUndefined();
    expect(data.deliveryDateConfirmed).toBeUndefined();
  });

  // Security pin: confirmed means "a human chose this date" and the ONLY way
  // to flip it is to supply a date. A bare confirmed:true (API-only call —
  // any share-code guest can PATCH tabs) must be stripped by validation and
  // ignored by the service, else legacy fake placeholder dates become
  // chargeable and the wrong-date bug returns.
  it('a bare deliveryDateConfirmed:true cannot flip the flag (schema strips it, service ignores it)', async () => {
    const { UpdateTabSchema } = await import('@/lib/group-orders-v2/validation');
    const parsed = UpdateTabSchema.parse({ deliveryDateConfirmed: true });
    expect(parsed).not.toHaveProperty('deliveryDateConfirmed');

    await updateTab('tab-1', { deliveryDateConfirmed: true } as never);
    const data = mockSubOrderUpdate.mock.calls[0][0].data;
    expect(data.deliveryDateConfirmed).toBeUndefined();
  });
});

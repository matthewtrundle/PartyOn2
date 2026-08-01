/**
 * Group Orders V2 - TypeScript Interfaces
 * Tab-based architecture with shared draft carts and individual checkout
 */

import type { Decimal } from '@prisma/client/runtime/library';

// ==========================================
// Enums (matching Prisma)
// ==========================================

export type GroupOrderV2Status = 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
export type SubOrderStatus = 'OPEN' | 'LOCKED' | 'FULFILLED' | 'CANCELLED';
export type GroupV2ParticipantStatus = 'ACTIVE' | 'REMOVED';
export type GroupV2PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
export type PartyType = 'BACHELOR' | 'BACHELORETTE' | 'WEDDING' | 'CORPORATE' | 'HOUSE_PARTY' | 'OTHER' | 'BOAT' | 'BACH';
export type DashboardSource = 'DIRECT' | 'PARTNER_PAGE' | 'INTERNAL' | 'WEBHOOK';
export type DeliveryContextType = 'HOUSE' | 'BOAT' | 'VENUE' | 'HOTEL' | 'OTHER';

// ==========================================
// Base Types
// ==========================================

export interface DeliveryAddressV2 {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  /**
   * When true, this "address" represents in-store pickup at the Party On shop
   * rather than a real delivery destination. Fee is waived and ops/dispatch
   * should not route a driver.
   */
  isPickup?: boolean;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  email?: string;
  isHost: boolean;
}

// ==========================================
// API Response Types (full nested objects)
// ==========================================

export interface GroupOrderV2Full {
  id: string;
  name: string;
  /** Editable subtitle below the H1 in the dashboard WelcomeHero. null = use smart default. */
  subtitle: string | null;
  /** Key into heroVibes catalog. null = use party-type default background. */
  heroVibeKey: string | null;
  shareCode: string;
  status: GroupOrderV2Status;
  hostName: string;
  hostEmail: string | null;
  hostPhone: string | null;
  partyType: PartyType | null;
  affiliateId: string | null;
  affiliate?: { id: string; code: string; businessName: string } | null;
  source: DashboardSource;
  isLastMinute: boolean;
  expiresAt: string;
  createdAt: string;
  tabs: SubOrderFull[];
  participants: ParticipantSummary[];
  timer: TimerInfo;
}

export interface SubOrderFull {
  id: string;
  name: string;
  position: number;
  status: SubOrderStatus;
  orderType: string | null;
  partyType: PartyType | null;
  deliveryContextType: DeliveryContextType;
  /** Null until the customer (or a real-date creation path) sets a date. */
  deliveryDate: string | null;
  deliveryDateConfirmed: boolean;
  deliveryTime: string;
  deliveryAddress: DeliveryAddressV2;
  deliveryPhone: string | null;
  deliveryNotes: string | null;
  orderDeadline: string | null;
  deliveryFee: number;
  deliveryFeeWaived: boolean;
  draftItems: DraftCartItemView[];
  purchasedItems: PurchasedItemView[];
  deliveryInvoice: DeliveryInvoiceView | null;
  totals: TabTotals;
}

export interface DraftCartItemView {
  id: string;
  productId: string;
  variantId: string;
  handle: string;
  title: string;
  variantTitle: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  quantity: number;
  addedBy: ParticipantInfo;
}

export interface PurchasedItemView {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
  purchaser: ParticipantInfo;
  paidAt: string;
}

export interface DeliveryInvoiceView {
  id: string;
  deliveryFee: number;
  discountCode: string | null;
  discountAmount: number;
  total: number;
  status: GroupV2PaymentStatus;
  paidAt: string | null;
}

export interface TabTotals {
  draftSubtotal: number;
  purchasedSubtotal: number;
  deliveryFee: number;
}

export interface ParticipantSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isHost: boolean;
  ageVerified: boolean;
  status: GroupV2ParticipantStatus;
  joinedAt: string;
}

export interface TimerInfo {
  earliestDeadline: string | null;
  earliestDelivery: string | null;
  countdownTarget: string | null;
}

// ==========================================
// Input Types (for create/update)
// ==========================================

export interface CreateGroupOrderV2Input {
  name: string;
  hostName: string;
  hostEmail?: string;
  hostPhone?: string;
  hostCustomerId?: string;
  tabs: CreateTabInput[];
}

export interface CreateTabInput {
  name: string;
  orderType?: string;
  partyType?: PartyType;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: DeliveryAddressV2;
  deliveryPhone?: string;
  deliveryNotes?: string;
}

export interface UpdateTabInput {
  name?: string;
  orderType?: string;
  partyType?: PartyType;
  status?: 'OPEN' | 'LOCKED';
  deliveryDate?: string;
  deliveryDateConfirmed?: boolean;
  deliveryTime?: string;
  deliveryAddress?: DeliveryAddressV2;
  deliveryPhone?: string;
  deliveryNotes?: string;
  deliveryContextType?: DeliveryContextType;
}

export interface JoinGroupOrderInput {
  guestName: string;
  guestEmail?: string;
  ageVerified: boolean;
  customerId?: string;
}

export interface AddDraftItemInput {
  participantId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

export interface UpdateDraftItemInput {
  quantity: number;
}

/**
 * Host's first-touch marketing attribution, forwarded from the client's
 * AttributionTracker localStorage payload when the host creates a dashboard.
 * Persisted on the GroupOrderV2 and later stamped onto every Order created from
 * the group's SubOrder payments. All fields optional/nullable — most groups
 * (partner-page, AI-planner, organic) carry none.
 */
export interface DashboardAttributionInput {
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  /** Ad-platform click ids — no GroupOrderV2 columns; these flow only to the
      host's Lead mirror (metadata.attribution). */
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
}

export interface CreateDashboardInput {
  hostName: string;
  hostEmail?: string;
  hostPhone?: string;
  hostCustomerId?: string;
  partyType?: PartyType;
  source?: DashboardSource;
  affiliateId?: string;
  deliveryContextType?: DeliveryContextType;
  name?: string;
  tabName?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  isLastMinute?: boolean;
  deliveryAddress?: {
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    zip: string;
    country?: string;
  };
  /** Host's first-touch attribution (landingPage + UTMs + referrer). */
  attribution?: DashboardAttributionInput;
}

export interface MultiTabPreset {
  name: string;
  deliveryAddress?: string;
  deliveryContextType?: DeliveryContextType;
  deliveryTime?: string;
}

export interface CreateMultiTabDashboardInput {
  hostName: string;
  hostEmail?: string;
  hostPhone?: string;
  dashboardTitle: string;
  deliveryDate: string;
  deliveryTime: string;
  partyType?: PartyType;
  affiliateId: string;
  source?: DashboardSource;
  tabs: MultiTabPreset[];
}

// ==========================================
// Promo / Discount
// ==========================================

export interface FreeProductInfo {
  productId: string;
  variantId: string;
  name: string;
  quantity: number;
}

export interface AppliedPromo {
  type: 'discount' | 'affiliate';
  code: string;
  label: string;
  discountAmount: number;
  freeDelivery: boolean;
  affiliateId?: string;
  freeProducts?: FreeProductInfo[];
  minOrderAmount?: number;
}

// ==========================================
// Helpers
// ==========================================

/** Convert Prisma Decimal to number */
export function toNumber(val: Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === 'number' ? val : Number(val);
}

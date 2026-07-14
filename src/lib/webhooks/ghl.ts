/**
 * Go High Level (GHL) Webhook — New Order Notifications
 *
 * Fire-and-forget: logs errors, never throws.
 * No-ops silently when GHL_ORDER_WEBHOOK_URL is not set.
 */

const GHL_WEBHOOK_URL = process.env.GHL_ORDER_WEBHOOK_URL;
const GHL_REVIEW_WEBHOOK_URL = process.env.GHL_REVIEW_WEBHOOK_URL;
const GHL_DASHBOARD_WEBHOOK_URL = process.env.GHL_DASHBOARD_WEBHOOK_URL;
const GHL_NEWSLETTER_WEBHOOK_URL = process.env.GHL_NEWSLETTER_WEBHOOK_URL;
const GHL_CONCIERGE_LEAD_WEBHOOK_URL = process.env.GHL_CONCIERGE_LEAD_WEBHOOK_URL;
const CORELINQ_INGEST_URL = process.env.CORELINQ_INGEST_URL;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface GhlOrderPayload {
  event: 'order.created';
  orderNumber: number;
  orderType: string;
  orderUrl: string;
  // GHL-standard contact fields (used by Create Contact action)
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  // Legacy fields (kept for backwards compat with existing workflows)
  customerName: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  itemsSummary: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  deliveryType: string;
  /** True when the customer chose in-store pickup instead of delivery */
  isPickup: boolean;
  deliveryInstructions: string;
  createdAt: string;
  // Dashboard link for orders placed under a GroupOrderV2 (Premier cruise,
  // partner-page dashboard, etc.). Empty string when the order has no group.
  dashboard_url: string;
  share_code: string;
}

/** Shape accepted by buildGhlPayload — matches OrderWithItems and raw Prisma orders */
interface OrderLike {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  items: Array<{
    title: string;
    variantTitle: string | null;
    quantity: number;
    price: { toString(): string } | number;
  }>;
  subtotal: { toString(): string } | number;
  taxAmount: { toString(): string } | number;
  deliveryFee: { toString(): string } | number;
  discountAmount: { toString(): string } | number;
  total: { toString(): string } | number;
  deliveryDate: Date;
  deliveryTime: string;
  deliveryAddress: Record<string, string> | unknown;
  deliveryType?: string;
  deliveryInstructions: string | null;
  createdAt: Date;
  // Optional GroupOrderV2 link — when present, populates dashboard_url so the
  // GHL SMS workflow can include the dashboard link in its template.
  groupOrderV2Id?: string | null;
  groupOrderV2?: { shareCode: string } | null;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatAddress(addr: Record<string, string> | null | undefined): string {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.address1) parts.push(addr.address1);
  if (addr.address2) parts.push(addr.address2);
  if (addr.city) parts.push(addr.city);
  const stateZip = [addr.province, addr.zip].filter(Boolean).join(' ');
  if (stateZip) parts.push(stateZip);
  return parts.join(', ');
}

function buildItemsSummary(
  items: Array<{ title: string; variantTitle: string | null; quantity: number; price: { toString(): string } | number }>
): string {
  return items
    .map((item) => {
      const name =
        item.variantTitle && item.variantTitle !== 'Default Title'
          ? `${item.title} - ${item.variantTitle}`
          : item.title;
      return `${item.quantity}x ${name} ($${Number(item.price).toFixed(2)})`;
    })
    .join(', ');
}

// ──────────────────────────────────────────────
// CoreLinq CRM fan-out (GHL → CoreLinq migration)
// ──────────────────────────────────────────────

/**
 * POST the same event to the CoreLinq CRM ingest route when
 * CORELINQ_INGEST_URL is set. During the shadow-mode parallel run both GHL
 * and CoreLinq receive every event; after cutover the GHL URLs are unset and
 * only this fires. The payload must carry an `event` discriminator — the
 * ingest route switches on it.
 *
 * Fire-and-forget: logs errors, never throws. No-ops silently when
 * CORELINQ_INGEST_URL is not set.
 */
export async function postToCoreLinq<T extends { event: string }>(
  payload: T
): Promise<void> {
  if (!CORELINQ_INGEST_URL) return;

  try {
    const res = await fetch(CORELINQ_INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // These fan-outs are AWAITED on customer form-submit paths (Vercel
      // freezes un-awaited work) — a slow/down CRM must not hold the
      // customer's response hostage.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.error('[CoreLinq Ingest] Failed:', payload.event, res.status, await res.text());
    }
  } catch (err) {
    console.error('[CoreLinq Ingest] Error:', payload.event, err);
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Build a flat GHL webhook payload from an order object.
 */
export function buildGhlPayload(order: OrderLike, orderType: string): GhlOrderPayload {
  const addr = (order.deliveryAddress ?? {}) as Record<string, string> & { isPickup?: boolean };
  const isPickup = addr.isPickup === true;
  const nameParts = order.customerName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const shareCode = order.groupOrderV2?.shareCode || '';
  const dashboardUrl = shareCode
    ? `https://partyondelivery.com/dashboard/${shareCode}`
    : '';

  return {
    event: 'order.created',
    orderNumber: order.orderNumber,
    orderType,
    orderUrl: `https://partyondelivery.com/ops/orders/${order.id}`,
    // GHL-standard contact fields
    first_name: firstName,
    last_name: lastName,
    email: order.customerEmail,
    phone: order.customerPhone || '',
    // Legacy fields
    customerName: order.customerName,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone || '',
    itemsSummary: buildItemsSummary(order.items),
    subtotal: Number(order.subtotal),
    tax: Number(order.taxAmount),
    deliveryFee: Number(order.deliveryFee),
    discount: Number(order.discountAmount),
    total: Number(order.total),
    deliveryDate: order.deliveryDate.toISOString().split('T')[0],
    deliveryTime: order.deliveryTime,
    deliveryAddress: formatAddress(addr),
    deliveryType: isPickup ? 'PICKUP' : (order.deliveryType || 'HOUSE'),
    isPickup,
    deliveryInstructions: order.deliveryInstructions || '',
    createdAt: order.createdAt.toISOString(),
    dashboard_url: dashboardUrl,
    share_code: shareCode,
  };
}

/**
 * POST order data to the GHL inbound webhook.
 * Fire-and-forget: logs errors, never throws.
 */
export interface GhlReviewPayload {
  event: 'review.request';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  orderNumber: number;
  orderUrl: string;
  deliveryDate: string;
}

export async function notifyNewOrder(payload: GhlOrderPayload): Promise<void> {
  await postToCoreLinq(payload);
  if (!GHL_WEBHOOK_URL) return;

  try {
    const res = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[GHL Webhook] Failed:', res.status, await res.text());
    } else {
      console.log('[GHL Webhook] Order notification sent:', payload.orderNumber);
    }
  } catch (err) {
    console.error('[GHL Webhook] Error:', err);
  }
}

/**
 * POST review request data to the GHL review webhook.
 * Fire-and-forget: logs errors, never throws.
 */
export async function sendReviewRequest(payload: GhlReviewPayload): Promise<void> {
  await postToCoreLinq(payload);
  if (!GHL_REVIEW_WEBHOOK_URL) return;

  try {
    const res = await fetch(GHL_REVIEW_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[GHL Review Webhook] Failed:', res.status, await res.text());
    } else {
      console.log('[GHL Review Webhook] Review request sent for order:', payload.orderNumber);
    }
  } catch (err) {
    console.error('[GHL Review Webhook] Error:', err);
  }
}

// ──────────────────────────────────────────────
// Dashboard Created Notification
// ──────────────────────────────────────────────

export interface GhlDashboardPayload {
  event: 'dashboard.created';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dashboard_url: string;
  host_claim_url: string;
  cruise_date: string;
  cruise_type: string;
  booking_id: string;
}

/**
 * POST dashboard data to the GHL dashboard webhook.
 * Fire-and-forget: logs errors, never throws.
 */
export async function notifyDashboardCreated(payload: GhlDashboardPayload): Promise<void> {
  await postToCoreLinq(payload);
  if (!GHL_DASHBOARD_WEBHOOK_URL) return;

  try {
    const res = await fetch(GHL_DASHBOARD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[GHL Dashboard Webhook] Failed:', res.status, await res.text());
    } else {
      console.log('[GHL Dashboard Webhook] Dashboard notification sent:', payload.dashboard_url);
    }
  } catch (err) {
    console.error('[GHL Dashboard Webhook] Error:', err);
  }
}

// ──────────────────────────────────────────────
// Newsletter Subscription (double opt-in confirmed)
// ──────────────────────────────────────────────

export interface GhlNewsletterPayload {
  event: 'newsletter.subscribed';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** The GHL tag the receiving workflow should apply. */
  tag: 'newsletter';
  /** Which form the signup came from (footer, blog, …). */
  source: string;
  confirmedAt: string;
}

/**
 * POST a confirmed newsletter subscriber to the GHL newsletter webhook so the
 * receiving GHL workflow can create/update the contact and apply the
 * `newsletter` tag (matching the existing imported newsletter segment).
 *
 * Fire-and-forget: logs errors, never throws. No-ops silently when
 * GHL_NEWSLETTER_WEBHOOK_URL is not set — so this is inert until Allan creates
 * the GHL inbound webhook/workflow and sets the env var.
 */
export async function notifyNewsletterSignup(payload: GhlNewsletterPayload): Promise<void> {
  await postToCoreLinq(payload);
  if (!GHL_NEWSLETTER_WEBHOOK_URL) return;

  try {
    const res = await fetch(GHL_NEWSLETTER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[GHL Newsletter Webhook] Failed:', res.status, await res.text());
    } else {
      console.log('[GHL Newsletter Webhook] Subscriber synced:', payload.email);
    }
  } catch (err) {
    console.error('[GHL Newsletter Webhook] Error:', err);
  }
}

// ──────────────────────────────────────────────
// Premier Concierge — bachelor / weekend planning lead
// ──────────────────────────────────────────────

export interface GhlConciergeLeadPayload {
  event: 'concierge.lead';
  /** GHL-standard contact fields */
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** Structured questionnaire answers so the receiving workflow can
   *  route to the right pipeline stage. */
  source: string;                  // e.g. 'premier-concierge-bachelor'
  partyType: string;               // 'bachelor' | 'bachelorette' | 'weekend' | ...
  headcount: number;
  arrivalDate: string;             // ISO YYYY-MM-DD
  departureDate: string;
  budgetPerPerson: string;         // '$400' etc.
  activities: string[];            // ['drink-delivery', 'boat', 'atv', ...]
  notes: string;
  /** Array of tags the receiving GHL workflow should apply to the
   *  contact. Everything after 'premier-concierge' + 'bachelor-party'
   *  is dynamic based on the questionnaire (activity tags, budget tag,
   *  headcount bucket, etc.). */
  tags: string[];
  /** Deep link back to the Lead row in Brian's Stuff. */
  leadUrl: string;
  submittedAt: string;
}

/**
 * POST a Premier Concierge lead to the GHL concierge webhook so the
 * receiving GHL workflow can create/update the contact and apply the
 * appropriate tags for pipeline routing.
 *
 * Fire-and-forget: logs errors, never throws. No-ops silently when
 * GHL_CONCIERGE_LEAD_WEBHOOK_URL is not set — so this is inert until
 * the founder creates the GHL inbound webhook/workflow and sets the
 * env var. In the meantime the CoreLinq mirror still fires.
 */
export async function notifyConciergeLead(payload: GhlConciergeLeadPayload): Promise<void> {
  await postToCoreLinq(payload);
  if (!GHL_CONCIERGE_LEAD_WEBHOOK_URL) return;

  try {
    const res = await fetch(GHL_CONCIERGE_LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[GHL Concierge Webhook] Failed:', res.status, await res.text());
    } else {
      // Log the lead deep-link, not the email — customer PII stays out
      // of INFO-level production logs (project rule).
      console.log('[GHL Concierge Webhook] Lead synced:', payload.leadUrl);
    }
  } catch (err) {
    console.error('[GHL Concierge Webhook] Error:', err);
  }
}

// ──────────────────────────────────────────────
// Lead Flow board — CRM lead mirror
// ──────────────────────────────────────────────

export interface CoreLinqLeadCapturedPayload {
  event: 'lead.captured';
  /** Neon Lead.id — the fork's ingest upserts idempotently on this (the
   *  submit routes fire on every re-submit and upsertLead reuses rows). */
  leadId: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** Which surface captured it: 'party-chat' | 'premier-concierge' |
   *  'event-quiz' | 'contact-form' | 'quote' | 'quickbuy:<occasion>'. */
  source: string;
  sourcePage: string;
  occasion: string;
  eventDate: string;         // ISO YYYY-MM-DD or ''
  headcount: number | null;
  budgetPerPerson: string;
  /** Board state at capture time (score may still be null pre-cron). */
  score: number | null;
  temperature: string;       // 'hot' | 'warm' | 'cold' | ''
  pipelineStage: string;     // usually 'NEW'
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  /** Deep link to the Lead Flow board card. */
  leadUrl: string;
  capturedAt: string;
}

/**
 * Mirror a captured lead to the CoreLinq CRM (no GHL leg — GHL already
 * receives the concierge/newsletter events it cares about). Inert until
 * CORELINQ_INGEST_URL is set, which must not happen before the fork's
 * ingest accepts 'lead.captured' (else every submit logs a 400).
 *
 * Called AWAITED from the six submit routes only — never from the
 * field-blur pixel route (that fires on every keystroke).
 */
export async function notifyLeadCaptured(payload: CoreLinqLeadCapturedPayload): Promise<void> {
  await postToCoreLinq(payload);
}

---
title: Customer Journey
project: PartyOn2
doc_type: codebase-reference
section: journey
last_generated: 2026-05-20
tags: [partyondelivery, codebase, journey, conversion]
---

# Customer Journey

End-to-end funnels traced with route + file references. For the full route inventory see [[03-routes-and-pages]].

## Journey A — Discovery & browse

**Trigger**: user arrives from organic search, paid ad, partner referral (`?ref=CODE`), or direct.

1. Landing — homepage `/` (`src/app/page.tsx`) or a targeted funnel (e.g. `/weddings`, `/bach-parties`, `/boat-parties`, `/corporate`, `/kegs`, `/cocktail-kits`, `/rentals`).
2. Middleware (`src/middleware.ts`) enforces apex domain and, if `?ref=CODE` is present, sets a 30-day httpOnly `ref_code` cookie for affiliate attribution.
3. User clicks "Shop" / "Order" CTA → `/order` (`src/app/order/page.tsx`). The declared redirect `/products` → `/order` (in `next.config.ts`) ensures legacy links land correctly.
4. `/order` fetches products via `/api/v1/products` (and `/api/products/counts` for category badges via `useCollectionCounts`).
5. Category deep links route to `/order` with filters; SEO neighborhood pages live at `/delivery/[location]` and `/areas/*`.

**Success**: user adds a product to cart (see Journey B).
**Failure / edge**:
- Age-verification modal (`src/components/AgeVerificationModal.tsx`) blocks under-21 users; attestation stored via `/api/v1/auth/age-verify`.
- Outside delivery zone → `DeliveryScheduler`/address gate refuses; zone lookup lives in `src/lib/delivery/rates.ts` (hardcoded TS table).
- No products returned → `/order` shows empty state; `/search` layout available for search UIs.

## Journey B — Product selection & cart

**Trigger**: user on `/order`, `/products/[handle]`, a funnel page, or a partner landing.

1. Product view — either inline cards on `/order` or detail page `/products/[handle]` (`src/app/products/[handle]/page.tsx`), loaded via `/api/products/[handle]` or `/api/v1/products/[id]`.
2. Add-to-cart → `CartContext` (`src/contexts/CartContext.tsx`) mutates state and persists to localStorage; server-side cart mirroring via `/api/v1/cart`.
3. Optional: shareable cart via `/api/cart/share` and viewed at `/cart/shared/[id]` (`src/app/cart/shared/[id]/page.tsx`).
4. Scheduling — `DeliveryScheduler` / `SimpleDeliveryScheduler` sets address + slot; delivery fee computed from the hardcoded zone table in `src/lib/delivery/rates.ts` and applied via `/api/v1/cart/delivery`.
5. Discounts — code entered and validated via `/api/v1/cart/discount` (server-side check against `Discount` + `AutomaticDiscount`).
6. Upsell / AI — `/api/chat` and `AIConcierge.tsx` optionally surface recommendations.

**Success**: cart totals computed, user clicks "Checkout".
**Failure / edge**:
- Invalid promo → `Discount.isActive` / usage caps returned as error.
- Inventory low → `/api/v1/products/[id]/inventory` flag displayed.
- Cart expired (TTL) → `Cart.status` transitions to `ABANDONED`.

## Journey C — Checkout & payment

**Trigger**: "Checkout" from cart.

1. `/checkout` (`src/app/checkout/page.tsx`) requires age-verification cookie. `AgeVerificationModal` is blocking.
2. `/api/v1/checkout` (`src/app/api/v1/checkout/route.ts`) creates a Stripe Checkout Session using `src/lib/stripe/`. The cart snapshot includes items, delivery fee, tax (`src/lib/tax/rates.ts` — hardcoded TS table), and discounts.
3. User redirects to Stripe-hosted checkout → pays with live card (test cards are forbidden per CLAUDE.md).
4. On success Stripe redirects to `/checkout/success` (`src/app/checkout/success/page.tsx`) **and** fires a `checkout.session.completed` event.
5. `/api/webhooks/stripe` (`src/app/api/webhooks/stripe/route.ts`) verifies signature, idempotently persists via `WebhookEvent`, materializes `Order` + `OrderItem` (via `src/lib/inventory/services/order-service.ts`), decrements inventory, and enqueues Resend emails (order confirmation template under `src/lib/email/templates/`).
6. If `ref_code` cookie is set, commission row is written (`AffiliateCommission`) pending monthly payout.

**Success**: `Order.status = CONFIRMED`, confirmation email delivered, GHL SMS webhook fires (`src/lib/webhooks/ghl.ts`).
**Failure / edge**:
- Payment declined → user stays on Stripe; no `Order` row.
- Webhook lost → `/api/cron/reconcile-orders` (every 15 min) compares Stripe sessions to `Order` rows and reconciles.
- Duplicate webhook → `WebhookEvent` uniqueness blocks reprocessing.

## Journey D — Group order (host + guests)

**Trigger**: host clicks "Create group order" (e.g. from `/group/create` or a partner CTA), OR an affiliate/partner spins up a dashboard at `/affiliate/dashboard/create-dashboard`.

1. Host creates group — `POST /api/v2/group-orders` (`src/app/api/v2/group-orders/route.ts`) → new `GroupOrderV2` + one or more `SubOrder` tabs.
2. Share — host receives `/group/[code]` or `/dashboard/[code]`. Send-link route `/api/v2/group-orders/[code]/send-link` emails/SMSes the URL.
3. Guest joins — `/group/[code]` (`src/app/group/[code]/page.tsx`) → `POST /api/v2/group-orders/[code]/join` creates `GroupParticipantV2` + `DraftCartItem`s.
4. Each guest adds items — `POST /api/v2/group-orders/[code]/tabs/[tabId]/items`; edit via `[itemId]` route.
5. Age verify — same `AgeVerificationModal` flow.
6. Host chooses a fulfilment path:
   - **Split-pay**: each participant pays their own tab via `POST .../tabs/[tabId]/checkout` → participant `Stripe` session.
   - **Host-pays-all**: `POST .../tabs/[tabId]/checkout-all` → single session combining all tabs.
   - **Delivery invoice**: host can generate a split delivery invoice (`.../delivery-invoice`) collected through `GroupDeliveryInvoice`.
7. Stripe webhook flows as in Journey C but materializes into `SubOrder` / `PurchasedItem` / `ParticipantPayment`.
8. Post-checkout: `/group/checkout/success` or `/dashboard/[code]/success`.

**Success**: `SubOrder.status = PAID`, delivery scheduled.
**Failure / edge**:
- Participant abandons → `GroupV2ParticipantStatus = INVITED/ACTIVE`.
- Host transfer — `POST .../transfer-host`.
- Lock — legacy v1 also has `.../lock-order` to freeze edits.

## Journey E — Invoice / draft order (ops-initiated)

**Trigger**: ops staff creates a quote for a customer (e.g. corporate event).

1. Ops staff → `/ops/orders/create` (`src/app/ops/orders/create/page.tsx`) → `POST /api/v1/admin/draft-orders` creates `DraftOrder` + `DraftCartItem`s.
2. `.../draft-orders/[id]/send` emails the customer a link to `/invoice/[token]` (`src/app/invoice/[token]/page.tsx`).
3. Customer views + optionally edits qty via `PATCH /api/v1/invoice/[token]/items`, applies discount via `.../discount`.
4. Pays via `POST /api/v1/invoice/[token]/checkout` → Stripe Checkout Session.
5. Stripe webhook converts `DraftOrder` to `Order`.

**Success**: `DraftOrder.status = PAID`, `Order` created.
**Failure / edge**:
- Token tampering → server-side token match.
- Expired — `DraftOrder.status = EXPIRED` blocks checkout.

## Journey F — Post-purchase

1. Confirmation email from Resend (`src/lib/email/templates/`); events logged in `EmailLog` via `/api/webhooks/resend`.
2. SMS via GoHighLevel webhook (`src/lib/webhooks/ghl.ts`).
3. Customer can track order at `/account/orders` or look up by number at `/api/orders/[orderNumber]`.
4. Boat-schedule customers can see their match at `/premier-boat-schedule` or via `/api/public/boat-schedule/order/[orderNumber]`.
5. Delivery confirmation — ops marks `Fulfillment.status = DELIVERED` from `/ops/orders/[id]`.
6. Review request — `/api/v1/admin/orders/send-review-requests` can trigger review asks.
7. Refund / amendment — `/api/v1/admin/orders/[id]/refund` or `/amend` writes `Refund` / `OrderAmendment`.

## Journey H — Landing-page lead capture & embedded checkout _(added 2026-05)_

**Trigger**: paid-ad or organic visit to one of the `/austin-*-delivery` landing pages (`bachelor`, `bachelorette`, `corporate`, `wedding-weekend`).

1. Visitor pixel fires — `src/components/VisitorPixel.tsx` POSTs `/api/v1/landing/visitor-pixel`. First hit sets the `pod_vsid` cookie + creates `VisitorSession`; subsequent hits bump counters. A `LeadEvent(PAGE_VIEW)` is written.
2. Visitor interacts with one of three modals (Quick-Buy, Package-Builder, A-la-carte). Every form field fires `/api/v1/landing/lead-event` on blur — the first time email/phone/name is captured, a `Lead` row is upserted and linked back to the session. `Lead.status` goes `ANONYMOUS → PARTIAL`.
3. Pre-checkout upsell overlay shows a real-product grid. The variant arrangement is randomized + stamped on the `DraftOrder` as `upsellVariantId`; per-item attribution is `viaUpsell: true` in the items JSON.
4. Embedded Stripe checkout runs inline via `@stripe/react-stripe-js` (no redirect). On success the modal advances; on failure the page falls back to a hosted checkout URL.
5. Stripe webhook materializes the order as in Journey C; the `Lead` row picks up `orderId` and transitions to `CONVERTED`.

**Success**: `Lead.status = CONVERTED`, `Order.upsellVariantId` informs the `/admin/brians-stuff?tab=upsell` A/B tracker.
**Failure / edge**:
- Visitor never identifies → session stays `ANONYMOUS`. Abandoned-cart nudge `/api/cron/event-abandoned-rsvps` (15-min cron) emails partial leads.
- Stripe.js fails to load → graceful fallback to standard `/checkout` redirect (commit `d20b8b3f`).

## Journey I — Cart sharing _(added 2026-05)_

**Trigger**: user clicks "Share my cart".

1. Client POSTs `/api/cart/share` with cart payload → creates a `CartShareLink` row with random 7-char `slug`. Response includes the short URL `/s/<slug>`.
2. Recipient hits `/s/<slug>` → `src/app/s/[slug]/route.ts` looks up the slug, increments `viewCount`, 302-redirects to `/cart/shared?c=…&t=…`.
3. `/cart/shared` parses the payload and lets the recipient claim or modify the cart.

## Journey G — Account (returning customer)

1. Login — `/affiliate/login` for partners, or customer login (component `CustomerAuth.tsx` posting to `/api/v1/auth/login`) for shoppers.
2. `CustomerContext` rehydrates from JWT via `/api/v1/auth/me`.
3. `/account` entry, with subpages `/orders`, `/addresses`, `/group-orders`, `/preferences`.
4. Re-order from `/account/orders` repopulates cart (client-side copy into `CartContext`).
5. _Loyalty points/redeem flow was previously planned but removed 2026-04-23 before launch — no customer-facing loyalty integration exists._

## Conversion-critical touchpoints

| Touchpoint | File / Route | Why it matters |
|---|---|---|
| Age-verification modal | `src/components/AgeVerificationModal.tsx` + `/api/v1/auth/age-verify` | Regulatory blocker on every checkout. |
| `/order` rendering | `src/app/order/page.tsx` + `/api/v1/products` | Primary catalog — any error collapses the funnel. |
| Add-to-cart | `CartContext` + `/api/v1/cart` | Cart mutation must be optimistic + survive reload. |
| Delivery zone check | `src/lib/delivery/rates.ts` (hardcoded TS table) | Wrong zone = wrong fee or blocked checkout. |
| Stripe checkout session | `/api/v1/checkout` + `src/lib/stripe/` | Live keys — every failure is real money. |
| Stripe webhook → order | `/api/webhooks/stripe` + `src/lib/inventory/services/order-service.ts` | Only path that creates `Order` from payment; idempotency via `WebhookEvent`. |
| Reconcile cron | `/api/cron/reconcile-orders` | Safety net when the webhook is delayed/lost. |
| Group-order join | `/api/v2/group-orders/[code]/join` | Entry point for every participant. |
| Invoice checkout | `/api/v1/invoice/[token]/checkout` | Only path for ops-quoted sales. |
| Affiliate attribution | `src/middleware.ts` (`ref_code` cookie) + `AffiliateCommission` | Commission accuracy hinges on this 30-day cookie. |
| Confirmation email | Resend template under `src/lib/email/templates/` + `EmailLog` | First post-purchase reassurance. |

## See also

- [[INDEX]]
- [[01-overview]]
- [[02-tech-stack-and-architecture]]
- [[03-routes-and-pages]]
- [[05-data-model]]
- [[06-admin-features]]

---
title: Business Overview
project: PartyOn2
doc_type: codebase-reference
section: overview
last_generated: 2026-08-03
tags: [partyondelivery, codebase, overview, business]
---

# Business Overview

## What PartyOn Delivery is

PartyOn Delivery is a premium on-demand alcohol and party-goods delivery service operating in Austin, Texas (austinpartyondelivery.com / partyondelivery.com). The product surface covers retail liquor, wine and beer delivery, pre-built cocktail kits, keg service, curated party packages (boat parties, bachelor / bachelorette weekends, weddings, corporate events), and rentals of event items such as chairs, coolers and cocktail tables.

The site is built as a hybrid of a marketing site, an e-commerce storefront, and a set of collaborative order dashboards. Visitors can either self-serve through the standard `/order` catalog, or go through curated landing pages for their use case (weddings, bach parties, boat parties, corporate, BYOB venues, delivery-area pages). A distinctive second flow is the **Universal Order Dashboard** — a shareable, code-addressable ordering surface at `/dashboard/[code]` where a host, a partner, or an affiliate can curate a cart that guests join, add to, and pay for individually or as one invoice.

Behind the storefront sits a comprehensive back-office: an ops panel for order picking / inventory / receiving shipments / distributor invoice OCR, an admin panel for customers / promotions / discounts / reports / experiments / AI assistance, and an affiliate program with magic-link auth, commission accrual, and monthly payout generation. Three "Director" pipelines (Marketing, SEO, Operations) generate prioritized recommendation rows surfaced in a unified triage queue at `/admin/recommendations`; a Finance Director pipeline (Plaid + QuickBooks Online) is in Phase 0 scaffolding. A lead-capture + visitor-tracking system writes `Lead` / `VisitorSession` / `LeadEvent` rows from every form interaction site-wide. (A points-based loyalty program was previously planned but the code was removed 2026-04-23 before launch; Postgres tables remain for data preservation only.)

## User types

| User type | Primary surfaces | Identity |
|---|---|---|
| Anonymous shopper | `/`, `/order`, `/products/*`, `/bach-parties`, `/weddings`, `/boat-parties`, `/cocktail-kits`, partner landing pages | Cookie-based cart only |
| Registered customer | `/account`, `/account/orders`, `/account/group-orders`, `/account/addresses`, `/account/preferences` | JWT via `jose` (`src/lib/auth/`) |
| Group-order host | `/group/[code]`, `/group/[code]/dashboard`, `/group/create`, `/dashboard/[code]` | Host claim token + JWT |
| Group-order guest | `/group/[code]`, `/dashboard/[code]`, invoice pay pages | Guest name + email; optionally magic-link |
| Affiliate / partner | `/affiliate/apply`, `/affiliate/login`, `/affiliate/dashboard`, `/partners/[slug]` | Magic-link + `affiliate_session` cookie |
| Ops staff (pickers, dispatch) | `/ops/orders`, `/ops/inventory`, `/ops/products`, `/ops/collections`, `/ops/boat-schedule`, `/ops/group-orders`, `/ops/agent` | Ops session cookie (`src/lib/auth/ops-session*`) |
| Admin / operator | `/admin/*` | Admin API key + admin-verify route |
| Invoice recipient | `/invoice/[token]` | Short-lived signed token in URL |

## Value propositions

- **Same-day / fast delivery** of alcohol within Austin (`/fast-delivery`, `/delivery-areas`, `/atx-delivery-info`).
- **Event-first merchandising**: whole funnels tuned to weddings, bach weekends, boat days, and corporate events rather than generic bottle-shop browsing.
- **Group ordering**: shared dashboards where everyone contributes (`/group/*`, `/dashboard/[code]`) — reduces host coordination cost.
- **Curated kits & packages**: cocktail kits, keg parties, welcome packages, tier-priced bach/boat/wedding packages.
- **Partner network**: venues, hotels, mobile bartenders, property managers get dedicated landing and referral tooling (`/partners/*`, affiliate program).
- **Premium positioning**: design system enforces Barlow Condensed headings, brand blue/yellow + gold accent, rounded-lg cards, no emojis in UI.

## Core business flows (bulleted)

- **Direct retail order** — browse `/order` → add to cart (client `CartContext`) → `/checkout` → Stripe → Stripe webhook creates `Order` → Resend confirmation → ops picks via `/ops/orders`.
- **Group order (v1 legacy + v2)** — host creates group → shares code → participants add items with age verification → host locks + converts to order (single payer or multi-pay).
- **Dashboard (universal)** — affiliate / partner / host spins up a `GroupOrderV2` with `SubOrder` tabs → guests join via code → pay individually or invoice-style.
- **Invoice / draft order** — ops staff creates draft order at `/ops/orders/create` → customer receives emailed link to `/invoice/[token]` → pays via Stripe → webhook materializes `Order`.
- **Affiliate flow** — applicant submits at `/affiliate/apply` → admin approves → `ref=` attribution cookie set for 30 days by `src/middleware.ts` → commissions accrue via cron → monthly payout generated.
- **Blog / SEO engine** — daily Vercel cron fires `/api/cron/generate-blog` → AI-generated MDX committed to `content/blog/posts/` → served under `/blog/*`.
- **Inventory ops** — `/ops/inventory` + receiving flow with AI distributor-invoice OCR (`InventoryNote`, `ReceivingInvoice`, `DistributorSkuMap`).
- **Landing-page lead capture** — anonymous visitors get a `pod_vsid` cookie + `VisitorSession` row; any captured form field upgrades them to a `Lead`; the `/austin-*-delivery` landing pages run an embedded Stripe checkout with a pre-checkout A/B upsell overlay (tracked via `DraftOrder.upsellVariantId`).

## Monetization

| Channel | Notes |
|---|---|
| Direct retail | Primary — product markup on alcohol, kits, kegs, rentals. |
| Delivery fee | Computed in `src/lib/delivery/rates.ts` (hardcoded TS zone table). |
| Order minimums | $100–$150 depending on zone (per CLAUDE.md). |
| Packages & kits | Tiered pricing (`src/lib/package-pricing.ts`, `/weddings/packages/[tier]`, `/bach-parties/packages/[tier]`, `/boat-parties/packages/[tier]`). |
| Affiliate commissions | Paid out monthly via `AffiliateCommission` + `AffiliatePayout`. |
| Partner referrals | Venues, hotels, mobile bartenders drive traffic through `/partners/[slug]`. |
| Corporate / event sales | Dedicated funnels (`/corporate`, `/corporate/holiday-party`, `/plan-event`) with Zapier lead routing. |

## Geographic scope

- **City**: Austin, TX and adjacent suburbs.
- **Neighborhood pages**: Downtown, East Austin, Lake Travis, South Congress (`src/app/(main)/areas/*`) plus `/delivery/[location]`.
- **Zone logic**: hardcoded TypeScript tables at `src/lib/delivery/rates.ts` and `src/lib/tax/rates.ts` drive the delivery-fee and sales-tax calculators. (`DeliveryZone` and `TaxRate` Prisma models were removed 2026-04-23.)
- **Age compliance**: 21+ age-verification modal required before checkout; backed by `/api/v1/auth/age-verify` and `AgeVerificationModal.tsx`.
- **Regulatory**: TABC-focused compliance page at `/(main)/tabc`.

## See also

- [[INDEX]]
- [[02-tech-stack-and-architecture]]
- [[03-routes-and-pages]]
- [[04-customer-journey]]
- [[05-data-model]]
- [[06-admin-features]]

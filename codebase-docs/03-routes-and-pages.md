---
title: Routes and Pages
project: PartyOn2
doc_type: codebase-reference
section: routes
last_generated: 2026-08-10
tags: [partyondelivery, codebase, routes, api, pages]
---

# Routes and Pages

Every `page.tsx` and `route.ts` discovered under `src/app/`. Paths are literal file paths; URL column reflects App Router mapping (`(group)` segments do NOT appear in URLs).

> Homepage is `src/app/page.tsx` (production canonical — uses `HeroSectionExperimental`). Prior homepage variants (`/final`, `/polished`, `/premium`, `/professional-home`, `/professional-home-v2`, `/simplified-home`, `/ultra-clean`) were removed on 2026-04-23 along with `/products-test`, `/shopify-test`, `/test-videos`.

## Public & customer-facing pages

| URL | File | Purpose | Dynamic params | Auth | Notes |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Homepage / hero landing — uses `HeroSectionExperimental`. | — | No | Tall hero (`h-[70vh]`). |
| `/ai-party-planner` | `src/app/(main)/ai-party-planner/page.tsx` | AI-assisted party planning landing. | — | No | `(main)` group. |
| `/areas/downtown` | `src/app/(main)/areas/downtown/page.tsx` | Neighborhood SEO page. | — | No | |
| `/areas/east-austin` | `src/app/(main)/areas/east-austin/page.tsx` | Neighborhood SEO. | — | No | |
| `/areas/lake-travis` | `src/app/(main)/areas/lake-travis/page.tsx` | Neighborhood SEO. | — | No | |
| `/areas/south-congress` | `src/app/(main)/areas/south-congress/page.tsx` | Neighborhood SEO. | — | No | |
| `/book-now` | `src/app/(main)/book-now/page.tsx` and `src/app/book-now/layout.tsx` | Booking CTA. | — | No | |
| `/fast-delivery` | `src/app/(main)/fast-delivery/page.tsx` | Fast-delivery landing. | — | No | |
| `/order-now` | `src/app/(main)/order-now/page.tsx` | Shortcut to `/order`. | — | No | |
| `/press` | `src/app/(main)/press/page.tsx` | Press / media page. | — | No | |
| `/tabc` | `src/app/(main)/tabc/page.tsx` | TABC / regulatory info. | — | No | |
| `/team` | `src/app/(main)/team/page.tsx` | Team page. | — | No | |
| `/about` | `src/app/about/page.tsx` | About. | — | No | Has layout. |
| `/account` | `src/app/account/page.tsx` | Customer dashboard. | — | Yes (customer JWT) | |
| `/account/addresses` | `src/app/account/addresses/page.tsx` | Address book. | — | Yes | |
| `/account/group-orders` | `src/app/account/group-orders/page.tsx` | Past group orders. | — | Yes | |
| `/account/orders` | `src/app/account/orders/page.tsx` | Order history. | — | Yes | |
| `/account/preferences` | `src/app/account/preferences/page.tsx` | Email / marketing prefs. | — | Yes | |
| `/admin/*` | `src/app/admin/**` | Admin panel — see [[06-admin-features]]. | many | Admin | See [[06-admin-features]]. |
| `/affiliate/apply` | `src/app/affiliate/apply/page.tsx` | Affiliate application form. | — | No | |
| `/affiliate/login` | `src/app/affiliate/login/page.tsx` | Magic-link / password login. | — | No | |
| `/affiliate/verify` | `src/app/affiliate/verify/page.tsx` | Magic-link verify. | — | No (token in URL) | |
| `/affiliate/dashboard` | `src/app/affiliate/dashboard/page.tsx` | Affiliate home. | — | Yes (`affiliate_session`) | Gated by middleware. |
| `/affiliate/dashboard/create-dashboard` | `src/app/affiliate/dashboard/create-dashboard/page.tsx` | Spin up a universal dashboard. | — | Yes | |
| `/affiliate/dashboard/create-order` | `src/app/affiliate/dashboard/create-order/page.tsx` | Create an order on behalf of client. | — | Yes | |
| `/affiliate/dashboard/orders` | `src/app/affiliate/dashboard/orders/page.tsx` | Orders attributed to this affiliate. | — | Yes | |
| `/aperol-spritz` | `src/app/aperol-spritz/page.tsx` | Cocktail landing. | — | No | |
| `/atx-delivery-info` | `src/app/atx-delivery-info/page.tsx` | Delivery info. | — | No | |
| `/austin-bachelor-party-delivery` | `src/app/austin-bachelor-party-delivery/page.tsx` | High-conversion bachelor-party landing page (Quick-Buy + Package-Builder + a-la-carte modals, embedded Stripe checkout, pre-checkout upsell overlay). Added 2026-05. | — | No | Indexable. Uses shared `LandingPageTemplate` with `bachelorConfig`. |
| `/austin-bachelorette-party-delivery` | `src/app/austin-bachelorette-party-delivery/page.tsx` | Bachelorette equivalent of the above. | — | No | Indexable. |
| `/austin-corporate-event-delivery` | `src/app/austin-corporate-event-delivery/page.tsx` | Corporate-event landing variant. | — | No | Indexable. |
| `/austin-wedding-weekend-delivery` | `src/app/austin-wedding-weekend-delivery/page.tsx` | Wedding-weekend landing variant. | — | No | Indexable. |
| `/austin-byob-venues` | `src/app/austin-byob-venues/page.tsx` | BYOB venues index. | — | No | |
| `/austin-partners` | `src/app/austin-partners/page.tsx` | Partner overview. | — | No | |
| `/bach-parties` | `src/app/bach-parties/page.tsx` | Bach funnel. | — | No | |
| `/bach-parties/packages/[tier]` | `src/app/bach-parties/packages/[tier]/page.tsx` | Tiered package detail. | `tier` | No | |
| `/bach-parties/products` | (layout only — `src/app/bach-parties/products/layout.tsx`) | Shell for bach products browse. | — | No | |
| `/blog` | `src/app/blog/page.tsx` | Blog index. | — | No | MDX. |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | Blog post. | `slug` | No | |
| `/blog/category/[category]` | `src/app/blog/category/[category]/page.tsx` | Category archive. | `category` | No | |
| `/blogs/news` | `src/app/blogs/news/page.tsx` | Legacy Shopify-migrated blog index. | — | No | |
| `/blogs/news/[slug]` | `src/app/blogs/news/[slug]/page.tsx` | Legacy post. | `slug` | No | |
| `/boat-parties` | `src/app/boat-parties/page.tsx` | Boat funnel. | — | No | |
| `/boat-parties/packages/[tier]` | `src/app/boat-parties/packages/[tier]/page.tsx` | Package tier detail. | `tier` | No | |
| `/boat-parties/products` | (layout only) | Shell. | — | No | |
| `/cart/shared` | `src/app/cart/shared/page.tsx` | Shared cart (root). | — | No | |
| `/cart/shared/[id]` | `src/app/cart/shared/[id]/page.tsx` | Shared cart by id. | `id` | No | |
| `/s/[slug]` | `src/app/s/[slug]/route.ts` | Short-link redirect for shared carts — 302 → `/cart/shared?c=…&t=…`. Looks up `CartShareLink` by slug + bumps `viewCount`. Added 2026-05. | `slug` | No | Route handler, not a page. |
| `/checkout` | `src/app/checkout/page.tsx` | Stripe checkout handoff. | — | Optional | Age verification required. |
| `/checkout/success` | `src/app/checkout/success/page.tsx` | Post-payment success. | — | No | |
| `/cocktail-kits` | `src/app/cocktail-kits/page.tsx` | Cocktail kits catalog. | — | No | |
| `/cocktail-recipes` | `src/app/cocktail-recipes/page.tsx` | Mixing instructions for every cocktail kit. Membership comes from the live `cocktail-kits` category (a retired kit drops off on its own); `src/data/cocktail-recipes` only enriches it, and a kit with no curated recipe is skipped rather than guessed. Added 2026-08. | — | No | ISR `revalidate = 300`. Recipe + ItemList JSON-LD. |
| `/community/affiliate/signup` | `src/app/community/affiliate/signup/page.tsx` | Alt affiliate signup. | — | No | |
| `/contact` | `src/app/contact/page.tsx` | Contact form. | — | No | |
| `/corporate` | `src/app/corporate/page.tsx` | Corporate funnel. | — | No | |
| `/corporate/holiday-party` | `src/app/corporate/holiday-party/page.tsx` | Holiday party sub-funnel. | — | No | |
| `/corporate/products` | `src/app/corporate/products/page.tsx` | Corporate-curated catalog. | — | No | |
| `/corporate-events-guide` | `src/app/corporate-events-guide/page.tsx` | Guide / content. | — | No | |
| `/custom-package` | `src/app/custom-package/page.tsx` | Custom package configurator. | — | No | |
| `/dashboard/[code]` | `src/app/dashboard/[code]/page.tsx` | Universal Order Dashboard (main group-order surface). | `code` | Soft (claim token) | Backed by GroupOrderV2 v2 API. |
| `/dashboard/[code]/success` | `src/app/dashboard/[code]/success/page.tsx` | Post-checkout success for dashboard. | `code` | No | |
| `/delivery-areas` | `src/app/delivery-areas/page.tsx` | Delivery coverage. | — | No | |
| `/delivery/[location]` | `src/app/delivery/[location]/page.tsx` | Programmatic delivery-area pages. | `location` | No | |
| `/design-example` | `src/app/design-example/page.tsx` | Design system live showcase. | — | No | Internal / reference. |
| `/events/[slug]` | `src/app/events/[slug]/page.tsx` | Public event invite page (RSVP + BYOB order flow). Currently backed by a demo registry (`src/lib/events/demoEvents.ts`) — Prisma persistence pending. | `slug` | No | `noindex` while in demo phase. Added 2026-05. |
| `/faqs` | `src/app/faqs/page.tsx` | FAQ. | — | No | |
| `/flyer` | `src/app/flyer/page.tsx` | One-page marketing flyer ("The Playbook") summarising every service. Indexable. Added 2026-05. | — | No | `force-static`. Wired to lead-magnet email flow. |
| `/gifts/cocktail-kits` | `src/app/gifts/cocktail-kits/page.tsx` | Gifting catalog. | — | No | |
| `/gin-martini` | `src/app/gin-martini/page.tsx` | Cocktail landing. | — | No | |
| `/group/[code]` | `src/app/group/[code]/page.tsx` | v2 group order home. | `code` | Soft | |
| `/group/[code]/dashboard` | `src/app/group/[code]/dashboard/page.tsx` | Host dashboard for group. | `code` | Host | |
| `/group/checkout/success` | `src/app/group/checkout/success/page.tsx` | Group checkout success. | — | No | |
| `/group/create` | `src/app/group/create/page.tsx` | Host creates a group order. | — | Optional | |
| `/holiday-runner-up` | `src/app/holiday-runner-up/page.tsx` | Holiday landing variant. | — | No | |
| `/invoice/[token]` | `src/app/invoice/[token]/page.tsx` | Customer pays a draft order / invoice. | `token` | Token only | |
| `/invoices/[...slug]` | `src/app/invoices/[...slug]/page.tsx` | Legacy invoice catch-all. | `slug[]` | Token | |
| `/[storeId]/invoices/[...slug]` | `src/app/[storeId]/invoices/[...slug]/page.tsx` | Tenant-scoped legacy invoice. | `storeId`, `slug[]` | Token | |
| `/kegs` | `src/app/kegs/page.tsx` | Keg service. | — | No | |
| `/landing-page-playbook` | `src/app/landing-page-playbook/page.tsx` | Internal methodology doc for replicating the landing-page system on another brand. | — | No | `noindex`. Added 2026-05. |
| `/landing-pages` | `src/app/landing-pages/page.tsx` | Internal preview directory of all four `/austin-*-delivery` landing pages. | — | No | `noindex`. Added 2026-05. |
| `/negroni` | `src/app/negroni/page.tsx` | Cocktail landing. | — | No | |
| `/old-fashioned` | `src/app/old-fashioned/page.tsx` | Cocktail landing. | — | No | |
| `/order` | `src/app/order/page.tsx` | Primary product browse. | — | No | `/products` → here. |
| `/order/last-minute` | `src/app/order/last-minute/page.tsx` | Curated last-minute products. | — | No | Added in recent commits. |
| `/partners` | `src/app/partners/page.tsx` | Partner program overview. | — | No | |
| `/partners/[slug]` | `src/app/partners/[slug]/page.tsx` | Generic partner landing. | `slug` | No | iframe-embeddable. |
| `/partners/pitch` | `src/app/partners/pitch/page.tsx` | 5-slide horizontal pitch deck for partner program. Mobile vertical-scroll fallback. | — | No | One-off; CTA → Calendly. |
| `/partners/anderson-mill-marina-boat-club` | ... | Named partner. | — | No | |
| `/partners/boat-babes` | ... | Named partner. | — | No | |
| `/partners/cocktail-cowboys` | ... | Named partner. | — | No | |
| `/partners/connected-austin` | ... | Named partner. | — | No | |
| `/partners/hotels-resorts` | ... | Vertical. | — | No | |
| `/partners/inn-cahoots` | ... | Named partner. | — | No | |
| `/partners/lynns-lodging` | ... | Named partner. | — | No | |
| `/partners/mobile-bartenders` | ... | Vertical. | — | No | |
| `/partners/premier-party-cruises` | ... | Named partner. | — | No | |
| `/partners/property-management` | ... | Vertical. | — | No | |
| `/partners/vacation-rentals` | ... | Vertical. | — | No | |
| `/payment` | `src/app/payment/page.tsx` | Payment page. | — | No | |
| `/plan-event` | `src/app/plan-event/page.tsx` | Event planning lead-gen. | — | No | |
| `/premier-boat-schedule` | `src/app/premier-boat-schedule/page.tsx` | Public boat schedule. | — | No | |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy. | — | No | `pt-32` pattern. |
| `/products` | `src/app/products/page.tsx` | Products landing (redirects per `next.config.ts`). | — | No | |
| `/products/[handle]` | `src/app/products/[handle]/page.tsx` | Product detail. | `handle` | No | |
| `/rentals` | `src/app/rentals/page.tsx` | Rentals hub. | — | No | |
| `/rentals/chair-rentals-austin` | ... | Chair rentals. | — | No | |
| `/rentals/cocktail-table-rentals-austin` | ... | Table rentals. | — | No | |
| `/rentals/cooler-rentals-austin` | ... | Cooler rentals. | — | No | |
| `/reviews` | `src/app/reviews/page.tsx` | "Wall of Love" — every harvested Google review, full text, verbatim. Click-through destination for the `5.0 · 100+ Google reviews` strips on the landers. Pool lives in `src/lib/reviews/reviews.ts`. Added 2026-08. | — | No | Age-gate exempt (nothing sold here). **No AggregateRating JSON-LD** — self-serving review markup is rich-result ineligible and risks a manual action. |
| `/services` | `src/app/services/page.tsx` | Services overview. | — | No | |
| `/terms` | `src/app/terms/page.tsx` | Terms. | — | No | |
| `/venues/[slug]` | `src/app/venues/[slug]/page.tsx` | BYOB venue detail. | `slug` | No | |
| `/weddings` | `src/app/weddings/page.tsx` | Weddings funnel. | — | No | |
| `/weddings/order` | `src/app/weddings/order/page.tsx` | Wedding-specific order flow. | — | No | |
| `/weddings/packages/[tier]` | `src/app/weddings/packages/[tier]/page.tsx` | Wedding package tier. | `tier` | No | |
| `/weddings/products` | `src/app/weddings/products/page.tsx` | Wedding curated catalog. | — | No | |
| `/ops/*` | `src/app/ops/**` | Internal ops panel — see [[06-admin-features]]. | — | Ops session | See [[06-admin-features]]. |

## API routes (all `route.ts` files)

### Auth & customer (`/api/v1/auth`)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/v1/auth/login` | `src/app/api/v1/auth/login/route.ts` | POST | Email/password login → JWT. | No |
| `/api/v1/auth/register` | `src/app/api/v1/auth/register/route.ts` | POST | Customer signup. | No |
| `/api/v1/auth/logout` | `src/app/api/v1/auth/logout/route.ts` | POST | Clear session. | Yes |
| `/api/v1/auth/me` | `src/app/api/v1/auth/me/route.ts` | GET | Current customer. | Yes |
| `/api/v1/auth/password` | `src/app/api/v1/auth/password/route.ts` | POST | Password change/reset. | Varies |
| `/api/v1/auth/verify` | `src/app/api/v1/auth/verify/route.ts` | POST | Verify email/token. | Token |
| `/api/v1/auth/age-verify` | `src/app/api/v1/auth/age-verify/route.ts` | POST | Record 21+ attestation. | No |

### Products & collections (`/api/v1`)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/v1/products` | `src/app/api/v1/products/route.ts` | GET | Catalog list (filters, pagination). | No |
| `/api/v1/products/[id]` | `.../products/[id]/route.ts` | GET | Product by id. | No |
| `/api/v1/products/[id]/inventory` | `.../inventory/route.ts` | GET | Per-product inventory. | No |
| `/api/v1/products/[id]/variants` | `.../variants/route.ts` | GET | Variants list. | No |
| `/api/v1/products/search` | `.../search/route.ts` | GET | Product search. | No |
| `/api/v1/products/variant/[variantId]` | `.../variant/[variantId]/route.ts` | GET | Variant lookup. | No |
| `/api/v1/variants/[id]` | `.../variants/[id]/route.ts` | GET | Variant detail. | No |
| `/api/v1/collections` | `.../collections/route.ts` | GET | Collections list. | No |
| `/api/v1/collections/[handle]` | `.../collections/[handle]/route.ts` | GET | Collection detail + products. | No |
| `/api/products` (legacy) | `src/app/api/products/route.ts` | GET | Legacy products list. | No |
| `/api/products/[handle]` | `src/app/api/products/[handle]/route.ts` | GET | Legacy product detail. | No |
| `/api/products/counts` | `src/app/api/products/counts/route.ts` | GET | Collection counts (used by `useCollectionCounts`). | No |

### Cart / checkout / orders (customer-facing)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/v1/cart` | `src/app/api/v1/cart/route.ts` | GET/POST/PATCH/DELETE | Cart CRUD. | Optional |
| `/api/v1/cart/delivery` | `.../cart/delivery/route.ts` | POST | Apply delivery option / zone. | Optional |
| `/api/v1/cart/discount` | `.../cart/discount/route.ts` | POST | Apply / remove discount code. | Optional |
| `/api/v1/checkout` | `.../checkout/route.ts` | POST | Create Stripe checkout session. | Optional |
| `/api/v1/orders` | `.../orders/route.ts` | GET | Customer orders. | Yes |
| `/api/v1/orders/[id]` | `.../orders/[id]/route.ts` | GET | Order detail. | Yes |
| `/api/orders/[orderNumber]` | `src/app/api/orders/[orderNumber]/route.ts` | GET | Order lookup by number. | Token / yes |
| `/api/cart/share` | `src/app/api/cart/share/route.ts` | POST | Create shared cart link. Now persists a `CartShareLink` row + returns `/s/<slug>` short URL. | No |
| `/api/cart/share/[id]` | `.../share/[id]/route.ts` | GET | Fetch shared cart. | No |

### Invoice / draft order (public-facing)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/v1/invoice/[token]` | `.../invoice/[token]/route.ts` | GET/PATCH | Get or edit draft order by token. | Token |
| `/api/v1/invoice/[token]/items` | `.../items/route.ts` | PATCH/DELETE | Modify line items. | Token |
| `/api/v1/invoice/[token]/discount` | `.../discount/route.ts` | POST | Apply discount to invoice. | Token |
| `/api/v1/invoice/[token]/checkout` | `.../checkout/route.ts` | POST | Create Stripe checkout for invoice. | Token |

### Group orders: v1 and v2 coexist

v1 `/api/group-orders/*` and v2 `/api/v2/group-orders/*` are **both live** — v1 is not deprecated. v2 powers the dashboard flow (`src/app/dashboard/[code]/page.tsx`). Live v1 callers:

- `src/hooks/useGroupCartSync.ts`
- `src/app/account/group-orders/page.tsx`
- `src/components/group-orders/GroupOrderItems.tsx`
- `src/components/group-orders/EnableMultiPaymentModal.tsx`
- `src/components/group-orders/HostDecisionModal.tsx`
- `src/lib/group-orders/hooks.ts`

### Group orders (v1)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/group-orders/create` | `src/app/api/group-orders/create/route.ts` | POST | Create group order. | Optional |
| `/api/group-orders/my-orders` | `.../my-orders/route.ts` | GET | Host's groups. | Yes |
| `/api/group-orders/id/[id]/join` | `.../join/route.ts` | POST | Join by id. | No |
| `/api/group-orders/[code]` | `.../[code]/route.ts` | GET | Group by share code. | No |
| `/api/group-orders/[code]/items` | `.../items/route.ts` | POST/PATCH/DELETE | Manage items. | Participant |
| `/api/group-orders/[code]/update-cart` | `.../update-cart/route.ts` | PATCH | Sync participant cart. | Participant |
| `/api/group-orders/[code]/remove-participant` | `.../remove-participant/route.ts` | POST | Host removes a guest. | Host |
| `/api/group-orders/[code]/create-checkout` | `.../create-checkout/route.ts` | POST | Host finalizes checkout. | Host |
| `/api/group-orders/[code]/enable-multi-payment` | `.../enable-multi-payment/route.ts` | POST | Toggle split pay. | Host |
| `/api/group-orders/[code]/host-decision` | `.../host-decision/route.ts` | POST | Host finalize / cancel. | Host |
| `/api/group-orders/[code]/lock-order` | `.../lock-order/route.ts` | POST | Lock to stop edits. | Host |
| `/api/group-orders/[code]/participant-checkout` | `.../participant-checkout/route.ts` | POST | Split-pay checkout. | Participant |
| `/api/group-orders/[code]/payment-status` | `.../payment-status/route.ts` | GET | Poll payment. | Participant |

### Group orders v2 / Universal Dashboard (`/api/v2/group-orders`)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/v2/group-orders` | `src/app/api/v2/group-orders/route.ts` | GET/POST | List + create v2 group. | Varies |
| `/api/v2/group-orders/dashboard` | `.../dashboard/route.ts` | GET | Dashboard view data. | Soft |
| `/api/v2/group-orders/my-orders` | `.../my-orders/route.ts` | GET | Caller's groups. | Yes |
| `/api/v2/group-orders/validate-discount` | `.../validate-discount/route.ts` | POST | Validate code. | No |
| `/api/v2/group-orders/validate-promo` | `.../validate-promo/route.ts` | POST | Validate promo. | No |
| `/api/v2/group-orders/[code]` | `.../[code]/route.ts` | GET/PATCH | Group detail. | Soft |
| `/api/v2/group-orders/[code]/claim-host` | `.../claim-host/route.ts` | POST | Claim host via token. | Token |
| `/api/v2/group-orders/[code]/join` | `.../join/route.ts` | POST | Guest joins. | No |
| `/api/v2/group-orders/[code]/participants/[pid]` | `.../participants/[pid]/route.ts` | PATCH/DELETE | Manage participant. | Host |
| `/api/v2/group-orders/[code]/recommendations` | `.../recommendations/route.ts` | GET | AI recs. | Soft |
| `/api/v2/group-orders/[code]/send-link` | `.../send-link/route.ts` | POST | Email/SMS group link. | Host |
| `/api/v2/group-orders/[code]/track-view` | `.../track-view/route.ts` | POST | Log DashboardView. | No |
| `/api/v2/group-orders/[code]/transfer-host` | `.../transfer-host/route.ts` | POST | Move host. | Host |
| `/api/v2/group-orders/[code]/tabs` | `.../tabs/route.ts` | GET/POST | Sub-order tabs. | Soft |
| `/api/v2/group-orders/[code]/tabs/[tabId]` | `.../[tabId]/route.ts` | GET/PATCH/DELETE | Tab CRUD. | Host |
| `/api/v2/group-orders/[code]/tabs/[tabId]/items` | `.../items/route.ts` | POST | Add item to tab. | Participant |
| `/api/v2/group-orders/[code]/tabs/[tabId]/items/[itemId]` | `.../items/[itemId]/route.ts` | PATCH/DELETE | Item mutate. | Participant |
| `/api/v2/group-orders/[code]/tabs/[tabId]/checkout` | `.../checkout/route.ts` | POST | Per-tab checkout. | Participant |
| `/api/v2/group-orders/[code]/tabs/[tabId]/checkout-all` | `.../checkout-all/route.ts` | POST | Host-pay-all. | Host |
| `/api/v2/group-orders/[code]/tabs/[tabId]/delivery-invoice` | `.../delivery-invoice/route.ts` | POST | Split delivery invoice. | Host |
| `/api/v2/group-orders/[code]/tabs/[tabId]/free-shipping-check` | `.../free-shipping-check/route.ts` | GET | Free-ship threshold calc. | No |

### Affiliate (customer-facing)

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/v1/affiliate/apply` | `src/app/api/v1/affiliate/apply/route.ts` | POST | Create `PartnerApplication`. | No |
| `/api/v1/affiliate/attribution` | `.../attribution/route.ts` | POST | Record click attribution. | No |
| `/api/v1/affiliate/login` | `.../login/route.ts` | POST | Password login. | No |
| `/api/v1/affiliate/dev-login` | `.../dev-login/route.ts` | POST | Dev-only bypass. | Dev only |
| `/api/v1/affiliate/logout` | `.../logout/route.ts` | POST | Clear session. | Yes |
| `/api/v1/affiliate/magic-link` | `.../magic-link/route.ts` | POST | Send magic link. | No |
| `/api/v1/affiliate/verify` | `.../verify/route.ts` | GET/POST | Verify magic link → session. | Token |
| `/api/v1/affiliate/set-password` | `.../set-password/route.ts` | POST | First-time password set. | Token |
| `/api/v1/affiliate/me` | `.../me/route.ts` | GET/PATCH | Affiliate profile. | Yes |
| `/api/v1/affiliate/me/orders` | `.../me/orders/route.ts` | GET | Attributed orders. | Yes |
| `/api/v1/affiliate/me/client-orders` | `.../me/client-orders/route.ts` | GET | Orders affiliate created for clients. | Yes |
| `/api/v1/affiliate/me/client-orders/[id]/cancel` | `.../cancel/route.ts` | POST | Cancel client order. | Yes |
| `/api/v1/affiliate/me/payouts` | `.../me/payouts/route.ts` | GET | Payout history. | Yes |
| `/api/v1/affiliate/templates` | `.../templates/route.ts` | GET | Dashboard templates. | Yes |
| `/api/v1/affiliate/create-dashboard` | `.../create-dashboard/route.ts` | POST | Affiliate spins up GroupOrderV2 dashboard. | Yes |
| `/api/v1/affiliate/create-order` | `.../create-order/route.ts` | POST | Affiliate creates draft order for client. | Yes |
| `/api/v1/affiliate/dashboard-orders` | `.../dashboard-orders/route.ts` | GET | Affiliate's dashboards. | Yes |

### Ops APIs

| Endpoint | File | Methods | Purpose | Auth |
|---|---|---|---|---|
| `/api/ops/session` | `src/app/api/ops/session/route.ts` | POST | Create ops session cookie. | Password |
| `/api/ops/logout` | `.../logout/route.ts` | POST | Clear. | Ops |
| `/api/ops/boat-schedule` | `.../boat-schedule/route.ts` | GET/POST | Boat schedule CRUD. | Ops |
| `/api/ops/boat-schedule/sync` | `.../sync/route.ts` | POST | Sync / match schedule to orders. | Ops |
| `/api/ops/boat-schedule/order/[orderNumber]` | `.../order/[orderNumber]/route.ts` | GET | Boat match for order. | Ops |
| `/api/ops/email-preview` | `.../email-preview/route.ts` | GET | Render email template. | Ops |
| `/api/ops/email-preview/send` | `.../email-preview/send/route.ts` | POST | Send test email. | Ops |
| `/api/ops/email-template-content` | `.../email-template-content/route.ts` | GET/PATCH | Edit template content. | Ops |
| `/api/ops/orders/[id]/picks` | `.../orders/[id]/picks/route.ts` | GET/PUT | Persistent pick/pack state for the `/ops/orders` picker UI. Per `(orderId, itemKey)` row in `OrderItemPickState`; replaces prior per-browser localStorage so multiple devices see the same checkbox + short-by state. Added `86f58c77`. | Ops |
| `/api/ops/weekly-summary` | `.../weekly-summary/route.ts` | GET | Returns the print-friendly weekly checklist JSON (PAID orders, next 7 days, cooler-by-cooler). Backs the `/weekly-summary` skill. Added 2026-05. | Ops |

### Admin API namespaces — `/api/admin/*` vs `/api/v1/admin/*`

These are **parallel namespaces, not a migration** — neither supersedes the other.

- **`/api/admin/*`** is admin-UI-facing and is guarded by `ADMIN_API_KEY` / admin session. Covers: `affiliates`, `analytics`, `experiments`, `orders`, `sync`, `verify`.
- **`/api/v1/admin/*`** is ops-panel-facing. Covers: `collections`, `customers`, `dashboard`, `discounts`, `draft-orders`, `features`, `orders`, `products`, `reports`, `shortage-list`, `sync`, `unpaid-carts`. (Loyalty admin page and APIs were removed 2026-04-23 (program deprecated).)
- Overlap is only `orders` and `sync`; each namespace's `orders` / `sync` endpoints serve a different consumer. Do not treat either as deprecated.

### Admin APIs (`/api/v1/admin`)

| Endpoint | File | Purpose |
|---|---|---|
| `/api/v1/admin/dashboard` | `.../admin/dashboard/route.ts` | KPI aggregation. |
| `/api/v1/admin/orders` | `.../admin/orders/route.ts` | List/search orders. |
| `/api/v1/admin/orders/[id]` | `.../orders/[id]/route.ts` | Order detail / update. |
| `/api/v1/admin/orders/[id]/amend` | | Amend order. |
| `/api/v1/admin/orders/[id]/cancel` | | Cancel. |
| `/api/v1/admin/orders/[id]/refund` | | Refund via Stripe. |
| `/api/v1/admin/orders/[id]/return` | | RMA. |
| `/api/v1/admin/orders/[id]/send-amendment` | | Email amendment. |
| `/api/v1/admin/orders/[id]/send-receipt` | | Resend receipt. |
| `/api/v1/admin/orders/bulk-fulfill` | | Bulk mark fulfilled. |
| `/api/v1/admin/orders/send-review-requests` | | Trigger review asks. |
| `/api/v1/admin/products` | | Product CRUD. |
| `/api/v1/admin/products/[id]` | | Product detail mutate. |
| `/api/v1/admin/products/[id]/images/reorder` | | Reorder images. |
| `/api/v1/admin/products/[id]/variants/[variantId]` | | Variant mutate. |
| `/api/v1/admin/products/images` | | Upload image. |
| `/api/v1/admin/products/images/[imageId]` | | Delete/replace image. |
| `/api/v1/admin/collections` | | Collections CRUD. |
| `/api/v1/admin/collections/[id]` | | Collection detail. |
| `/api/v1/admin/collections/[id]/products` | | Assign products to collection. |
| `/api/v1/admin/customers` | | Customer search. |
| `/api/v1/admin/customers/[id]` | | Customer detail. |
| `/api/v1/admin/discounts` | | Discount CRUD. |
| `/api/v1/admin/discounts/[id]` | | Discount detail. |
| `/api/v1/admin/discounts/automatic` | | Automatic-discount rules. |
| `/api/v1/admin/discounts/validate` | | Validate code. |
| `/api/v1/admin/draft-orders` | | Draft order list/create. |
| `/api/v1/admin/draft-orders/[id]` | | Draft order detail. |
| `/api/v1/admin/draft-orders/[id]/preview` | | Email preview. |
| `/api/v1/admin/draft-orders/[id]/send` | | Email invoice to customer. |
| `/api/v1/admin/draft-orders/[id]/email-events` | | Resend event log. |
| `/api/v1/admin/features` | | Feature flags. |
| `/api/v1/admin/group-orders` | | Admin GroupOrderV2 list. |
| `/api/v1/admin/group-orders/[id]` | | Detail / mutate. |
| `/api/v1/admin/leads/board` | `.../admin/leads/board/route.ts` | Lead Flow Kanban payload. Runs the enroll sweep first (a **write**) so a fresh lead appears on open, and reads only the top 500 by score. |
| `/api/v1/admin/leads/sources` | `.../admin/leads/sources/route.ts` | True per-form / per-channel totals. Deliberately **not** built on `getBoardData` — that sweeps-and-slices, so anything derived from it is a slice, not a total. Strictly read-only, whole-table, capped at 20k rows. Added 2026-08. |
| `/api/v1/admin/leads/[id]` | | GET drawer detail (lead + timeline + matched orders/drafts + score breakdown); PATCH notes/owner/snooze only — stage changes must go through `/stage`. |
| `/api/v1/admin/leads/[id]/stage` | | Move a card. All moves route through `transitionStage` (single writer: audit `LeadEvent` + stamps + score recompute) so the transition matrix always applies. |
| `/api/v1/admin/leads/[id]/reply` | | Send a 1:1 email from the board composer (suppression-respecting, from/reply-to `info@`) → `EmailLog` + `LeadEvent` + auto NEW→CONTACTED. |
| `/api/v1/admin/leads/[id]/touch` | | Log an off-board call/text so touch count and "last touched" reflect reality. Same bookkeeping as `/reply`, minus the email. |
| `/api/v1/admin/leads/[id]/email/[emailId]` | | Body of one email sent to this lead (drawer timeline expansion). `EmailLog` stores no body — fetched on demand from Resend by `resendId`. |
| `/api/v1/admin/reports` | | Report index. |
| `/api/v1/admin/reports/sales` | | Sales report. |
| `/api/v1/admin/reports/customers` | | Customers report. |
| `/api/v1/admin/reports/inventory` | | Inventory report. |
| `/api/v1/admin/shortage-list/email` | | Email shortage list to Allan (recent feature). |
| `/api/v1/admin/sync` | | Shopify catalog sync trigger. |
| `/api/v1/admin/unpaid-carts` | | Abandoned cart list. |

### Admin APIs (`/api/admin`)

| Endpoint | File | Purpose |
|---|---|---|
| `/api/admin/verify` | `src/app/api/admin/verify/route.ts` | Verify admin API key. |
| `/api/admin/analytics` | `.../analytics/route.ts` | Analytics aggregates. |
| `/api/admin/analytics/recommendations` | `.../analytics/recommendations/route.ts` | Marketing/SEO recommendation list + transitions (legacy mount; the unified queue is at `/api/admin/recommendations`). |
| `/api/admin/recommendations` | `.../recommendations/route.ts` | Unified Marketing + SEO + Operations recommendation list. Read-only; mutations go through `[id]/{execute,snooze,dismiss}`. Added 2026-05 (Operations Director Phase 1C). |
| `/api/admin/recommendations/[id]/execute` | `.../[id]/execute/route.ts` | Execute the recommended action (writes `actionLog` + `shippedAt`). |
| `/api/admin/recommendations/[id]/snooze` | `.../[id]/snooze/route.ts` | Snooze until `snoozeUntil`. |
| `/api/admin/recommendations/[id]/dismiss` | `.../[id]/dismiss/route.ts` | Dismiss with a reason — used by the operator triage queue. |
| `/api/admin/operations/snapshot` | `.../operations/snapshot/route.ts` | One-stop JSON for the `/admin/operations` dashboard + agent: latest snapshot, 30-snapshot trend, active-rec counts, top urgent recs. Added 2026-05. |
| `/api/admin/seo/latest-snapshot` | `.../seo/latest-snapshot/route.ts` | Latest SEMrush snapshot summary for the Brian's Stuff → SEO tab. Added 2026-05. |
| `/api/admin/finance/qb/connect` | `.../finance/qb/connect/route.ts` | Start QuickBooks Online OAuth flow. Added 2026-05 (Finance Director Phase 0). |
| `/api/admin/finance/qb/callback` | `.../finance/qb/callback/route.ts` | QBO OAuth callback — upserts `IntuitOAuthState`. |
| `/api/admin/finance/qb/health` | `.../finance/qb/health/route.ts` | QBO connection health check. |
| `/api/admin/finance/plaid/link-token` | `.../finance/plaid/link-token/route.ts` | Mint a Plaid Link token for the connect-bank flow. |
| `/api/admin/finance/plaid/exchange` | `.../finance/plaid/exchange/route.ts` | Exchange Plaid public_token → access_token, upsert `PlaidItem`/`PlaidAccount`. |
| `/api/admin/finance/plaid/health` | `.../finance/plaid/health/route.ts` | Plaid connection health check. |
| `/api/admin/orders` | `.../orders/route.ts` | Legacy orders list. |
| `/api/admin/sync` | `.../sync/route.ts` | Legacy sync. |
| `/api/admin/experiments` | `.../experiments/route.ts` | Experiments list. |
| `/api/admin/experiments/[id]` | `.../experiments/[id]/route.ts` | Experiment detail. |
| `/api/admin/affiliates` | `.../affiliates/route.ts` | Affiliate CRUD. |
| `/api/admin/affiliates/[id]` | `.../[id]/route.ts` | Detail. |
| `/api/admin/affiliates/[id]/dashboard` | | Impersonate dashboard. |
| `/api/admin/affiliates/[id]/impersonate` | | Start impersonation. |
| `/api/admin/affiliates/[id]/link-order` | | Attach order retroactively. |
| `/api/admin/affiliates/[id]/send-welcome` | | Welcome email. |
| `/api/admin/affiliates/applications` | | Pending applications. |
| `/api/admin/affiliates/applications/[id]/approve` | | Approve. |
| `/api/admin/affiliates/applications/[id]/reject` | | Reject. |
| `/api/admin/affiliates/commissions` | | Commission list. |
| `/api/admin/affiliates/commissions/[id]` | | Detail / edit. |
| `/api/admin/affiliates/payouts` | | Payouts list. |
| `/api/admin/affiliates/payouts/[id]` | | Detail. |
| `/api/admin/affiliates/payouts/generate` | | Generate next payout cycle. |
| `/api/admin/affiliates/lookup` | | Search. |
| `/api/admin/affiliates/stop-impersonating` | | End impersonation. |
| `/api/admin/affiliates/create-and-send` | | Create affiliate + welcome email. |
| `/api/admin/affiliates/create-and-send/preview` | | Email preview. |

### Inventory (v1)

| Endpoint | File | Purpose |
|---|---|---|
| `/api/v1/inventory` | `src/app/api/v1/inventory/route.ts` | Inventory overview. |
| `/api/v1/inventory/alerts` | `.../alerts/route.ts` | Low-stock alerts. |
| `/api/v1/inventory/locations` | `.../locations/route.ts` | Locations. |
| `/api/v1/inventory/notes` | `.../notes/route.ts` | `InventoryNote` CRUD (adjustments). |
| `/api/v1/inventory/notes/[id]/apply` | `.../apply/route.ts` | Apply pending note. |
| `/api/v1/inventory/notes/[id]/process` | `.../process/route.ts` | AI-process invoice image. |
| `/api/v1/inventory/receiving` | `.../receiving/route.ts` | Receiving invoice list/create. |
| `/api/v1/inventory/receiving/[id]` | `.../[id]/route.ts` | Detail. |
| `/api/v1/inventory/receiving/[id]/apply` | `.../apply/route.ts` | Commit stock. |
| `/api/v1/inventory/receiving/[id]/lines/[lineId]` | `.../[lineId]/route.ts` | Line edit. |
| `/api/v1/inventory/variants/[id]` | `.../inventory/variants/[id]/route.ts` | PATCH — inline edits from the `/ops/inventory` page. Resolves quantity/committed/available/costPerUnit; `quantity > available > committed` write priority. |

### AI inventory & agent

| Endpoint | File | Purpose |
|---|---|---|
| `/api/v1/ai/inventory/count` | `.../ai/inventory/count/route.ts` | AI stock count flow. |
| `/api/v1/ai/inventory/count/[id]/apply` | `.../apply/route.ts` | Apply. |
| `/api/v1/ai/inventory/predictions` | `.../predictions/route.ts` | Forecast. |
| `/api/v1/ai/inventory/query` | `.../query/route.ts` | Natural-language inventory Q. |
| `/api/v1/agent/chat` | `.../agent/chat/route.ts` | Agent chat stream. |
| `/api/v1/agent/conversations` | `.../conversations/route.ts` | List conversations. |
| `/api/v1/agent/approve` | `.../approve/route.ts` | Approve proposal. |
| `/api/v1/agent/reject` | `.../reject/route.ts` | Reject. |

### OAuth / MCP / public

| Endpoint | File | Purpose |
|---|---|---|
| `/.well-known/oauth-authorization-server` | `src/app/.well-known/oauth-authorization-server/route.ts` | OAuth AS metadata. |
| `/.well-known/oauth-protected-resource` | `.../oauth-protected-resource/route.ts` | Resource metadata. |
| `/oauth/authorize` | `src/app/oauth/authorize/route.ts` | Authorize. |
| `/oauth/register` | `.../register/route.ts` | Dynamic client register. |
| `/oauth/token` | `.../token/route.ts` | Token exchange. |
| `/api/mcp` | `src/app/api/mcp/route.ts` | MCP server endpoint. |
| `/api/public/boat-schedule` | `src/app/api/public/boat-schedule/route.ts` | Public boat schedule. |
| `/api/public/boat-schedule/order/[orderNumber]` | `.../order/[orderNumber]/route.ts` | Public match. |

### Misc + lead capture + experiments

| Endpoint | File | Purpose |
|---|---|---|
| `/api/analytics-ingest` | `src/app/api/analytics-ingest/route.ts` | Vercel Drain receiver. |
| `/api/chat` | `src/app/api/chat/route.ts` | General chat (AI concierge). |
| `/api/contact` | `src/app/api/contact/route.ts` | Contact form. |
| `/api/newsletter` | `src/app/api/newsletter/route.ts` | Newsletter signup. |
| `/api/v1/landing/visitor-pixel` | `.../v1/landing/visitor-pixel/route.ts` | Page-view beacon fired from the root layout. Sets the `pod_vsid` cookie + creates/updates a `VisitorSession`, writes a `LeadEvent(PAGE_VIEW)`. Added 2026-05. |
| `/api/v1/landing/lead-event` | `.../v1/landing/lead-event/route.ts` | Generic form-field / step / submit event. Upserts `Lead` if any identifiable field is captured. Returns `{ leadId, sessionId }`. Added 2026-05. |
| `/api/v1/landing/quote` | `.../v1/landing/quote/route.ts` | Landing-page quote submission — converts a captured cart into a `DraftOrder` + invoice email. Added 2026-05. |
| `/api/v1/lead-magnet` | `.../v1/lead-magnet/route.ts` | Lead-magnet (Playbook PDF) email send via Resend. Companion event row is written by the client through `/lead-event`. Added 2026-05. |
| `/api/v1/events/abandon-nudge` | `.../v1/events/abandon-nudge/route.ts` | Sends the abandoned-RSVP email for the events flow (called by the 15-min cron). Added 2026-05. |
| `/api/v1/events/abandon-nudge/cancel` | `.../v1/events/abandon-nudge/cancel/route.ts` | POST — cancels a scheduled nudge because the guest actually finished their drink order (the drinks modal's `clearCart()` only touches localStorage, so the server never hears about it otherwise). Unauthenticated by design: it can only STOP mail. Rate-limited. **Every well-formed request returns a byte-identical `{ ok: true }`** — distinguishing 'canceled' from 'no-op' would leak whether a guessed email has an unfinished order (CWE-204). Added 2026-08. |
| `/api/partners/inquiry` | `.../partners/inquiry/route.ts` | Partner form → Zapier. |
| `/api/profile/upload-image` | `.../profile/upload-image/route.ts` | Avatar upload. |
| `/api/experiments/assign` | `.../experiments/assign/route.ts` | Assign variant. |
| `/api/experiments/track` | `.../experiments/track/route.ts` | Track event. |
| `/api/v1/features` | `src/app/api/v1/features/route.ts` | Client feature flags. |

### Webhooks

| Endpoint | File | Purpose |
|---|---|---|
| `/api/webhooks/stripe` | `src/app/api/webhooks/stripe/route.ts` | Stripe events → `Order` creation, invoice payment. |
| `/api/webhooks/shopify` | `.../shopify/route.ts` | Shopify product/catalog webhooks. |
| `/api/webhooks/shopify/list` | `.../shopify/list/route.ts` | Inspect registered webhooks. |
| `/api/webhooks/resend` | `.../resend/route.ts` | Resend delivery events (logged to `EmailLog`). |
| `/api/webhooks/create-dashboard` | `.../create-dashboard/route.ts` | External trigger to spin up a dashboard. |

### Cron (Vercel — `vercel.json`)

| Endpoint | File | Schedule | Purpose |
|---|---|---|---|
| `/api/cron/generate-blog` | `src/app/api/cron/generate-blog/route.ts` | `0 14 * * *` | Daily AI blog post. |
| `/api/cron/reconcile-orders` | `.../reconcile-orders/route.ts` | `*/15 * * * *` | Reconcile Stripe ↔ DB. |
| `/api/cron/affiliate-commissions` | `.../affiliate-commissions/route.ts` | `0 6 * * *` | Daily commission accrual. |
| `/api/cron/affiliate-payouts` | `.../affiliate-payouts/route.ts` | `0 14 1 * *` | Monthly payout generation. |
| `/api/cron/analytics-snapshot` | `.../analytics-snapshot/route.ts` | `0 7 * * *` | Daily GA4/GSC rollup → `AnalyticsSnapshot`. |
| `/api/cron/weekly-briefing` | `.../weekly-briefing/route.ts` | `0 13 * * 1` | Weekly Mon 13:00 UTC operator briefing email. |
| `/api/cron/weekly-purchase-plan` | `.../weekly-purchase-plan/route.ts` | `0 13 * * 1` | Weekly Mon 13:00 UTC distributor purchase plan. |
| `/api/cron/group-orders-v2` | `.../group-orders-v2/route.ts` | `0 */2 * * *` | Every 2h — locks expired `SubOrder` tabs (OPEN → LOCKED) and closes expired `GroupOrderV2` (ACTIVE → CLOSED). Added 2026-04-23. Now non-destructive: never auto-closes groups on `expiresAt` alone (see commit `38150db4`). |
| `/api/cron/measure-recommendations` | `.../measure-recommendations/route.ts` | `0 8 * * *` | Daily 08:00 UTC — captures the 14-day after-snapshot for shipped `RecommendationItem` rows (marketing/SEO). Re-mirrors markdown to GitHub. Added 2026-05-03. |
| `/api/cron/operations-snapshot` | `.../operations-snapshot/route.ts` | `30 7 * * *` | Daily 07:30 UTC — runs 10 drift detectors + writes the day's `OperationsSnapshot` row + upserts `OperationsRecommendation` rows. Added 2026-05 (Phase 1B). |
| `/api/cron/operations-drift-hourly` | `.../operations-drift-hourly/route.ts` | `0 * * * *` | Hourly — runs the fast drift detectors only (subset of the daily snapshot) so urgent shortages don't wait 24 h. Added 2026-05. |
| `/api/cron/measure-operations-recommendations` | `.../measure-operations-recommendations/route.ts` | `0 8 * * *` | Daily 08:00 UTC — measures shipped `OperationsRecommendation` rows. Added 2026-05. |
| `/api/cron/operations-briefing` | `.../operations-briefing/route.ts` | `30 13 * * 1` | Monday 13:30 UTC — emails the Operations Director weekly briefing. Added 2026-05 (Phase 1D). |
| `/api/cron/event-abandoned-rsvps` | `.../event-abandoned-rsvps/route.ts` | `*/15 * * * *` | Every 15 min — emails an abandoned-cart nudge for lead-tracked sessions that started but didn't finish ordering. Added 2026-05. |

## Route groups & layouts

- **`(main)` route group** — `src/app/(main)/layout.tsx` wraps: `ai-party-planner`, `areas/*`, `book-now`, `fast-delivery`, `order-now`, `press`, `tabc`, `team`. These do NOT contribute to the URL.
- **Root layout** — `src/app/layout.tsx` wraps every page with HTML shell, `ClientLayoutWrapper`, GA + Meta Pixel components.
- **Section layouts** (non-exhaustive): `about/`, `admin/`, `affiliate/`, `aperol-spritz/`, `austin-byob-venues/`, `austin-partners/`, `bach-parties/`, `bach-parties/products/`, `bach-parties/packages/[tier]/`, `blog/`, `blog/[slug]/`, `blog/category/[category]/`, `boat-parties/`, `boat-parties/products/`, `boat-parties/packages/[tier]/`, `book-now/`, `cart/shared/`, `cart/shared/[id]/`, `checkout/`, `checkout/success/`, `cocktail-kits/`, `contact/`, `corporate/`, `corporate/products/`, `corporate-events-guide/`, `custom-package/`, `delivery/[location]/`, `delivery-areas/`, `faqs/`, `gin-martini/`, `holiday-runner-up/`, `negroni/`, `old-fashioned/`, `ops/`, `order/`, `partners/`, `partners/*/` (per named partner), `payment/`, `plan-event/`, `products/`, `search/`, `services/`, `venues/[slug]/`, `weddings/`, `weddings/order/`, `weddings/products/`, `weddings/packages/[tier]/`.
- **Partner layouts** exist per partner to allow iframe-embeddable CSP — see `next.config.ts` header rules for `/partners/:path*`.

## Complete inventory (generated — regenerate when it drifts)

The curated sections above explain *what things do*; this section exists so the doc is genuinely exhaustive, which the rest of the reference assumes. Regenerate with:

```bash
find src/app -name 'page.tsx' | sed 's|^src/app||; s|/page.tsx$||'
find src/app -name 'route.ts' | sed 's|^src/app||; s|/route.ts$||'
```

### All pages (193)

**/ (root)** — 1

`/`

**/(main)/ai-party-planner** — 1

`/(main)/ai-party-planner`

**/(main)/areas** — 4

`/(main)/areas/downtown`, `/(main)/areas/east-austin`, `/(main)/areas/lake-travis`, `/(main)/areas/south-congress`

**/(main)/book-now** — 1

`/(main)/book-now`

**/(main)/fast-delivery** — 1

`/(main)/fast-delivery`

**/(main)/order-now** — 1

`/(main)/order-now`

**/(main)/press** — 1

`/(main)/press`

**/(main)/tabc** — 1

`/(main)/tabc`

**/(main)/team** — 1

`/(main)/team`

**/[storeId]/invoices** — 1

`/[storeId]/invoices/[...slug]`

**/about** — 1

`/about`

**/account** — 1

`/account`

**/account/addresses** — 1

`/account/addresses`

**/account/group-orders** — 1

`/account/group-orders`

**/account/orders** — 1

`/account/orders`

**/account/preferences** — 1

`/account/preferences`

**/admin** — 1

`/admin`

**/admin/affiliates** — 12

`/admin/affiliates`, `/admin/affiliates/[id]`, `/admin/affiliates/[id]/dashboard`, `/admin/affiliates/bulk-import`, `/admin/affiliates/commissions`, `/admin/affiliates/dashboards`, `/admin/affiliates/embed-generator`, `/admin/affiliates/payouts`, `/admin/affiliates/prospects/bartending`, `/admin/affiliates/prospects/playbook`, `/admin/affiliates/prospects/str`, `/admin/affiliates/prospects/venues`

**/admin/ai-assistant** — 1

`/admin/ai-assistant`

**/admin/analytics** — 2

`/admin/analytics`, `/admin/analytics/recommendations`

**/admin/brians-stuff** — 1

`/admin/brians-stuff`

**/admin/customers** — 2

`/admin/customers`, `/admin/customers/[id]`

**/admin/dashboard** — 1

`/admin/dashboard`

**/admin/email-signups** — 1

`/admin/email-signups`

**/admin/emails** — 2

`/admin/emails`, `/admin/emails/followups`

**/admin/experiments** — 1

`/admin/experiments`

**/admin/features** — 1

`/admin/features`

**/admin/finance** — 6

`/admin/finance`, `/admin/finance/connect-bank`, `/admin/finance/connect-quickbooks`, `/admin/finance/journals`, `/admin/finance/journals/settings`, `/admin/finance/plaid`

**/admin/leads** — 1

`/admin/leads`

**/admin/operations** — 1

`/admin/operations`

**/admin/premiere-credits** — 1

`/admin/premiere-credits`

**/admin/promotions** — 3

`/admin/promotions`, `/admin/promotions/[id]`, `/admin/promotions/new`

**/admin/recommendations** — 1

`/admin/recommendations`

**/admin/reports** — 4

`/admin/reports`, `/admin/reports/customers`, `/admin/reports/inventory`, `/admin/reports/sales`

**/admin/settings** — 1

`/admin/settings`

**/admin/strategy** — 1

`/admin/strategy`

**/admin/sync** — 1

`/admin/sync`

**/admin/upsell-tracker** — 1

`/admin/upsell-tracker`

**/affiliate/apply** — 1

`/affiliate/apply`

**/affiliate/dashboard** — 4

`/affiliate/dashboard`, `/affiliate/dashboard/create-dashboard`, `/affiliate/dashboard/create-order`, `/affiliate/dashboard/orders`

**/affiliate/login** — 1

`/affiliate/login`

**/affiliate/verify** — 1

`/affiliate/verify`

**/atx-delivery-info** — 1

`/atx-delivery-info`

**/austin-4th-of-july-delivery** — 1

`/austin-4th-of-july-delivery`

**/austin-bachelor-concierge** — 1

`/austin-bachelor-concierge`

**/austin-bachelor-party-delivery** — 1

`/austin-bachelor-party-delivery`

**/austin-bachelor-party-delivery-ai-test** — 1

`/austin-bachelor-party-delivery-ai-test`

**/austin-bachelorette-concierge** — 1

`/austin-bachelorette-concierge`

**/austin-bachelorette-party-delivery** — 1

`/austin-bachelorette-party-delivery`

**/austin-byob-venues** — 1

`/austin-byob-venues`

**/austin-concierge** — 1

`/austin-concierge`

**/austin-corporate-event-delivery** — 1

`/austin-corporate-event-delivery`

**/austin-partners** — 1

`/austin-partners`

**/austin-wedding-venue-boats** — 1

`/austin-wedding-venue-boats`

**/austin-wedding-weekend-delivery** — 1

`/austin-wedding-weekend-delivery`

**/blog** — 1

`/blog`

**/blog/[slug]** — 1

`/blog/[slug]`

**/blog/category** — 1

`/blog/category/[category]`

**/boat-parties** — 1

`/boat-parties`

**/boat-parties/packages** — 1

`/boat-parties/packages/[tier]`

**/buckarodeo** — 1

`/buckarodeo`

**/cart/shared** — 2

`/cart/shared`, `/cart/shared/[id]`

**/checkout** — 1

`/checkout`

**/checkout/success** — 1

`/checkout/success`

**/cocktail-kits** — 1

`/cocktail-kits`

**/cocktail-recipes** — 1

`/cocktail-recipes`

**/community/affiliate** — 1

`/community/affiliate/signup`

**/concierge-quote/[leadId]** — 2

`/concierge-quote/[leadId]`, `/concierge-quote/[leadId]/success`

**/contact** — 1

`/contact`

**/corporate-events-guide** — 1

`/corporate-events-guide`

**/corporate/holiday-party** — 1

`/corporate/holiday-party`

**/corporate/products** — 1

`/corporate/products`

**/custom-package** — 1

`/custom-package`

**/dads-gone-wild** — 1

`/dads-gone-wild`

**/dashboard/[code]** — 2

`/dashboard/[code]`, `/dashboard/[code]/success`

**/delivery-areas** — 1

`/delivery-areas`

**/delivery/[location]** — 1

`/delivery/[location]`

**/design-example** — 1

`/design-example`

**/email/preferences** — 1

`/email/preferences`

**/event-quiz** — 1

`/event-quiz`

**/events/4th-of-july-disco-cruise** — 1

`/events/4th-of-july-disco-cruise`

**/events/[slug]** — 1

`/events/[slug]`

**/faqs** — 1

`/faqs`

**/flyer** — 1

`/flyer`

**/full-moon-aug28** — 1

`/full-moon-aug28`

**/full-moon-drinks** — 1

`/full-moon-drinks`

**/full-moon-terms** — 1

`/full-moon-terms`

**/full-moon-thanks** — 1

`/full-moon-thanks`

**/gifts/cocktail-kits** — 1

`/gifts/cocktail-kits`

**/group/[code]** — 2

`/group/[code]`, `/group/[code]/dashboard`

**/group/checkout** — 1

`/group/checkout/success`

**/group/create** — 1

`/group/create`

**/holiday-runner-up** — 1

`/holiday-runner-up`

**/invoice/[token]** — 1

`/invoice/[token]`

**/invoices/[...slug]** — 1

`/invoices/[...slug]`

**/kegs** — 1

`/kegs`

**/landing-page-playbook** — 1

`/landing-page-playbook`

**/landing-pages** — 1

`/landing-pages`

**/newsletter/confirmed** — 1

`/newsletter/confirmed`

**/offline** — 1

`/offline`

**/ops** — 1

`/ops`

**/ops/agent** — 1

`/ops/agent`

**/ops/boat-schedule** — 1

`/ops/boat-schedule`

**/ops/collections** — 2

`/ops/collections`, `/ops/collections/[id]`

**/ops/events** — 1

`/ops/events`

**/ops/full-moon** — 1

`/ops/full-moon`

**/ops/group-orders** — 2

`/ops/group-orders`, `/ops/group-orders/[id]`

**/ops/inventory** — 5

`/ops/inventory`, `/ops/inventory/count`, `/ops/inventory/predictions`, `/ops/inventory/receiving/[id]`, `/ops/inventory/receiving/new`

**/ops/orders** — 4

`/ops/orders`, `/ops/orders/[id]`, `/ops/orders/[id]/edit`, `/ops/orders/create`

**/ops/products** — 3

`/ops/products`, `/ops/products/[id]`, `/ops/products/create`

**/ops/rsvps** — 1

`/ops/rsvps`

**/ops/today** — 1

`/ops/today`

**/order** — 1

`/order`

**/order/last-minute** — 1

`/order/last-minute`

**/partners** — 1

`/partners`

**/partners/[slug]** — 1

`/partners/[slug]`

**/partners/anderson-mill-marina-boat-club** — 1

`/partners/anderson-mill-marina-boat-club`

**/partners/austin-wedding-dj** — 1

`/partners/austin-wedding-dj`

**/partners/boat-babes** — 1

`/partners/boat-babes`

**/partners/cocktail-cowboys** — 1

`/partners/cocktail-cowboys`

**/partners/connected-austin** — 1

`/partners/connected-austin`

**/partners/hotels-resorts** — 1

`/partners/hotels-resorts`

**/partners/inn-cahoots** — 1

`/partners/inn-cahoots`

**/partners/lake-travis-yacht-rentals** — 1

`/partners/lake-travis-yacht-rentals`

**/partners/mobile-bartenders** — 1

`/partners/mobile-bartenders`

**/partners/pitch** — 1

`/partners/pitch`

**/partners/premier-party-cruises** — 1

`/partners/premier-party-cruises`

**/partners/property-management** — 1

`/partners/property-management`

**/partners/vacation-rentals** — 1

`/partners/vacation-rentals`

**/payment** — 1

`/payment`

**/plan-event** — 1

`/plan-event`

**/premier-boat-schedule** — 1

`/premier-boat-schedule`

**/privacy** — 1

`/privacy`

**/products** — 1

`/products`

**/products/[handle]** — 1

`/products/[handle]`

**/rentals** — 1

`/rentals`

**/rentals/chair-rentals-austin** — 1

`/rentals/chair-rentals-austin`

**/rentals/cocktail-table-rentals-austin** — 1

`/rentals/cocktail-table-rentals-austin`

**/rentals/cooler-rentals-austin** — 1

`/rentals/cooler-rentals-austin`

**/reviews** — 1

`/reviews`

**/services** — 1

`/services`

**/terms** — 1

`/terms`

**/venues/[slug]** — 1

`/venues/[slug]`

**/wedding-drink-calculator** — 1

`/wedding-drink-calculator`

**/weddings** — 1

`/weddings`

**/weddings/order** — 1

`/weddings/order`

**/weddings/packages** — 1

`/weddings/packages/[tier]`

**/weddings/products** — 1

`/weddings/products`

### All API routes (332)

**/.well-known/oauth-authorization-server** — 1

`/.well-known/oauth-authorization-server`

**/.well-known/oauth-protected-resource** — 1

`/.well-known/oauth-protected-resource`

**/api/admin/affiliates** — 19

`/api/admin/affiliates`, `/api/admin/affiliates/[id]`, `/api/admin/affiliates/[id]/dashboard`, `/api/admin/affiliates/[id]/impersonate`, `/api/admin/affiliates/[id]/link-order`, `/api/admin/affiliates/[id]/send-welcome`, `/api/admin/affiliates/applications`, `/api/admin/affiliates/applications/[id]/approve`, `/api/admin/affiliates/applications/[id]/reject`, `/api/admin/affiliates/bulk-import`, `/api/admin/affiliates/commissions`, `/api/admin/affiliates/commissions/[id]`, `/api/admin/affiliates/create-and-send`, `/api/admin/affiliates/create-and-send/preview`, `/api/admin/affiliates/lookup`, `/api/admin/affiliates/payouts`, `/api/admin/affiliates/payouts/[id]`, `/api/admin/affiliates/payouts/generate`, `/api/admin/affiliates/stop-impersonating`

**/api/admin/analytics** — 8

`/api/admin/analytics`, `/api/admin/analytics/experiments`, `/api/admin/analytics/ga4`, `/api/admin/analytics/gbp`, `/api/admin/analytics/internal`, `/api/admin/analytics/landing-page`, `/api/admin/analytics/recommendations`, `/api/admin/analytics/vercel`

**/api/admin/events** — 1

`/api/admin/events`

**/api/admin/experiments** — 3

`/api/admin/experiments`, `/api/admin/experiments/[id]`, `/api/admin/experiments/funnel`

**/api/admin/finance** — 18

`/api/admin/finance/journals`, `/api/admin/finance/journals/[id]/approve`, `/api/admin/finance/journals/[id]/reject`, `/api/admin/finance/journals/[id]/reverse`, `/api/admin/finance/journals/config`, `/api/admin/finance/opex`, `/api/admin/finance/plaid`, `/api/admin/finance/plaid/backfill-webhooks`, `/api/admin/finance/plaid/cutover`, `/api/admin/finance/plaid/exchange`, `/api/admin/finance/plaid/health`, `/api/admin/finance/plaid/link-token`, `/api/admin/finance/plaid/purge-non-prod`, `/api/admin/finance/plaid/sync`, `/api/admin/finance/qb/callback`, `/api/admin/finance/qb/connect`, `/api/admin/finance/qb/health`, `/api/admin/finance/snapshot`

**/api/admin/full-moon** — 1

`/api/admin/full-moon/roster`

**/api/admin/inventory** — 1

`/api/admin/inventory/receiving/reocr`

**/api/admin/operations** — 1

`/api/admin/operations/snapshot`

**/api/admin/orders** — 1

`/api/admin/orders`

**/api/admin/recommendations** — 4

`/api/admin/recommendations`, `/api/admin/recommendations/[id]/dismiss`, `/api/admin/recommendations/[id]/execute`, `/api/admin/recommendations/[id]/snooze`

**/api/admin/seo** — 2

`/api/admin/seo/latest-snapshot`, `/api/admin/seo/trigger-scrape`

**/api/admin/strategy** — 3

`/api/admin/strategy`, `/api/admin/strategy/[id]`, `/api/admin/strategy/[id]/updates`

**/api/admin/sync** — 1

`/api/admin/sync`

**/api/admin/verify** — 1

`/api/admin/verify`

**/api/analytics-ingest** — 1

`/api/analytics-ingest`

**/api/cart/share** — 2

`/api/cart/share`, `/api/cart/share/[id]`

**/api/chat** — 1

`/api/chat`

**/api/contact** — 1

`/api/contact`

**/api/cron/affiliate-commissions** — 1

`/api/cron/affiliate-commissions`

**/api/cron/affiliate-payouts** — 1

`/api/cron/affiliate-payouts`

**/api/cron/analytics-snapshot** — 1

`/api/cron/analytics-snapshot`

**/api/cron/boat-schedule-sync** — 1

`/api/cron/boat-schedule-sync`

**/api/cron/event-abandoned-rsvps** — 1

`/api/cron/event-abandoned-rsvps`

**/api/cron/finance-monthly-close** — 1

`/api/cron/finance-monthly-close`

**/api/cron/finance-monthly-rollup** — 1

`/api/cron/finance-monthly-rollup`

**/api/cron/finance-plaid-sync** — 1

`/api/cron/finance-plaid-sync`

**/api/cron/finance-qb-post-sales** — 1

`/api/cron/finance-qb-post-sales`

**/api/cron/finance-qb-pull** — 1

`/api/cron/finance-qb-pull`

**/api/cron/finance-shopify-archive-sync** — 1

`/api/cron/finance-shopify-archive-sync`

**/api/cron/finance-snapshot** — 1

`/api/cron/finance-snapshot`

**/api/cron/finance-stripe-sync** — 1

`/api/cron/finance-stripe-sync`

**/api/cron/finance-weekly-briefing** — 1

`/api/cron/finance-weekly-briefing`

**/api/cron/follow-up-engine** — 1

`/api/cron/follow-up-engine`

**/api/cron/full-moon-deadline** — 1

`/api/cron/full-moon-deadline`

**/api/cron/generate-blog** — 1

`/api/cron/generate-blog`

**/api/cron/group-orders-v2** — 1

`/api/cron/group-orders-v2`

**/api/cron/inbound-email** — 1

`/api/cron/inbound-email`

**/api/cron/lead-hot-alert** — 1

`/api/cron/lead-hot-alert`

**/api/cron/lead-pipeline** — 1

`/api/cron/lead-pipeline`

**/api/cron/measure-operations-recommendations** — 1

`/api/cron/measure-operations-recommendations`

**/api/cron/measure-recommendations** — 1

`/api/cron/measure-recommendations`

**/api/cron/operations-briefing** — 1

`/api/cron/operations-briefing`

**/api/cron/operations-drift-hourly** — 1

`/api/cron/operations-drift-hourly`

**/api/cron/operations-snapshot** — 1

`/api/cron/operations-snapshot`

**/api/cron/premier-embed-health** — 1

`/api/cron/premier-embed-health`

**/api/cron/premiere-credits** — 1

`/api/cron/premiere-credits`

**/api/cron/reconcile-orders** — 1

`/api/cron/reconcile-orders`

**/api/cron/weekly-briefing** — 1

`/api/cron/weekly-briefing`

**/api/cron/weekly-purchase-plan** — 1

`/api/cron/weekly-purchase-plan`

**/api/email/unsubscribe** — 1

`/api/email/unsubscribe`

**/api/events/rsvp** — 1

`/api/events/rsvp`

**/api/experiments/assign** — 1

`/api/experiments/assign`

**/api/experiments/track** — 1

`/api/experiments/track`

**/api/group-orders/[code]** — 10

`/api/group-orders/[code]`, `/api/group-orders/[code]/create-checkout`, `/api/group-orders/[code]/enable-multi-payment`, `/api/group-orders/[code]/host-decision`, `/api/group-orders/[code]/items`, `/api/group-orders/[code]/lock-order`, `/api/group-orders/[code]/participant-checkout`, `/api/group-orders/[code]/payment-status`, `/api/group-orders/[code]/remove-participant`, `/api/group-orders/[code]/update-cart`

**/api/group-orders/create** — 1

`/api/group-orders/create`

**/api/group-orders/id** — 1

`/api/group-orders/id/[id]/join`

**/api/group-orders/my-orders** — 1

`/api/group-orders/my-orders`

**/api/mcp** — 1

`/api/mcp`

**/api/newsletter** — 1

`/api/newsletter`

**/api/newsletter/confirm** — 1

`/api/newsletter/confirm`

**/api/ops/boat-schedule** — 3

`/api/ops/boat-schedule`, `/api/ops/boat-schedule/order/[orderNumber]`, `/api/ops/boat-schedule/sync`

**/api/ops/email-preview** — 2

`/api/ops/email-preview`, `/api/ops/email-preview/send`

**/api/ops/email-template-content** — 1

`/api/ops/email-template-content`

**/api/ops/event-rsvps** — 1

`/api/ops/event-rsvps`

**/api/ops/followups** — 7

`/api/ops/followups/copy`, `/api/ops/followups/flags`, `/api/ops/followups/log`, `/api/ops/followups/queue`, `/api/ops/followups/stats`, `/api/ops/followups/suppressions`, `/api/ops/followups/test-send`

**/api/ops/logout** — 1

`/api/ops/logout`

**/api/ops/nav-badges** — 1

`/api/ops/nav-badges`

**/api/ops/orders** — 2

`/api/ops/orders/[id]/picks`, `/api/ops/orders/cruise-type`

**/api/ops/orders-view** — 1

`/api/ops/orders-view`

**/api/ops/session** — 1

`/api/ops/session`

**/api/ops/today** — 1

`/api/ops/today`

**/api/orders/[orderNumber]** — 1

`/api/orders/[orderNumber]`

**/api/partners/inquiry** — 1

`/api/partners/inquiry`

**/api/products** — 1

`/api/products`

**/api/products/[handle]** — 1

`/api/products/[handle]`

**/api/products/counts** — 1

`/api/products/counts`

**/api/profile/upload-image** — 1

`/api/profile/upload-image`

**/api/public/boat-schedule** — 2

`/api/public/boat-schedule`, `/api/public/boat-schedule/order/[orderNumber]`

**/api/v1/admin** — 65

`/api/v1/admin/collections`, `/api/v1/admin/collections/[id]`, `/api/v1/admin/collections/[id]/products`, `/api/v1/admin/customers`, `/api/v1/admin/customers/[id]`, `/api/v1/admin/dashboard`, `/api/v1/admin/discounts`, `/api/v1/admin/discounts/[id]`, `/api/v1/admin/discounts/automatic`, `/api/v1/admin/discounts/validate`, `/api/v1/admin/draft-orders`, `/api/v1/admin/draft-orders/[id]`, `/api/v1/admin/draft-orders/[id]/email-events`, `/api/v1/admin/draft-orders/[id]/preview`, `/api/v1/admin/draft-orders/[id]/send`, `/api/v1/admin/features`, `/api/v1/admin/group-orders`, `/api/v1/admin/group-orders/[id]`, `/api/v1/admin/leads/[id]`, `/api/v1/admin/leads/[id]/email/[emailId]`, `/api/v1/admin/leads/[id]/reply`, `/api/v1/admin/leads/[id]/stage`, `/api/v1/admin/leads/[id]/touch`, `/api/v1/admin/leads/board`, `/api/v1/admin/leads/sources`, `/api/v1/admin/orders`, `/api/v1/admin/orders/[id]`, `/api/v1/admin/orders/[id]/amend`, `/api/v1/admin/orders/[id]/cancel`, `/api/v1/admin/orders/[id]/refund`, `/api/v1/admin/orders/[id]/return`, `/api/v1/admin/orders/[id]/send-amendment`, `/api/v1/admin/orders/[id]/send-receipt`, `/api/v1/admin/orders/bulk-cancel`, `/api/v1/admin/orders/bulk-fulfill`, `/api/v1/admin/orders/send-review-requests`, `/api/v1/admin/partner-dashboards`, `/api/v1/admin/partner-prospects`, `/api/v1/admin/partner-prospects/[id]`, `/api/v1/admin/partner-prospects/[id]/campaign`, `/api/v1/admin/partner-prospects/ab`, `/api/v1/admin/partner-prospects/campaign`, `/api/v1/admin/partner-prospects/enroll`, `/api/v1/admin/partner-prospects/metrics`, `/api/v1/admin/partner-prospects/sync`, `/api/v1/admin/partner-prospects/test-send`, `/api/v1/admin/partner-prospects/verify`, `/api/v1/admin/premiere-credits`, `/api/v1/admin/premiere-credits/[id]/approve`, `/api/v1/admin/premiere-credits/[id]/cancel`, `/api/v1/admin/premiere-credits/[id]/contact`, `/api/v1/admin/premiere-credits/[id]/resend`, `/api/v1/admin/products`, `/api/v1/admin/products/[id]`, `/api/v1/admin/products/[id]/images/reorder`, `/api/v1/admin/products/[id]/variants/[variantId]`, `/api/v1/admin/products/images`, `/api/v1/admin/products/images/[imageId]`, `/api/v1/admin/reports`, `/api/v1/admin/reports/customers`, `/api/v1/admin/reports/inventory`, `/api/v1/admin/reports/sales`, `/api/v1/admin/shortage-list/email`, `/api/v1/admin/sync`, `/api/v1/admin/unpaid-carts`

**/api/v1/affiliate** — 17

`/api/v1/affiliate/apply`, `/api/v1/affiliate/attribution`, `/api/v1/affiliate/create-dashboard`, `/api/v1/affiliate/create-order`, `/api/v1/affiliate/dashboard-orders`, `/api/v1/affiliate/dev-login`, `/api/v1/affiliate/login`, `/api/v1/affiliate/logout`, `/api/v1/affiliate/magic-link`, `/api/v1/affiliate/me`, `/api/v1/affiliate/me/client-orders`, `/api/v1/affiliate/me/client-orders/[id]/cancel`, `/api/v1/affiliate/me/orders`, `/api/v1/affiliate/me/payouts`, `/api/v1/affiliate/set-password`, `/api/v1/affiliate/templates`, `/api/v1/affiliate/verify`

**/api/v1/agent** — 4

`/api/v1/agent/approve`, `/api/v1/agent/chat`, `/api/v1/agent/conversations`, `/api/v1/agent/reject`

**/api/v1/ai** — 4

`/api/v1/ai/inventory/count`, `/api/v1/ai/inventory/count/[id]/apply`, `/api/v1/ai/inventory/predictions`, `/api/v1/ai/inventory/query`

**/api/v1/ai-party-planner** — 1

`/api/v1/ai-party-planner`

**/api/v1/auth** — 7

`/api/v1/auth/age-verify`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/password`, `/api/v1/auth/register`, `/api/v1/auth/verify`

**/api/v1/cart** — 3

`/api/v1/cart`, `/api/v1/cart/delivery`, `/api/v1/cart/discount`

**/api/v1/chat** — 1

`/api/v1/chat/submit`

**/api/v1/checkout** — 1

`/api/v1/checkout`

**/api/v1/collections** — 2

`/api/v1/collections`, `/api/v1/collections/[handle]`

**/api/v1/concierge** — 3

`/api/v1/concierge/lead`, `/api/v1/concierge/quote/[leadId]`, `/api/v1/concierge/quote/[leadId]/checkout`

**/api/v1/crm** — 1

`/api/v1/crm/lookup`

**/api/v1/event-quiz** — 1

`/api/v1/event-quiz/submit`

**/api/v1/events** — 3

`/api/v1/events/abandon-nudge`, `/api/v1/events/abandon-nudge/cancel`, `/api/v1/events/track`

**/api/v1/features** — 1

`/api/v1/features`

**/api/v1/full-moon** — 3

`/api/v1/full-moon/count`, `/api/v1/full-moon/guests`, `/api/v1/full-moon/ticket`

**/api/v1/inventory** — 11

`/api/v1/inventory`, `/api/v1/inventory/alerts`, `/api/v1/inventory/locations`, `/api/v1/inventory/notes`, `/api/v1/inventory/notes/[id]/apply`, `/api/v1/inventory/notes/[id]/process`, `/api/v1/inventory/receiving`, `/api/v1/inventory/receiving/[id]`, `/api/v1/inventory/receiving/[id]/apply`, `/api/v1/inventory/receiving/[id]/lines/[lineId]`, `/api/v1/inventory/variants/[id]`

**/api/v1/invoice** — 4

`/api/v1/invoice/[token]`, `/api/v1/invoice/[token]/checkout`, `/api/v1/invoice/[token]/discount`, `/api/v1/invoice/[token]/items`

**/api/v1/landing** — 3

`/api/v1/landing/lead-event`, `/api/v1/landing/quote`, `/api/v1/landing/visitor-pixel`

**/api/v1/lead-magnet** — 1

`/api/v1/lead-magnet`

**/api/v1/orders** — 2

`/api/v1/orders`, `/api/v1/orders/[id]`

**/api/v1/partner** — 1

`/api/v1/partner/lead`

**/api/v1/products** — 7

`/api/v1/products`, `/api/v1/products/[id]`, `/api/v1/products/[id]/inventory`, `/api/v1/products/[id]/variants`, `/api/v1/products/catalog`, `/api/v1/products/search`, `/api/v1/products/variant/[variantId]`

**/api/v1/quote** — 1

`/api/v1/quote/start`

**/api/v1/variants** — 1

`/api/v1/variants/[id]`

**/api/v2/group-orders** — 22

`/api/v2/group-orders`, `/api/v2/group-orders/[code]`, `/api/v2/group-orders/[code]/claim-host`, `/api/v2/group-orders/[code]/heartbeat`, `/api/v2/group-orders/[code]/join`, `/api/v2/group-orders/[code]/participants/[pid]`, `/api/v2/group-orders/[code]/recommendations`, `/api/v2/group-orders/[code]/send-link`, `/api/v2/group-orders/[code]/tabs`, `/api/v2/group-orders/[code]/tabs/[tabId]`, `/api/v2/group-orders/[code]/tabs/[tabId]/checkout`, `/api/v2/group-orders/[code]/tabs/[tabId]/checkout-all`, `/api/v2/group-orders/[code]/tabs/[tabId]/delivery-invoice`, `/api/v2/group-orders/[code]/tabs/[tabId]/free-shipping-check`, `/api/v2/group-orders/[code]/tabs/[tabId]/items`, `/api/v2/group-orders/[code]/tabs/[tabId]/items/[itemId]`, `/api/v2/group-orders/[code]/track-view`, `/api/v2/group-orders/[code]/transfer-host`, `/api/v2/group-orders/dashboard`, `/api/v2/group-orders/my-orders`, `/api/v2/group-orders/validate-discount`, `/api/v2/group-orders/validate-promo`

**/api/webhooks/create-dashboard** — 1

`/api/webhooks/create-dashboard`

**/api/webhooks/plaid** — 1

`/api/webhooks/plaid`

**/api/webhooks/resend** — 1

`/api/webhooks/resend`

**/api/webhooks/shopify** — 2

`/api/webhooks/shopify`, `/api/webhooks/shopify/list`

**/api/webhooks/stripe** — 1

`/api/webhooks/stripe`

**/oauth/authorize** — 1

`/oauth/authorize`

**/oauth/register** — 1

`/oauth/register`

**/oauth/token** — 1

`/oauth/token`

**/partners-embed/premier-quote** — 1

`/partners-embed/premier-quote`

**/s/[slug]** — 1

`/s/[slug]`

## See also

- [[INDEX]]
- [[01-overview]]
- [[02-tech-stack-and-architecture]]
- [[04-customer-journey]]
- [[05-data-model]]
- [[06-admin-features]]

---
title: Tech Stack and Architecture
project: PartyOn2
doc_type: codebase-reference
section: architecture
last_generated: 2026-05-20
tags: [partyondelivery, codebase, architecture, stack, env]
---

# Tech Stack and Architecture

## Stack (exact versions from `package.json`)

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack dev) | 15.4.8 |
| UI runtime | React / React DOM | 19.0.0 |
| Language | TypeScript | 5 (`^5`) |
| Styling | Tailwind CSS | 3.4.17 |
| PostCSS / autoprefixer | PostCSS / Autoprefixer | 8.5.6 / 10.4.21 |
| Animation | Framer Motion | 12.23.12 |
| DB driver | `@vercel/postgres` | 0.10.0 |
| ORM | Prisma (`@prisma/client`, `prisma`) | 6.15.0 |
| Auth / JWT | `jose` | 6.1.3 |
| Password hashing | `bcryptjs` | 3.0.3 |
| Payments | `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` (embedded checkout on landing pages) | 20.2.0 / 9.5.0 / 6.3.0 |
| Email | `resend`, `@react-email/components` | 6.9.2 / 1.0.4 |
| SMS / webhook relay | GoHighLevel via `src/lib/webhooks/ghl.ts`; Zapier inbound | n/a (webhook URL only) |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights`, `@google-analytics/data` (GA4 Data API), Meta Pixel, Microsoft Clarity (`@microsoft/clarity`) | 1.5.0 / 1.2.0 / 5.2.1 / 1.0.2 |
| Finance integrations | `plaid`, `react-plaid-link` (bank accounts), `intuit-oauth` (QuickBooks Online) | 42.2.0 / 4.1.1 / 4.2.3 |
| Error / observability | Vercel Analytics Drain (see `api/analytics-ingest`) | n/a |
| Shopify integration | `@shopify/buy-button-js`, `graphql`, `graphql-request` (Admin API only) | 3.0.5 / 16.11.0 / 7.2.0 |
| AI | `@anthropic-ai/sdk`, `@google/generative-ai`, OpenRouter (via fetch) | 0.66.0 / 0.24.1 |
| MCP | `@modelcontextprotocol/sdk` | 1.29.0 |
| Supabase (storage/aux) | `@supabase/supabase-js` | 2.56.0 |
| Blob storage | `@vercel/blob`, `@vercel/kv` | 2.2.0 / 3.0.0 |
| Content | `next-mdx-remote`, `gray-matter`, `marked` | 6.0.0 / 4.0.3 / 16.4.0 |
| Data fetching | `swr` | 2.2.5 |
| Validation | `zod` | 4.3.5 |
| Webhook signing | `svix` | 1.85.0 |
| Charts | `recharts` | 3.6.0 |
| Icons | `@heroicons/react` | 2.2.0 |
| Testing | Vitest, Playwright, Testing Library | 4.0.17 / 1.56.1 / 16.3.1 |
| Hosting | Vercel (crons in `vercel.json`) | — |
| CI | GitHub Actions — `.github/workflows/generate-daily-blog.yml` (daily 14:00 UTC / 9 AM EST) | — |

## Annotated folder tree (`src/`)

```text
src/
├── app/                        # Next.js App Router — 157 page.tsx, 241 route.ts
│   ├── (main)/                 # Route group for marketing pages (areas, press, tabc…)
│   ├── api/
│   │   ├── v1/                 # Primary API: auth, products, orders, cart, inventory, admin, affiliate, invoice
│   │   ├── v2/group-orders/    # Universal dashboard / GroupOrderV2 API
│   │   ├── admin/              # Thin admin endpoints (legacy parallel to v1/admin)
│   │   ├── cron/               # Vercel cron targets (blog, payouts, commissions, reconcile, groups)
│   │   ├── group-orders/       # Legacy v1 group-order endpoints
│   │   ├── ops/                # Ops panel endpoints (boat schedule, email preview, session)
│   │   ├── public/             # Public read endpoints (boat schedule)
│   │   └── webhooks/           # Stripe / Shopify / Resend / create-dashboard webhooks
│   ├── account/                # Customer self-service
│   ├── admin/                  # Admin UI
│   ├── affiliate/              # Affiliate-facing UI
│   ├── bach-parties/, boat-parties/, weddings/, corporate/  # Funnels with tiered packages
│   ├── blog/, blogs/           # MDX blog (content in /content/blog/posts)
│   ├── cart/shared/            # Shared-cart links
│   ├── checkout/               # Stripe checkout
│   ├── dashboard/[code]/       # Universal Order Dashboard
│   ├── delivery/[location]/    # SEO neighborhood pages
│   ├── group/[code]/           # v2 group order flow (renamed from /group-v2)
│   ├── invoice/[token]/        # Customer-facing invoice pay pages
│   ├── oauth/, .well-known/    # OAuth endpoints (agent / MCP)
│   ├── ops/                    # Internal ops panel
│   ├── partners/[slug]/        # Partner landing pages (iframe-embeddable)
│   ├── venues/[slug]/          # BYOB venue pages
│   └── order/                  # Primary product browse
├── components/
│   ├── dashboard/              # Order Dashboard widgets
│   ├── ops/                    # Ops admin components
│   ├── ui/                     # Reusable primitives
│   ├── drink-planner/          # Drink recommendation quiz
│   ├── products/               # Product cards / grids / modals
│   ├── group-orders/, group-v2/, checkout/, affiliate/, partners/, hero/, homepage/, kegs/, mobile/, blog/, byob-venues/, account/, agent/, analytics/, holiday/, seo/, shopify/, skeletons/, gifts/, quick-order/
│   └── index.ts                # Barrel
├── contexts/                   # CartContext, CustomerContext, GroupOrderContext
├── hooks/                      # useIsMobile, useBodyScrollLock, useCollectionCounts, useExperimentVariant, useGroupCartSync, usePerformanceMonitor, useQuickOrderProducts, useScrollReveal, useScrollTracking, useBiffAI
├── lib/
│   ├── affiliates/             # Commission engine, payout generator, magic links
│   ├── agent/                  # AI agent (conversation, proposals)
│   ├── ai/                     # Claude / Gemini helpers
│   ├── analytics/              # GA4, Meta Pixel, Vercel drain
│   ├── auth/                   # JWT + ops-session
│   ├── byob-venues/, calendar/, cart/, collections/, dashboard/
│   ├── database/client.ts      # Prisma client singleton
│   ├── delivery/               # Zone-based delivery fee
│   ├── discounts/              # Promo + automatic discounts
│   ├── draft-orders/           # Invoice service
│   ├── email/                  # Resend templates (invoice, confirmation, etc.)
│   ├── experiments/, features/
│   ├── group-orders/, group-orders-v2/
│   ├── inventory/services/     # Order creation, inventory, product services
│   ├── (loyalty/ removed 2026-04-23 — Prisma models retained for data preservation)
│   ├── mcp/                    # MCP server wiring
│   ├── oauth/                  # OAuth server
│   ├── partners/, premier/
│   ├── products/, product-categories.ts
│   ├── seo/                    # JSON-LD, topic clusters
│   ├── shopify/                # Admin API (sync only)
│   ├── storage/, stripe/, supabase/, sync/, tax/, types/, utils/, vercel/, webhooks/, wedding-packages/
├── middleware.ts               # Canonical domain, affiliate ref cookie, /affiliate auth gate
└── styles/                     # animations.css, mobile.css (via imports)
```

## Architectural patterns

### App Router & rendering
- **App Router** (`src/app/`) across the entire site — no `pages/` directory.
- **RSC by default**; client components are marked with `"use client"` (cart, checkout, interactive dashboard components, ops panels, most admin forms).
- **Route groups**: `(main)` wraps a family of marketing pages (`ai-party-planner`, `book-now`, `fast-delivery`, `order-now`, `press`, `tabc`, `team`, `areas/*`) under a shared `(main)/layout.tsx`.
- **Dynamic segments**: heavy use of `[code]`, `[id]`, `[token]`, `[slug]`, `[handle]`, `[tier]`, and catch-all `[...slug]` (invoices + legacy `/invoices`).
- **Streaming / Suspense**: not configured globally — _Not confirmed in codebase scan — needs human input if critical._

### Server Actions vs Route Handlers
- **No Server Actions** — all mutations go through App Router route handlers (`route.ts`). A repo-wide grep for `'use server'` returns zero hits.
- Two API families: **v1** (general store, admin, auth, inventory, affiliate) and **v2** (GroupOrderV2 / universal dashboard only).

### State management
- **Client cart** — `src/contexts/CartContext.tsx` + localStorage persistence.
- **Customer session** — `src/contexts/CustomerContext.tsx` backed by JWT set by `/api/v1/auth/*`.
- **Group order** — `src/contexts/GroupOrderContext.tsx` + `useGroupCartSync` hook.
- **Data fetching** — `swr` with a central config in `src/lib/swr-config.tsx`.

### Middleware
`src/middleware.ts` does three things:
1. 301 redirect `www.` → apex canonical.
2. Auth-gate `/affiliate/dashboard/*` to `/affiliate/login`.
3. Set 30-day httpOnly `ref_code` cookie from `?ref=` query (affiliate attribution).

### Headers & security
Defined in `next.config.ts`:
- CSP with `script-src`, `frame-src`, `connect-src` explicitly allowlisting Shopify, Google, Facebook, Vercel, Zapier.
- `/partners/*` gets relaxed `frame-ancestors *` (iframe-embeddable for affiliate sites); all other routes `frame-ancestors 'self'`.
- Image/asset cache `max-age=31536000, immutable`.
- Standard hardening headers: HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

### Redirects (declared in `next.config.ts`)
- `/group-v2/:path*` → `/group/:path*` (permanent) — v2 slug rename.
- `/products` → `/order` (unless `?search=`).
- `/quick-order`, `/captains`, `/download-app`, `/safety`, `/weather`, truncated `/blog/:slug*(November…)` artifacts, etc.

## Key libraries & why they're here

| Library | Why |
|---|---|
| `@prisma/client` | Typed DB access against Neon Postgres. |
| `jose` | JWT sign/verify for customer + ops sessions. |
| `stripe` | Checkout sessions, webhooks, invoice collection. |
| `resend` + `@react-email/components` | Transactional email (order confirmation, invoice, affiliate welcome). |
| `svix` | Verifying Resend / other webhook signatures. |
| `next-mdx-remote` + `gray-matter` | MDX blog rendering. |
| `graphql-request` | Shopify Admin GraphQL for catalog sync. |
| `@anthropic-ai/sdk` + `@google/generative-ai` | AI features: inventory OCR, agent, drink planner, blog generation. |
| `@modelcontextprotocol/sdk` | Internal MCP server exposing order/inventory tools. |
| `zod` | Runtime validation at every external boundary (webhooks, APIs, AI output). |
| `swr` | Client-side data fetching in dashboard + admin UIs. |
| `recharts` | Admin reporting charts. |
| `framer-motion` | Landing-page animation. |
| `@vercel/blob` / `@vercel/kv` | Blob storage + KV cache used in image generation and ephemeral state. |
| `@supabase/supabase-js` | Auxiliary storage (not the primary DB) — see `src/lib/supabase/`. |
| `bcryptjs` | Affiliate password hashing when a password is set. |

## Environment variables

Grouped to match the section headers in `.env.example` at repo root. This list is authoritative.

### Google Analytics 4 (public tag)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID for browser tag. |

### Automated blog generation
| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude direct — inventory AI, agent, blog content. |
| `GOOGLE_API_KEY` | Gemini for blog image generation. |
| `UNSPLASH_ACCESS_KEY` | Fallback stock photography. |
| `AUTO_COMMIT` | Blog generation auto-commit toggle. |
| `OPENROUTER_API_KEY` | OpenRouter — used by blog cron (`/api/cron/generate-blog`). |

### Zapier webhooks
| Variable | Purpose |
|---|---|
| `ZAPIER_PARTNER_INQUIRY_WEBHOOK_URL` | `/api/partners/inquiry` handler. |
| `ZAPIER_WEBHOOK_URL` | General fallback Zapier webhook. |
| `NEXT_PUBLIC_ZAPIER_PARTNER_WEBHOOK_URL` | Client-side corporate form posting. |
| `ZAPIER_CONTACT_WEBHOOK_URL` | Contact form destination. |

### Shopify (Admin API only)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SHOPIFY_DOMAIN` | Shopify store domain (public). |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Storefront token (legacy — not used for checkout per CLAUDE.md). |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Primary Admin API token. |
| `SHOPIFY_ADMIN_API_TOKEN` | Alternate name some code paths still read — set either. |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify webhook HMAC secret. |

### Database (Vercel / Neon Postgres)
| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Pooled connection string. |
| `POSTGRES_URL_NON_POOLING` | Direct URL for migrations. |

### Stripe
| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Server key (live). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js publishable key. |

### Auth / admin
| Variable | Purpose |
|---|---|
| `ADMIN_API_KEY` | Guards admin sync & privileged endpoints (`/api/admin/*`). |
| `JWT_SECRET` | HS256 secret for customer + ops JWTs. |
| `NEXTAUTH_SECRET` | Fallback used when `JWT_SECRET` is unset. |
| `ADMIN_PASSWORD` | Admin panel login password. |
| `EMPLOYEE_PASSWORD` | Ops panel session password. |

### App URL
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL — email, checkout redirects, share links. |
| `NEXT_PUBLIC_BASE_URL` | Alt name used by legacy group-orders v1 paths. |

### Cron
| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Bearer token required by `/api/cron/*` endpoints. |

### Email (Resend)
| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend server key. |
| `RESEND_FROM_EMAIL` | Default from-address (e.g. `orders@partyondelivery.com`). |
| `RESEND_WEBHOOK_SECRET` | Signing secret for `/api/webhooks/resend` events. |

### SMS / CRM (GoHighLevel)
| Variable | Purpose |
|---|---|
| `GHL_ORDER_WEBHOOK_URL` | Order confirmation SMS. |
| `GHL_REVIEW_WEBHOOK_URL` | Post-delivery review request. |
| `GHL_DASHBOARD_WEBHOOK_URL` | Dashboard-share SMS. |
| `GHL_WEBHOOK_URL` | Used by `/api/v2/group-orders/[code]/send-link`. |

### Meta Pixel
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Facebook/Meta Pixel ID (falls back to baked-in default if unset). |

### Microsoft Clarity
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Clarity project ID (the value after `clarity.ms/tag/<id>`). Initialized client-side by `src/components/ClarityInit.tsx` in production only. Added 2026-05. |

### Finance Director — QuickBooks Online (Plaid integration too)
Added 2026-05 alongside the Finance Director pipeline (Phase 0+).

| Variable | Purpose |
|---|---|
| `INTUIT_CLIENT_ID` | Intuit developer app client ID (QBO OAuth). |
| `INTUIT_CLIENT_SECRET` | Intuit app client secret. |
| `INTUIT_ENV` | `sandbox` \| `production`. |
| `INTUIT_REDIRECT_URI` | QBO OAuth redirect — must match the value in the Intuit developer console (`/api/admin/finance/qb/callback`). |

### Finance Director — Plaid
| Variable | Purpose |
|---|---|
| `PLAID_CLIENT_ID` | Plaid client ID. |
| `PLAID_SECRET` | Plaid secret (matched to env). |
| `PLAID_ENV` | `sandbox` \| `development` \| `production`. Sandbox creds work with Plaid's `user_good` / `pass_good` fake institution. |

### Supabase (product image storage)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key for client reads. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service-role key. |

### Vercel Blob / KV
| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write (product images, PDFs). |
| `KV_URL` | Vercel KV cache (optional). |

### Google — GA4 Data API + Search Console
| Variable | Purpose |
|---|---|
| `GOOGLE_GA4_PROPERTY_ID` | GA4 property ID for Data API. |
| `GA4_PROPERTY_ID` | Alt name read by some reporting code paths. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | GA4/GSC service account email. |
| `GOOGLE_PRIVATE_KEY` | Service account private key. |
| `GOOGLE_SEARCH_CONSOLE_SITE` | GSC site (e.g. `sc-domain:partyondelivery.com`). |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | JSON blob fallback used by `ga4-behavior`. |

### Google Calendar (ops scheduling)
| Variable | Purpose |
|---|---|
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` | Calendar service account. |
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY` | Calendar private key. |
| `GOOGLE_CALENDAR_ID` | Calendar ID to read/write. |

### MCP (ops AI tooling)
| Variable | Purpose |
|---|---|
| `MCP_AUTH_TOKEN_READ` | Read-only MCP bearer token. |
| `MCP_AUTH_TOKEN_WRITE` | Write-scope MCP bearer token. |
| `MCP_AUTH_TOKEN_READ_PREV` | Previous read token (rotation). |
| `MCP_AUTH_TOKEN_WRITE_PREV` | Previous write token (rotation). |

### Premier Boat — Google Sheet import
| Variable | Purpose |
|---|---|
| `PREMIER_SCHEDULE_PUBLIC_KEY` | Public key for schedule reads. |
| `PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL` | Sheets service account. |
| `PREMIER_SHEET_SERVICE_ACCOUNT_KEY` | Sheets private key. |
| `PREMIER_SHEET_ID` | Google Sheet ID. |
| `BOAT_SCHEDULE_SYNC_KEY` | Guards `/api/ops/boat-schedule/sync`. |

### Vercel Analytics Drain
| Variable | Purpose |
|---|---|
| `VERCEL_DRAIN_SECRET` | Signature verification for `/api/analytics-ingest`. |

## Build / deploy scripts (from `package.json`)

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack on port 3000. |
| `npm run build` | `prisma generate` → `scripts/scan-hero-media.js` → `scripts/scan-vacation-rental-hero.js` → `next build`. |
| `npm run start` | Production Next.js server. |
| `npm run lint` | Next.js ESLint wrapper. |
| `npm run lint:tokens` | Custom design-token linter (`scripts/lint-design-tokens.js`). |
| `npm run test` / `test:run` / `test:coverage` | Vitest. |
| `npm run db:migrate` / `db:push` / `db:studio` / `db:generate` | Prisma CLI wrappers. |
| `npm run generate-blog` / `generate-daily` | AI blog generation via `tsx scripts/automated-daily-blog.ts`. |
| `npm run generate-blog-images` | Gemini image generation for blog posts. |
| `npm run deploy` / `deploy:staging` / `*:windows` | Wraps Vercel deploy + sitemap ping. |
| `npm run sitemap:check` / `:prod` / `:sample` / `sitemap:ping` | Sitemap health + search-engine ping. |
| `npm run indexnow:*` | IndexNow submission helpers. |
| `npm run extract-bundle` | Cocktail bundle image extractor (one-off tooling). |
| `npm run add-partner` | CLI partner onboarding. |
| `npm run sync:marketing` / `:watch` | Mirror `RecommendationItem` rows to the Obsidian vault for the Marketing Director agent. |
| `npm run sync:operations` / `:watch` | Mirror `OperationsRecommendation` rows to the Obsidian vault for the Operations Director agent. Added 2026-05. |

## Conventions (enforced via CLAUDE.md)

- **File size caps**: files < 500 lines, components < 200, functions < 50.
- **No `any`**; use `ReactElement` instead of `JSX.Element`.
- **Zod** at every external boundary.
- **JSDoc** on exports.
- **Design system first** — `memory/design-system.md`, `src/app/globals.css`, `src/app/design-example/page.tsx` are the references; do NOT create ad-hoc styles.
- **Buttons always `rounded-lg`, never `rounded-full`**; text never smaller than `text-sm` for body (`text-xs` only for badges).
- **Hero rule**: `mt-24` below the fixed 96px nav; never combine `h-[100vh]` with `pt-32`.
- **No emojis in UI**; all icons SVG.
- **Path alias** `@/*` → `./src/*`.
- **Live Stripe** — testing with real cards is forbidden.

## See also

- [[INDEX]]
- [[01-overview]]
- [[03-routes-and-pages]]
- [[04-customer-journey]]
- [[05-data-model]]
- [[06-admin-features]]

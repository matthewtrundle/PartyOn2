# PartyOn Delivery - Claude Code Rules

## Project Overview
Premium alcohol delivery service in Austin, TX. Next.js 15.4 + TypeScript + Tailwind CSS 3 + Prisma 6 (Neon Postgres). Deployed on Vercel.

- **Domain**: partyondelivery.com
- **Database**: Neon Postgres via Prisma (`prisma/schema.prisma`)
- **Payments**: Stripe (live keys — do NOT test with real cards)
- **Email**: Resend (`info@partyondelivery.com`)
- **SMS**: GoHighLevel webhook (`src/lib/webhooks/ghl.ts`)
- **Path alias**: `@/*` maps to `./src/*`
- **Shopify**: Admin API only — used for product sync and webhooks, NOT for storefront/checkout

### Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Turbopack, port 3000) |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run lint` | ESLint |
| `npm run test` / `test:run` | Vitest |
| `npm run db:push` | Push schema to Neon (needs `.env.local` sourced) |
| `npm run db:studio` | Prisma Studio |
| `npm run generate-blog` | AI blog generation (Claude via OpenRouter) |
| `npm run deploy` | Deploy to Vercel + ping sitemaps |

---

## DESIGN SYSTEM — MANDATORY

**Before creating or modifying ANY page/component, read these files:**
1. `src/app/globals.css` — All CSS utility classes
2. `src/app/design-example/page.tsx` — Live interactive showcase at `/design-example`

The full token reference (colors, typography, buttons, inputs, cards, spacing) is
the rest of this section — there is no separate design-system file. (`DESIGN-SYSTEM-MIGRATION-PLAN.md`
at the repo root is a Feb-2026 font/color cleanup plan, NOT a token reference.)

**Use existing design system classes. Do NOT create ad-hoc styles that duplicate what already exists.**

### Colors (3 brand colors only)
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-blue` | #0B74B8 | Primary CTAs, focus rings, links |
| `brand-yellow` | #F2D34F | Cart/add buttons, highlights, accents |
| `gold` | #D4AF37 | Premium accent — **dark backgrounds ONLY** |

### Typography
- **Headings**: `font-heading` (Barlow Condensed) with `tracking-[0.1em]`
- **Body**: Inter (default `font-sans`)
- **Buttons**: `font-semibold tracking-[0.08em]`
- H1: `text-4xl md:text-5xl lg:text-6xl`, H2: `text-3xl md:text-4xl`, H3: `text-2xl`, H4: `text-lg font-bold tracking-[0.08em]`

### Minimum Text Sizes — NEVER violate
| Context | Minimum | Forbidden |
|---------|---------|-----------|
| All user-readable content | `text-sm` (14px) | `text-xs` for body text |
| Form labels, input text | `text-base` (16px) | anything smaller |
| Badges/tags (only exception) | `text-xs` (12px) | `text-[10px]` or smaller |

### Button Classes (use these, don't reinvent)
- `.btn-primary` — `bg-brand-blue text-white` (main CTAs)
- `.btn-cart` — `bg-brand-yellow text-gray-900` (add to cart, purchase actions)
- `.btn-secondary` — outlined `bg-white text-brand-blue border-2 border-brand-blue`
- `.btn-ghost` — minimal `text-gray-700 text-sm`
- **ALL buttons**: `rounded-lg` — NEVER `rounded-full`

### Other Design System Classes (use these)
- `.input-premium` — form inputs (includes focus states, hover, placeholder styling)
- `.card` — `bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md`
- `.container-custom` — `container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl`
- `.section-padding` — `py-8 md:py-12 lg:py-16`
- `.hero-overlay` — gradient overlay for hero images

### Color Contrast Rules — MANDATORY

| Background | Allowed Text | FORBIDDEN Text |
|------------|-------------|----------------|
| White / light (`bg-white`, `bg-gray-50`) | `text-gray-900`, `text-gray-700` | yellow, gold, white |
| Yellow / gold (`bg-gold-*`, `bg-yellow-*`) | `text-gray-900` (black) | white, light colors |
| Black / dark (`bg-gray-900`, `bg-black`) | `text-white`, `text-gold-400` | black, dark gray |

**Quick rule**: Gold/yellow accent text is ONLY allowed on dark backgrounds. Gold buttons always get black text.

---

## HERO SECTIONS — #1 RECURRING BUG SOURCE

### The Rule
Nav is fixed, `h-24` (96px), `z-50`. ALL hero sections must account for it.

**Use `mt-24` to push below nav. NEVER combine `h-[100vh]` with `pt-32`.**

### Correct Patterns

**Standard full-bleed hero** (most pages):
```tsx
<section className="relative h-[50vh] md:h-[60vh] mt-24 flex items-center justify-center overflow-hidden">
  <Image src="..." alt="..." fill className="object-cover" priority />
  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/30 to-gray-900/50" />
  <div className="relative text-center text-white z-10 max-w-4xl mx-auto px-8">
    {/* Hero content */}
  </div>
</section>
```

**Tall hero** (homepage, landing pages): Same pattern but `h-[70vh] md:h-[80vh] mt-24`

**Content page** (no hero image — terms, privacy, FAQs): `pt-32 pb-16 px-8` (128px = 96px nav + 32px breathing room)

### Page Height Reference
| Page | Height |
|------|--------|
| Homepage | `h-[70vh] md:h-[80vh] mt-24` |
| Service pages (weddings, boat, bach) | `h-[60vh] md:h-[70vh] mt-24` |
| About, Contact | `h-[50vh] md:h-[60vh] mt-24` |
| Products | `h-[40vh] md:h-[50vh] mt-24` |
| Order | `h-[35vh] md:h-[40vh] mt-24` |
| Terms, Privacy, Blog | `pt-32` (no hero) |

### FORBIDDEN — never do these
- `h-[100vh] pt-32` — double-spacing bug, content overflows
- `h-screen` without adjustment — goes behind fixed nav
- Mobile-specific margin hacks (`mt-[120px] md:mt-0`) — fix the parent section instead
- `pt-24` alone — no breathing room below nav

### SANCTIONED EXCEPTION — LandingPageTemplate paid landers
Pages rendered through `src/components/landing/LandingPageTemplate.tsx`
(bachelor, bachelorette, corporate, wedding-venue-boats, event-quiz, ai-test)
intentionally do NOT render the global `<Navigation/>` — they use the
template's slim sticky header (logo + phone CTA) to keep paid traffic focused,
and their hero is `min-h-[88vh]` with no `mt-24` because there is no fixed nav
on those pages. Decision confirmed 2026-07-02. Do not "fix" these pages to add
Navigation or mt-24, and do not flag them in QA audits.

---

## Navbar Background Rules

Nav defaults to OPAQUE (white bg, dark text). Only routes in `NAV_TRANSPARENT_ROUTES` (in Navigation.tsx) get transparent nav.

- Page WITH dark bg extending behind nav (no `mt-24`) → Add route to `NAV_TRANSPARENT_ROUTES`
- Page with `mt-24` hero or light bg → Do nothing, opaque nav is automatic

## Canonical marketing routes
- Corporate: `/austin-corporate-event-delivery` (since 2026-07-02, `/corporate` 301s to it; subpages `/corporate/holiday-party` + `/corporate/products` remain live)
- The landing-page registry (`src/lib/analytics/landing-pages.ts`) is the single source of truth for canonical + alias marketing routes — check it before adding links or campaigns.

---

## Technical Architecture

### Key Directories
```
src/
├── app/                       # Next.js App Router pages + API routes
│   ├── api/v1/                # Primary API (auth, products, orders, cart, inventory, admin)
│   ├── api/v2/group-orders/   # GroupOrderV2 API (universal dashboard)
│   ├── api/webhooks/          # Stripe, Shopify, Resend webhooks
│   ├── dashboard/[code]/      # Universal Order Dashboard (main order flow)
│   ├── ops/                   # Internal operations panel
│   ├── admin/                 # Admin panel (affiliates, reports, experiments)
│   └── affiliate/             # Affiliate program pages
├── components/
│   ├── dashboard/             # Order Dashboard components (19 files)
│   ├── ops/                   # Operations admin components
│   ├── ui/                    # Reusable UI primitives
│   ├── drink-planner/         # Drink recommendation quiz
│   └── products/              # Product display components
├── lib/
│   ├── stripe/                # Stripe checkout, webhooks, payments
│   ├── inventory/services/    # Order creation, inventory, product services
│   ├── group-orders-v2/       # GroupOrderV2 service, validation, API client
│   ├── draft-orders/          # Draft order (invoice) service
│   ├── affiliates/            # Affiliate service, commission engine, payouts
│   ├── email/templates/       # Resend email templates (invoice, confirmation, etc.)
│   ├── products/              # Product transform, categories
│   ├── shopify/               # Shopify Admin API (sync only — NOT storefront)
│   ├── auth/                  # JWT auth, ops session
│   ├── delivery/              # Delivery fee rates
│   ├── tax/                   # Sales tax calculator
│   └── database/client.ts     # Prisma client singleton
├── contexts/                  # CartContext, CustomerContext, GroupOrderContext
└── styles/                    # animations.css, mobile.css
```

### Data Flow
- **Products**: Synced from Shopify Admin API → Neon Postgres (via `src/lib/sync/`). Served from DB.
- **Orders**: Created via Stripe checkout webhook → `order-service.ts` → Postgres
- **Draft Orders / Invoices**: Created in admin (`/ops/orders/create`) → customer pays via `/invoice/[token]` → Stripe
- **Cart**: React Context + localStorage persistence
- **Auth**: JWT tokens (`jose`) for customer + ops sessions; affiliate uses magic links
- **Schema changes**: `db-migration` skill only — ADR-0008 manual additive SQL + `_manual_migrations` ledger (never `prisma db push`)

### Middleware (`src/middleware.ts`)
- Canonical domain enforcement (www → non-www 301)
- Affiliate attribution via `?ref=` query param (sets 30-day `ref_code` cookie)
- Partner page attribution (`/partners/[code]`)
- Affiliate dashboard auth check (redirects to `/affiliate/login`)

### Key Database Models (Prisma)
| Model | Purpose |
|-------|---------|
| `Product` / `ProductVariant` | Product catalog with variants, pricing, inventory |
| `Order` / `OrderItem` | Completed orders |
| `DraftOrder` / `DraftOrderItem` | Invoices before payment |
| `GroupOrderV2` / `SubOrder` / `DraftCartItem` | Universal dashboard orders |
| `Affiliate` / `AffiliateCommission` / `AffiliatePayout` | Affiliate program |
| `Customer` | Customer accounts |
| `Discount` | Promo codes and discounts |
| `InventoryLevel` / `InventoryNote` | Stock tracking |
| `BlogPost` | Blog content |

---

## Blog System

MDX-based blog stored in `content/blog/posts/` (123 `.mdx` posts). NOT database-backed.

- **Generation**: `npm run generate-blog` — Claude 3 Haiku via OpenRouter API
- **Cron route**: `GET /api/cron/generate-blog` — exists but its schedule was removed from `vercel.json` (2026-08-31). It only `fs.writeFileSync`s, which is a no-op on Vercel's read-only runtime FS, so it never persisted a post regardless.
- **Topics**: `scripts/topics.json` — **all 107 topics published, so the generators produce nothing new** (each picks the first unpublished topic). Add unpublished topics here to resume automated posting.
- **Legacy posts**: Shopify-migrated posts in `src/data/blog-posts/posts.json` (merged at serve time)
- **Rendering**: `MDXContentRSC` component, gray-matter for frontmatter parsing
- **Images**: Optional AI generation via local `image-generator-tool` (saved as WebP to `/public/images/blog/`)
- **SEO**: Schema.org JSON-LD (Article + FAQPage + LocalBusiness), topical clustering via `pillarSlug`
- **Automation**: **DORMANT.** The `generate-daily-blog.yml` GitHub Action's daily schedule is disabled (last auto-post 2026-01-19; topic backlog exhausted) — manual-dispatch only. It committed to `dev`; its "Create PR to main" step never worked (repo blocks Actions from creating PRs) and was removed. New blog content now lands via **manual SEO PRs to `main`**; promote `dev`→`main` with a manual PR when needed.

---

## Forbidden Actions
- Do not run `next build` to verify changes. Use `npx next lint` or `npx tsc --noEmit` for error checking.
- Do not use Playwright or take screenshots to verify layouts.
- Do not read or open image files. Reference images by path only.
- Do not merge or declare a PR done outside the `ship` skill flow (post-merge verification is mandatory).
- Do not run `prisma db push` or `prisma migrate dev` — schema changes go through the `db-migration` skill (a hook blocks these commands).

---

## Code Standards

- Files < 500 lines, components < 200 lines, functions < 50 lines
- No `any` type — use proper TypeScript types
- Use `ReactElement` not `JSX.Element`
- Zod validation for all external data
- JSDoc on all exports
- Images from `/public/images/` (existing assets)
- Cart persists in localStorage
- All icons are SVG — no emojis in UI

---

## Working Discipline — verify before "done"

Skip all of this for trivial fixes (typos, renames, local one-liners — just do them).
The bigger or riskier the change, the more of this is mandatory.

- **Big tasks run on protocol.** For any multi-step/multi-file task, invoke the
  `big-task` skill BEFORE starting; when continuing prior work at session start,
  invoke `recall`. Merges go through the `ship` skill.
- **Verify against the live code, not memory.** Re-read the actual file before
  claiming what it does. Claims like "mirrors X", "ported verbatim", "matches old
  behavior" assert equivalence — prove it by diffing/running both, or downgrade the
  claim. (We have v1/v2 APIs, GroupOrderV2, and two revenue eras — easy to describe
  the wrong one from memory.)
- **A clean diff is not proof.** Before saying done, run the sanctioned gates and
  paste failures: `npx tsc --noEmit`, `npm run lint`, `npm run test:run`.
  (Per Forbidden Actions: never `next build`, Playwright, or screenshots.)
- **Sweep beyond the diff.** A change to a shared type, webhook contract, config, or
  helper can break files the diff never touches — check the other call sites.
- **High-stakes → independent review.** Anything touching auth, Stripe/payments,
  customer PII, affiliate payouts, or webhooks: run the `security-reviewer` agent and
  `/code-review` before merge. Self-review can't see the framing error it's inside.
- **Surface gaps honestly.** When done, name what you did NOT verify and what's out
  of scope. A faithful "I couldn't test X" beats a confident wrong "done."

---

## Analytics & Marketing Optimization

- **Snapshot doc**: `docs/WEBSITE-ANALYTICS.md` — regenerated nightly by `/api/cron/analytics-snapshot` (07:00 UTC). Read this before any conversion/SEO/margin conversation.
- **Marketing Director subagent**: `.claude/agents/marketing-director.md` — invoke when the user asks "what should I work on next," "why is conversion dropping on X," margin questions, or landing-page optimization.
- **Admin endpoints** (all behind `requireOpsAuth`): `/api/admin/analytics/ga4`, `/vercel`, `/gbp`, `/internal` — see subagent file for curl examples.
- **Attribution**: first-touch landing page + UTMs captured client-side via `AttributionTracker` component → Stripe session metadata → `Order.landingPage/utmSource/...`.
- **Margin**: `OrderItem.unitCost/totalCost` + `Order.marginAmount` populated at order creation from `ProductVariant.costPerUnit`. Backfill historical: `npx tsx scripts/backfill-order-margins.ts`.
- **A/B significance**: `src/lib/analytics/experiment-significance.ts` — two-proportion z-test; use `computeSignificance()` to pick winners.
- **Server-side traffic**: a Vercel **Log Drain** posts one NDJSON line per HTTP request to `/api/webhooks/vercel-drain` → `vercel_events`. Page views and the human/bot split are DERIVED from method/status/path + user-agent in `src/lib/analytics/vercel-events.ts` (`getWebsiteInsights()`); shown at `/admin/analytics/traffic`. Log drains emit no `pageview` event type — never filter for one. Request fields are nested under `log.proxy.*`.

---

## Special Business Rules

- **Age verification**: Required modal for alcohol purchases
- **Delivery zones**: Austin area only (zip code validation)
- **Order minimums**: $100-150 depending on zone
- **Meta Pixel**: Tracks PageView, AddToCart, ViewContent, Purchase events (`NEXT_PUBLIC_META_PIXEL_ID`)
- **Google Analytics**: GA4 event tracking (`src/lib/analytics/`)
- **Affiliate program**: Intake, approval, attribution, commission tracking, payout generation
- **Draft orders**: Admin creates invoice → customer receives link → pays via Stripe → order created via webhook

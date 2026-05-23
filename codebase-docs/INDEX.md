---
title: PartyOn2 Codebase Reference — Index
project: PartyOn2
doc_type: codebase-reference
section: index
last_generated: 2026-05-20
tags: [partyondelivery, codebase, index, toc]
---

# PartyOn2 Codebase Reference — Index

PartyOn2 is the Next.js 15 App Router codebase that powers [partyondelivery.com](https://partyondelivery.com), a premium alcohol + party-goods delivery service for Austin, TX. The stack is Next.js 15.4 + React 19 + TypeScript 5 + Tailwind CSS 3 + Prisma 6 on a Neon Postgres database, with Stripe for payments, Resend for email, Shopify Admin API for catalog sync, an affiliate/partner program, a universal group-order "dashboard" flow, a lead-capture + visitor-tracking pixel, a Finance Director pipeline (Plaid + QuickBooks Online), an Operations Director pipeline (drift detectors + snapshot crons), and a rich internal ops/admin panel. This reference is designed for LLM agents: every section is cross-linked, deterministic, and grounded in files that exist in the repo.

## Table of contents

| Doc | Purpose |
|---|---|
| [[01-overview]] | Business context, user types, revenue model, geographic scope. |
| [[02-tech-stack-and-architecture]] | Exact versions, folder tree, App Router patterns, env vars, conventions. |
| [[03-routes-and-pages]] | Exhaustive table of every page + every API route under `src/app/`. |
| [[04-customer-journey]] | Discovery to post-purchase funnel with route-level references. |
| [[05-data-model]] | Prisma schema — all 89 models + 46 enums, ER diagrams, relationships. |
| [[06-admin-features]] | `/admin`, `/ops`, `/affiliate` panels, cron jobs, webhooks, integrations. |

## Quick facts

| Fact | Value |
|---|---|
| Framework | Next.js 15.4.8 (App Router, Turbopack dev) |
| Language | TypeScript 5 (strict mode) |
| UI runtime | React 19 |
| Styling | Tailwind CSS 3.4.17 |
| Database | Neon Postgres via `@prisma/client` 6.15.0 |
| Hosting | Vercel (crons in `vercel.json`) |
| Primary package | `party-on-delivery` v0.1.0 |
| `page.tsx` files | **157** |
| `route.ts` API files | **241** |
| Prisma models | **89** |
| Prisma enums | **46** |
| Blog posts in `content/blog/posts/` | **133** |
| TS/TSX files in `src/` | **1047** |
| Approx. LOC in `src/` (TS + TSX) | **~200,613** |

## How to use this reference (for LLMs)

1. Start with [[01-overview]] for business framing before touching code.
2. For any route question, jump straight to [[03-routes-and-pages]] — it is the single source of truth for `src/app/` and never hallucinates paths.
3. For any data or schema question, [[05-data-model]] mirrors `prisma/schema.prisma` verbatim; do NOT infer columns that are not listed there.
4. Customer-facing flows are traced step-by-step in [[04-customer-journey]] with file citations — use this when a user describes a symptom ("checkout broke", "group order can't add items").
5. For admin/ops/affiliate work see [[06-admin-features]]; this is where auth guards, role checks, and webhook wiring live.
6. If a fact is marked _Not found in codebase — needs human input._, do not guess — surface that flag back to the human.

## See also

- [[01-overview]]
- [[02-tech-stack-and-architecture]]
- [[03-routes-and-pages]]
- [[04-customer-journey]]
- [[05-data-model]]
- [[06-admin-features]]

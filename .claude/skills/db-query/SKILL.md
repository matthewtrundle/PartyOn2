---
name: db-query
description: Run read-only SQL queries against the PartyOn Neon Postgres database. Use whenever the user asks a question that can be answered by looking up rows directly (orders, customers, group dashboards, products, inventory, recommendations, affiliates). Prefer this over writing a one-off `npx tsx` Prisma script.
user-invocable: false
---

# db-query — Read-only Neon SQL helper

You are about to answer a question by hitting the production Postgres database directly. **Read-only.** Never `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, or `ALTER` from this skill — those go through proper migration or admin endpoints.

## Preferred path: Postgres MCP

The project ships `@modelcontextprotocol/server-postgres` wired up via `.mcp.json`. Use its tools first:

- `query` — run a SELECT
- `list_tables` / `describe_table` — when you don't know the schema

The MCP server is already connected to `POSTGRES_URL` from `.env.local`. **No env setup needed.**

## Fallback: `psql` or `tsx` script

If the MCP server is unavailable (new clone, env not loaded, MCP not yet registered with the current session), fall back to a one-shot Bash command:

```bash
set -a && source .env.local && set +a
npx tsx -e "
import { prisma } from './src/lib/database/client';
(async () => {
  const rows = await prisma.\$queryRaw\`SELECT ... LIMIT 20\`;
  console.log(JSON.stringify(rows, null, 2));
  await prisma.\$disconnect();
})();
"
```

Always `LIMIT` aggressively (20–50 rows) — production tables are large.

## Schema cheat sheet (top tables)

- `Order` — completed orders. Filter by `status` (DELIVERED, CONFIRMED, CANCELLED). FK `groupOrderV2Id` → `GroupOrderV2`.
- `OrderItem` — line items, with `unitCost` / `totalCost` / margin fields.
- `GroupOrderV2` — universal dashboards. Boat manifest name is `name` (strip ` Drink Delivery!` suffix). `source: WEBHOOK` came from Premier, `PARTNER_PAGE` is self-serve.
- `SubOrder` — child orders inside a group dashboard.
- `DraftOrder` / `DraftOrderItem` — invoices before payment.
- `Customer` — customer accounts.
- `ProductVariant` — variants with `costPerUnit` (for margin calc).
- `Affiliate` / `AffiliateCommission` / `AffiliatePayout` — partner program.
- `InventoryLevel` / `InventoryNote` — stock tracking.

Schema lives at `prisma/schema.prisma` (97 models). When in doubt, `describe_table` first.

## Safety rules

- **READ ONLY.** No mutations. If the user asks "delete X" or "update Y", refuse and tell them to use the admin UI or a proper migration script.
- **Never log raw rows back if they contain PII outside the conversation.** Customer name / email / phone is fine in chat context; don't paste it into shared artifacts.
- **`prisma/schema.prisma` is not the source of truth for ALL columns.** Memory `prisma_schema_drift.md` says the file has deleted cost columns that still hold prod data. When in doubt, `describe_table` on the live DB.
- **Group orders**: when reporting on an order with `groupOrderV2Id`, always also resolve `GroupOrderV2.name` (boat manifest name) — payer name ≠ manifest name. See `scripts/ops/_group-label.mjs`.

## When NOT to use this skill

- The question is answerable from existing admin endpoints (`/api/admin/analytics/*`, `/api/admin/finance/*`). Those have permission gates and aggregate logic baked in.
- The question is about a recommendation or content — use the relevant director subagent instead.
- The user wants to *modify* data — use the admin UI or write a migration.

---
name: order-lookup
description: Look up a PartyOn customer by name / email / phone and return their orders, group dashboard, boat manifest name, and dashboard URL. Also covers CREATING a new dashboard when one doesn't exist (e.g. operator says "make a dashboard for X"). Use whenever the operator asks "who is X", "is there a dashboard for Y", "what boat is Z on", "make a dashboard for ___", or anything that needs to resolve a person to (or create) their order context.
argument-hint: "<name | email | phone>  OR  create <name> [+email +phone +date +partyType]"
---

You are looking up a person in the PartyOn database. The operator usually wants four things in the answer:

1. **Their order(s)** — order numbers, dates, status, delivery address
2. **Their group dashboard** — share code, dashboard URL, party type
3. **The boat manifest name** — not the payer's name, but the cruise owner's name on `GroupOrderV2.name`
4. **Whether the booking came from Premier** — `externalBookingId` populated and `source: WEBHOOK` means yes

## Lookup workflow

### Step 1 — Resolve the person

Search across `Order.customerName`, `Order.customerEmail`, `Order.customerPhone`, `GroupOrderV2.hostName`, `GroupOrderV2.hostEmail`, `GroupOrderV2.hostPhone`. Case-insensitive `contains` match.

Prefer Postgres MCP (`query` tool) if available. Fallback Bash:

```bash
set -a && source .env.local && set +a
npx tsx -e "
import { prisma } from './src/lib/database/client';
(async () => {
  const term = '<input>';
  const orders = await prisma.order.findMany({
    where: { OR: [
      { customerName:  { contains: term, mode: 'insensitive' } },
      { customerEmail: { contains: term, mode: 'insensitive' } },
      { customerPhone: { contains: term, mode: 'insensitive' } },
    ]},
    select: { id: true, orderNumber: true, customerName: true, customerEmail: true,
              customerPhone: true, deliveryDate: true, deliveryAddress: true,
              status: true, groupOrderV2Id: true, createdAt: true },
    orderBy: { createdAt: 'desc' }, take: 20,
  });
  const groups = await prisma.groupOrderV2.findMany({
    where: { OR: [
      { name:       { contains: term, mode: 'insensitive' } },
      { hostName:   { contains: term, mode: 'insensitive' } },
      { hostEmail:  { contains: term, mode: 'insensitive' } },
      { hostPhone:  { contains: term, mode: 'insensitive' } },
    ]},
    orderBy: { createdAt: 'desc' }, take: 20,
  });
  console.log(JSON.stringify({ orders, groups }, null, 2));
  await prisma.\$disconnect();
})();
"
```

### Step 2 — Resolve each order's group label

For every order with `groupOrderV2Id`, fetch the matching `GroupOrderV2` and apply `scripts/ops/_group-label.mjs`'s `resolveGroupLabel()` rules:

- Strip the ` Drink Delivery!` suffix from `GroupOrderV2.name` → that's the **manifest name**
- If payer name ≠ manifest name, surface both
- `source: WEBHOOK` + non-null `externalBookingId` → came from Premier webhook (will be on boat manifest)
- `source: PARTNER_PAGE` + null `externalBookingId` → self-serve via Premier partner page (NOT on Premier manifest)

### Step 3 — Format the answer

Use this shape:

```
**[Manifest name]** — share code `[CODE]`
- Dashboard: https://partyondelivery.com/dashboard/[CODE]
- Host: [hostName] · [hostEmail] · [hostPhone]
- Party type: [BOAT|BACH|WEDDING|CORPORATE|OTHER] · Status: [ACTIVE|CLOSED]
- Source: [WEBHOOK ✅ on Premier manifest | PARTNER_PAGE ⚠️ not auto-linked to Premier]

Orders ([N]):
- #[orderNumber] — [customerName] · [status] · [deliveryDate] · [city, zip]
```

If the person's `customerName` ≠ the group's manifest name (common — guests pay via host's dashboard), call this out explicitly:

> "Note: orders are placed under **Alexa Dietz** but the host/manifest name is **Allie Montgomery**. Boat manifest will show Allie."

## Edge cases

- **No matches** → suggest alternative spellings (e.g. "Rochelle" → also try "Rachelle"), or ask for an email/phone.
- **`source: PARTNER_PAGE`** → explicitly say the dashboard isn't auto-linked to Premier. Look for other same-day, same-marina groups as candidate cruises.
- **Multiple groups for same person** → list all, sort by `createdAt` DESC.
- **Old Shopify-migrated orders** → may have `groupOrderV2Id: null` and live only in `Order`. That's fine.

---

## Creating a new dashboard

When the operator asks to **make a new dashboard** for someone (no existing match found, or explicitly creating fresh):

### ⚠️ Do NOT `prisma.groupOrderV2.create()` directly

A bare GroupOrderV2 row will render **"No location tab found."** on the dashboard. The UI requires a related `SubOrder` (location tab) AND a host `GroupParticipantV2`. Both need to be created in the same transaction.

### The right way — use the service function

`createDashboardOrder()` in `src/lib/group-orders-v2/service.ts` creates GroupOrderV2 + first SubOrder + host participant + share code + claim token + sensible defaults (delivery fee calc, order deadline 3 days before delivery, address normalization, expiresAt) in one shot.

```bash
set -a && source .env.local && set +a
npx tsx -e "
import { createDashboardOrder } from './src/lib/group-orders-v2/service';

(async () => {
  const result = await createDashboardOrder({
    hostName: 'Renee Safir',
    hostEmail: 'rsdmwedding27@gmail.com',
    hostPhone: '+14157132313',
    partyType: 'BACH',           // 'BOAT' | 'BACH' | 'WEDDING' | 'CORPORATE' | 'OTHER'
    source: 'DIRECT',            // 'DIRECT' | 'PARTNER_PAGE' | 'WEBHOOK'
    name: 'Renee Safir',         // dashboard title (optional — defaults to '<hostName>\\'s Party')
    deliveryDate: '2026-10-15',  // ISO date; defaults to 7 days out
    // deliveryAddress: { address1, city, zip } — optional; left blank means customer fills at checkout
    // affiliateId: 'd21bac1a-...' — only if attached to a partner like Premier
    // isLastMinute: true — only if <14 days out and you want the flag
  });
  console.log('Dashboard URL: https://partyondelivery.com/dashboard/' + result.shareCode);
  console.log('Share code:', result.shareCode);
})();
"
```

### Premier-specific shortcut (boat dashboards at Anderson Mill Marina)

For Premier customers (BOAT + cruise + lodging dashboard), use the dedicated script — it handles affiliate attachment, marina address, 2 tabs (Cruise + Lodging), and the GHL contact webhook:

```bash
node scripts/ops/create-dashboard.mjs \
  --name "Jane Doe" --email jane@example.com --phone +15125551234 \
  --date 2026-10-15 --type private
```

### After creating

1. Surface the dashboard URL: `https://partyondelivery.com/dashboard/<shareCode>`
2. Offer to send the share-link email: `POST /api/v2/group-orders/<shareCode>/send-link` with `{ hostEmail, hostPhone }` — pass empty string for `hostPhone` to send email only (skip SMS).
3. If the event is far in the future (>30 days), the default `expiresAt` may be too short. Extend with a follow-up `prisma.groupOrderV2.update` setting `expiresAt` to ~30 days past the event.

### What you need from the operator before creating

Ask in this order (use AskUserQuestion to batch if multiple are missing):

1. **Party type** (BOAT / BACH / WEDDING / CORPORATE / OTHER)
2. **Host email + phone** (one or both — but at least one is needed to send the link)
3. **Delivery date** (or "let them pick")
4. **Affiliate?** (default: none. Premier = `d21bac1a-3f99-489c-89fd-e1980c264a8d` only if she came through Premier)
5. **Discount code?** (default: none — discounts attach to orders at checkout, not to the dashboard itself)

## Don't

- Don't modify any rows in the LOOKUP flow. (Creation is a separate, explicit operation gated on operator request.)
- Don't expose internal IDs (UUIDs) unless asked — share codes are the user-facing identifier.
- Don't guess a Premier reservation ID — if `externalBookingId` is null, say so. Suggest checking Premier's system by name + phone.
- **Don't `prisma.groupOrderV2.create()` directly** for new dashboards — always use `createDashboardOrder()` or the Premier script. (Bare GroupOrderV2 rows render "No location tab found.")

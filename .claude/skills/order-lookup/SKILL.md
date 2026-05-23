---
name: order-lookup
description: Look up a PartyOn customer by name / email / phone and return their orders, group dashboard, boat manifest name, and dashboard URL. Use whenever the operator asks "who is X", "is there a dashboard for Y", "what boat is Z on", or anything that needs to resolve a person to their order(s) and group context.
argument-hint: "<name | email | phone>"
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

## Don't

- Don't modify any rows. This skill is read-only.
- Don't expose internal IDs (UUIDs) unless asked — share codes are the user-facing identifier.
- Don't guess a Premier reservation ID — if `externalBookingId` is null, say so. Suggest checking Premier's system by name + phone.

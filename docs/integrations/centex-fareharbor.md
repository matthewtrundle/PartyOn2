# Centex Boat Rentals — FareHarbor → Auto-Dashboard Integration

Goal: every booking Centex takes (web **or** phone) is pushed to Party On Delivery,
which auto-creates a co-branded "Drink Delivery" dashboard for that customer and
kicks off the free-delivery offer. This is the same mechanism Premier Party
Cruises runs (Xola → Zapier → our webhook); Centex just uses **FareHarbor**.

- **Booking platform:** FareHarbor (shortname `centexboatrentals`, booking flow `903202`)
- **Affiliate code:** `CENTEXBOATRENTALS`
- **Delivery point (current):** 17141 Rocky Ridge Rd, Austin, TX 78734 (Lake Travis — in our footprint)
- **Outreach model:** Hybrid — Centex embeds the dashboard link in their confirmations/pre-trip comms; we follow up by **email**; **SMS only to customers who opted in** at booking.

## Data flow

```
Centex takes a booking in FareHarbor (online or staff-entered phone booking)
        │  FareHarbor "New Booking" event
        ▼
Zapier  ── FareHarbor trigger → "Webhooks by Zapier" POST action
        │  header: apikey: <Centex webhookApiKey>
        ▼
POST https://partyondelivery.com/api/webhooks/create-dashboard
        ├─ creates a GroupOrderV2 dashboard (boat tab + stock-the-house tab)
        ├─ logs to AffiliateWebhookLog (SUCCESS / FAILED, cross-ref booking_id)
        ├─ (optional) callback → posts dashboard URL back to Centex's system
        └─ notifyDashboardCreated → GHL dashboard.created workflow → email / opt-in SMS
```

## What we need FROM Centex

1. **A FareHarbor API key** — generated in their FareHarbor Dashboard
   (Settings → API / Integrations, or via FareHarbor support). Needed to connect
   the FareHarbor app in Zapier. Confirm their plan tier permits Zapier/API.
2. **A booking opt-in question** (for SMS): a checkbox on the FareHarbor booking
   form like *"Get a free drink-delivery offer from Party On Delivery (texts OK)."*
   FareHarbor supports custom booking questions. Without it, we email only.
3. Confirm the **delivery dock / launch point** and typical **launch times** per boat.

## Our endpoint contract

`POST /api/webhooks/create-dashboard`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `apikey` | Centex `webhookApiKey` (from the provisioning script below) |

JSON body (field names our schema expects):

| Field | Required | Type | Notes |
|---|---|---|---|
| `customer_name` | ✓ | string | Booking contact name |
| `customer_email` | ✓ | string (email) | Must be a valid email or the request is rejected |
| `customer_phone` | ✓ | string | Booking contact phone |
| `items_name` | ✓ | string | Boat / experience booked (e.g. "Party Barge") |
| `guest_count` | ✓ | number or numeric string | Party size |
| `cruise_date` **or** `arrival` | ✓ | string | `YYYY-MM-DD`, or a full ISO datetime in `arrival` (we slice the date) |
| `cruise_start_time` | – | string `HH:MM` (24h) | Sets the delivery window: 2h–1h before launch. Defaults to 12–2 PM if omitted |
| `booking_id` | – | string | FareHarbor booking UUID/PK — cross-reference + dedupe |
| `sms_consent` | – | boolean / `"yes"` / `"true"` | From the opt-in question. Defaults to **false** (email-only) |

## Zapier setup

1. **Trigger:** FareHarbor → *New Booking*. Connect using Centex's FareHarbor API key.
2. **Action:** *Webhooks by Zapier* → **POST**.
   - URL: `https://partyondelivery.com/api/webhooks/create-dashboard`
   - Payload type: JSON
   - Headers: `apikey` = Centex `webhookApiKey`
   - Data (map FareHarbor trigger fields → our fields):

     | Our field | FareHarbor trigger field |
     |---|---|
     | `customer_name` | Contact Name |
     | `customer_email` | Contact Email |
     | `customer_phone` | Contact Phone |
     | `items_name` | Item Name |
     | `guest_count` | Customer Count |
     | `arrival` | Availability Start At (full datetime — we slice the date) |
     | `cruise_start_time` | Availability Start At → formatted `HH:mm` (24h) via a Zapier Formatter step |
     | `booking_id` | Booking UUID / PK |
     | `sms_consent` | Opt-in question answer |

> **Native alternative (phase 2):** FareHarbor also supports first-party webhooks
> (HMAC-SHA256, `x-fareharbor-signature`). That removes the per-task Zapier cost
> but requires us to parse FareHarbor's nested booking payload and verify the
> signature. Start on Zapier (fastest to ship); revisit native webhooks if volume
> makes Zapier task costs meaningful.

## Consent / compliance (Hybrid)

We ingest customer PII and pitch **alcohol**, so SMS is TCPA + A2P 10DLC territory —
no cold texting boat renters.

- The webhook forwards `partner_code` and `sms_consent` to the GHL `dashboard.created` event.
- **GHL workflow must branch:** email everyone; send SMS **only when `sms_consent` is true**.
- Centex owns the first touch to their own customers (link in confirmation / pre-trip),
  which is the cleanest basis for any follow-up we do.

## Provisioning (our side)

```bash
# from the repo root, with env loaded (Node 20+):
node --env-file=.env.local scripts/ops/provision-centex-webhook.mjs
```

Generates (or reuses) the Centex `webhookApiKey`, forces status `ACTIVE`, and
prints the exact `apikey` header value for the Zap. Idempotent.

## Test / demo

> ⚠️ Hitting **production** creates a real dashboard and fires the GHL
> `dashboard.created` workflow. For tests use **your own** name/email/phone so any
> outreach lands on you, not a stranger.

```bash
curl -i -X POST https://partyondelivery.com/api/webhooks/create-dashboard \
  -H 'Content-Type: application/json' \
  -H 'apikey: <CENTEX_WEBHOOK_KEY>' \
  -d '{
    "customer_name": "Allan Demo",
    "customer_email": "allan@partyondelivery.com",
    "customer_phone": "+17373719700",
    "items_name": "Party Barge",
    "guest_count": 12,
    "arrival": "2026-06-28T11:00:00",
    "cruise_start_time": "11:00",
    "booking_id": "FH-DEMO-001",
    "sms_consent": true
  }'
```

A success response returns the `dashboard_url` (`/dashboard/<share_code>`) you can
open to show the auto-generated co-branded dashboard.

## Go-live checklist

- [ ] Centex generates a FareHarbor API key
- [ ] Run `provision-centex-webhook.mjs` (prod) → capture `webhookApiKey`
- [ ] Deploy the code changes (affiliate-aware webhook + Centex preset)
- [ ] Build the Zap (trigger + POST action + field mapping)
- [ ] Update the GHL `dashboard.created` workflow to gate SMS on `sms_consent`
- [ ] (Optional) Centex adds the opt-in question to their FareHarbor booking form
- [ ] End-to-end test with a real test booking (your own contact info)
- [ ] (Optional) Build the bespoke co-branded Centex landing page

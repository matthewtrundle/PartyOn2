# Premiere refund → POD credit codes (setup)

When Premiere Party Cruises refunds a cruise customer, they add a row to the
**POD Credits** tab of their **2026 Booking Masterlist** Google Sheet. A cron
polls that tab, mints a single-use discount code for each new row, texts +
emails it to the customer, and emails Premiere a summary so their VA can paste
the code back into the sheet. Amounts over **$300** are held for your approval
in `/admin/premiere-credits` before anything is sent.

- **Engine:** `src/lib/premiere-credits/engine.ts` (`runPremiereCreditsTick`)
- **Cron:** `GET /api/cron/premiere-credits` — every 15 min (`vercel.json`), `CRON_SECRET` bearer, **fails closed**
- **Sheet reader:** `src/lib/premiere-credits/sheet.ts` — reuses the existing Premier service account, **read-only** (`spreadsheets.readonly`)
- **Codes:** created in the `discounts` table (`FIXED_AMOUNT`, single-use, +60-day expiry); one `premiere_credit_grants` row tracks each grant
- **Delivery:** Resend email (`src/lib/email/templates/premiere-credit.ts`) + GHL SMS (`src/lib/webhooks/ghl-premiere-credit.ts`)
- **Admin:** `/admin/premiere-credits` — approve held codes, resend, add missing contact, and the redeemed-in-period **invoice view**

The code ships **inert**. Both feature flags are off by default, so the cron
returns `{ paused: true }` and does nothing until you complete the steps below.

## The trigger — what starts a code

There is no button and no webhook from Premiere. Every 15 minutes the cron reads
the tab top-to-bottom and treats a row as a **new job** only when **all three**
are true (`src/lib/premiere-credits/parse.ts`):

1. **POD Code cell is empty** — a filled code means "already handled", skip.
2. **POD Credit amount is > 0** — skips the `$0.00` filler rows.
3. **Client Name is filled.**

So the trigger is simply: Premiere fills in the credit amount + customer info and
leaves the POD Code column blank. Within ~15 min the customer gets their code
(unless it's over $300, which waits in the admin page for your approval).

## What only you can do (external, one-time)

### 1. Share the sheet with the service account (read-only)
Premiere owns the Masterlist, so the service account can't see it until it's
shared. Have Grey (or whoever owns the file) share the **2026 Booking
Masterlist** with the value of `PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL` as
**Viewer**. Read-only is deliberate — we never write to their sheet; codes flow
back to them by email (step 4's partner summary).

> The service-account credentials (`PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL` /
> `PREMIER_SHEET_SERVICE_ACCOUNT_KEY`) are **already set** — they're the same
> account the boat-schedule sync uses. You do not need to create a new one.

### 2. Env vars (Vercel → Project → Settings → Environment Variables)
Also mirror these into `.env.local` for local testing. See `.env.example`
(the "Premiere credit automation" block) for the annotated originals.

| Var | Value / notes |
|-----|---------------|
| `PREMIERE_CREDITS_SHEET_ID` | `1e-_SfGeWpukkFv_qElHhhd9djeIzjVakNkjGT8i44MM` (the Masterlist file id) |
| `PREMIERE_CREDITS_SHEET_TAB` | `POD Credits` |
| `PREMIERE_PARTNER_NOTIFY_EMAIL` | where the per-tick "codes issued" summary goes. Comma-separate for more than one recipient — first = To, rest = Cc — e.g. `grey@premierpartycruises.com,va@premierpartycruises.com` |
| `GHL_PREMIERE_CREDIT_WEBHOOK_URL` | the inbound-webhook URL from step 3. **Leave blank** until the GHL workflow exists — SMS is a no-op without it, email still sends |
| `PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL` | already set (shared with the sheet in step 1) |
| `PREMIER_SHEET_SERVICE_ACCOUNT_KEY` | already set |
| `CRON_SECRET` | already set (shared with the other crons) |
| `RESEND_API_KEY` | already set (customer + summary + alert emails) |
| `OPS_ALERT_EMAIL` | optional; the held/needs-contact/failure alert recipient, defaults to `allan@partyondelivery.com` |

### 3. Build the GHL "Premiere Credit — SMS" workflow (for SMS delivery)
The app POSTs a JSON payload to a GHL **inbound webhook**; a workflow turns it
into a text. In GoHighLevel:

1. **Automation → Workflows → Create → Start from scratch.**
2. Trigger: **Inbound Webhook.** Save, then copy its URL → that's
   `GHL_PREMIERE_CREDIT_WEBHOOK_URL` (step 2).
3. Action **Upsert Contact** from the payload fields: `first_name`, `last_name`,
   `email`, `phone`.
4. Action **Add Tag** → `premiere-credit`.
5. Action **Send SMS**, using the payload's merge fields — for example:
   > Party On Delivery: your ${{credit_amount}} credit from Premiere Party
   > Cruises is ready! Code **{{credit_code}}** at {{redeem_url}} — **EXPIRES
   > {{expires_on}}**, one-time use.
6. Publish. Send yourself a test first (point the contact at your own phone).

Available payload fields: `credit_code`, `credit_amount` (e.g. `336.21`),
`expires_on` (e.g. `September 20, 2026`), `redeem_url`, plus the contact fields
above. `redeem_url` is resolved by the app: the customer's own group-order
dashboard (`/dashboard/<shareCode>`, matched by their email) when they have one,
otherwise `https://partyondelivery.com/order` — so it's always a valid link.
Until the workflow exists, leave `GHL_PREMIERE_CREDIT_WEBHOOK_URL` unset and
customers still get the full email — only the text is skipped.

### 4. Turn it on — feature flags (`/admin/features`)
Two flags gate everything; both are off until you create/enable them:

- **`premiere_credits_master`** — the master switch. Off = the cron is a no-op.
  On = it reads the sheet and **mints** codes, but sends nothing on its own.
- **`premiere_credits_send`** — the send switch. On = READY codes are texted +
  emailed automatically. Off = codes sit in `/admin/premiere-credits` for you to
  send by hand (manual **Approve & Send** / **Resend** still work regardless).

**Recommended rollout order:**
1. Finish steps 1–3.
2. Enable **`premiere_credits_master`** only. Wait one tick (~15 min) or curl the
   cron (below). It mints the current backlog (today: 5 ready + Sarah LeBlanc
   $336.21 **held**) and sends nothing.
3. Open `/admin/premiere-credits`, eyeball the minted grants, cancel any already
   handled outside the sheet, and **Approve & Send** LeBlanc's held code once
   you're happy.
4. Enable **`premiere_credits_send`** to make ongoing sends automatic.

## Verify it's live

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://partyondelivery.com/api/cron/premiere-credits
```

- `{ "paused": true }` → `premiere_credits_master` is off (still inert).
- `{ "ok": false, ... "sheet env not configured" }` → step 2 sheet vars missing.
- HTTP **401** → `CRON_SECRET` missing or wrong.
- A Google **403 / "does not have permission"** in the logs → the sheet isn't
  shared with the service account yet (step 1).
- `{ "ok": true, "scanned": N, "minted": M, "held": H, "needsContact": C, "sent": S, "sendFailed": F, "rowErrors": [] }` → working.

## Behavior notes

- **Idempotent.** Each grant is fingerprinted by client name + booking date +
  amount, so re-polling never mints a duplicate — even if Premiere never pastes
  the code back and the row still looks "blank" to the automation. (Re-pasting
  the code into the POD Code column is only cosmetic on their side; it stops the
  row showing as blank.)
- **The $300 hold.** Amounts over $300 (and anything over a $1,000 sanity cap)
  are minted but parked as **HELD_FOR_APPROVAL** — never auto-sent. You release
  them with **Approve & Send** in the admin page.
- **60-day expiry.** Every code expires 60 days from issue; the date is stated
  twice in the email and in the SMS. (Historically these codes had no expiry —
  this is the one intentional change from the old manual process.)
- **No email on the row → held, no code.** A row missing a valid email becomes
  **NEEDS_CONTACT** (no code minted) and shows in the operator alert. Add the
  email in the admin page ("Add Contact") to mint + queue it.
- **One bad row can't block the rest.** Each row is processed in isolation;
  parse/DB failures are collected into `rowErrors` and the tick continues.
- **Operator alerts.** Any tick that produces a hold, a needs-contact, or a send
  failure emails `OPS_ALERT_EMAIL` (default `allan@`) with a link to the admin
  page. A clean tick is silent.
- **Invoicing.** Premiere is billed **only for redeemed codes**. The admin
  page's date-range "invoice view" lists redeemed grants in a period and totals
  both the granted amount and the amount actually applied — pick whichever basis
  you invoice on.
- **Read-only, always.** The service account can only read; the automation
  physically cannot modify the Masterlist. All code delivery to Premiere is by
  the summary email in `src/lib/premiere-credits/notify.ts`.
</content>

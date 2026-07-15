# Inbound email → Lead Flow board (setup)

When a customer emails **info@partyondelivery.com**, a cron polls the mailbox,
turns each likely-inquiry message into a card on `/admin/leads`, and stores the
message so you can read it in the card drawer ("Messages from them") and reply
with the existing composer.

- **Poller:** `src/lib/leads/inbound-email.ts` (`pollInboundEmails`)
- **Cron:** `GET /api/cron/inbound-email` — every 15 min (`vercel.json`), `CRON_SECRET` bearer
- **Gmail client:** `src/lib/email/gmail-client.ts` — reuses the existing Google service account, impersonating info@ with the read-only Gmail scope
- **Storage:** `inbound_emails` table (one row per Gmail message, deduped by message id)

The code ships **inert** until the two Google steps below are done — the cron
returns `{ ok: true, configured: false }` and does nothing.

## What only you can do (external, one-time)

It needs Gmail turned on and permission to read the info@ mailbox.

### 1. Enable the Gmail API
In the Google Cloud project that owns the service account:
**APIs & Services → Enable APIs → Gmail API → Enable.**

### 2. Use a DEDICATED service account (strongly recommended)
Domain-wide delegation is keyed on **(service-account client ID, scope)**, not
on the mailbox — so granting `gmail.readonly` to the *shared analytics* account
(`GOOGLE_SERVICE_ACCOUNT_EMAIL`) would let that key impersonate **any** mailbox
in the Workspace, and a leak of it would then expose every employee's Gmail.
Create a **separate** service account just for this (Cloud console → IAM &
Admin → Service Accounts → Create), and set `GMAIL_SERVICE_ACCOUNT_EMAIL` /
`GMAIL_PRIVATE_KEY` (step 4). The code falls back to the shared `GOOGLE_*`
account if you skip this, but then the blast radius above applies.

### 3. Grant domain-wide delegation for read-only Gmail
Gmail is per-user, so the service account must be allowed to *impersonate* the
mailbox. In the **Google Workspace Admin console** (admin.google.com):

**Security → Access and data control → API controls → Domain-wide delegation → Add new**, then enter:
- **Client ID:** the (dedicated) service account's numeric client ID (Cloud console → the service account → "Unique ID")
- **OAuth scope:** `https://www.googleapis.com/auth/gmail.readonly`

(Read-only on purpose: we never modify labels or send from Gmail — replies go
out through Resend as they do today, and dedupe is tracked in our own DB.)

### 4. Env vars (Vercel → Project → Settings → Environment Variables)
- `GMAIL_SERVICE_ACCOUNT_EMAIL` / `GMAIL_PRIVATE_KEY` — the **dedicated** Gmail service account (step 2). Optional but recommended; falls back to `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`.
- `GMAIL_INBOUND_ADDRESS` — the mailbox to poll. Optional; defaults to `info@partyondelivery.com`.
- `CRON_SECRET` — already set (the cron shares it with the other lead crons).

## Verify it's live

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://partyondelivery.com/api/cron/inbound-email
```

- `{ "configured": false }` → step 1/2 creds missing (service-account env not present).
- HTTP 401 → `CRON_SECRET` missing or wrong.
- A Google **403 / "unauthorized_client"** in the logs → delegation (step 2) not granted yet, or the scope/client-ID is wrong.
- `{ "configured": true, "scanned": N, "ingested": M, "skippedNoise": K, ... }` → working. New inquiries appear on `/admin/leads` within ~15 min.

## Behavior notes

- **Only likely inquiries board.** Mail from `no-reply@`/`notifications@`/etc, or
  carrying `List-Unsubscribe` / `List-Id` / `Precedence: bulk` / `Auto-Submitted`
  headers, or from `@partyondelivery.com`, is skipped and logged quietly
  (`[inbound-email] skipped <reason> <from>`) — never carded. Tune the rules in
  `src/lib/leads/inbound-email-parse.ts` (`shouldIngestInbound`).
- **Idempotent.** Re-polling never double-inserts (unique Gmail message id). The
  window is the last 2 days of INBOX; a message already stored is skipped.
- **Threading.** A customer's reply to our reply lands back in info@ and threads
  onto the same lead (matched by email), bumping it back to "needs response".
- **No auto-reply yet.** This phase only ingests + shows the message; you reply
  manually from the card. AI/automated replies are a planned follow-up.

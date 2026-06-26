# Connecting production Plaid / Wells Fargo (Finance Director)

Right now the Finance Director's bank feed points at the **Plaid sandbox** — a fake test
institution ("Platypus") with synthetic transactions. To reconcile Party On Delivery's
real money (and fill the 2026 expense gap QuickBooks misses), you need to point Plaid at
**production** and connect the real **Wells Fargo** account.

This is a one-time setup. Once it's done, the Director categorizes your real bank outflows
as expenses and reconciles deposits against Stripe payouts — which is what makes monthly
net income trustworthy.

You'll touch three places: the Plaid dashboard, Vercel env vars, and the admin connect
page. ~20–30 minutes (longer if production access needs to be requested first).

> **Plain-language version of what's happening:** the app currently logs into a pretend
> bank. We're switching it to log into your real Wells Fargo, the same way the QuickBooks
> switch went. Wells Fargo makes you sign in on *their* website (that's "OAuth"), so there's
> one extra setting — a return address — that we register so Wells Fargo knows where to send
> you back. The code change for that ships with the cleanup PR; your part is the dashboard +
> Vercel + clicking Connect.

---

## Step 0 — Make sure production access is enabled in Plaid

1. Go to <https://dashboard.plaid.com> and sign in.
2. Check the environment switcher (top of the dashboard). If you only see **Sandbox**, you
   need to request **Production** access: **Team Settings → ... → Request production access**
   (or the "Apply for production" banner). For a first-party single-account use case this is
   usually quick, but it can take a short review — do this first so you're not blocked later.
3. Confirm **Transactions** is among your enabled products.

## Step 1 — Get your production keys from Plaid

1. In the Plaid dashboard, switch the environment to **Production**.
2. **Team Settings → Keys**.
3. Copy the **client_id** and the **Production secret** (there's a separate secret per
   environment — make sure it's the Production one, not Sandbox). Treat the secret like a
   password.

## Step 2 — Register the OAuth redirect URI (required for Wells Fargo)

Wells Fargo is an **OAuth bank** — you sign in on Wells Fargo's own site and get redirected
back. Plaid only allows redirects to URIs you've registered.

1. In the Plaid dashboard: **Team Settings → API → Allowed redirect URIs**.
2. Add exactly (must match character-for-character):
   ```
   https://partyondelivery.com/admin/finance/connect-bank
   ```
3. Save. (The matching `PLAID_REDIRECT_URI` env var in Step 3 must be identical.)

## Step 3 — Set Vercel environment variables (Production)

Vercel dashboard → Party On Delivery project → **Settings → Environment Variables**. Add/
update these for the **Production** environment:

| Variable | Value |
|----------|-------|
| `PLAID_ENV` | `production` |
| `PLAID_CLIENT_ID` | *(client_id from Step 1)* |
| `PLAID_SECRET` | *(Production secret from Step 1)* |
| `PLAID_REDIRECT_URI` | `https://partyondelivery.com/admin/finance/connect-bank` |

If `PLAID_CLIENT_ID` / `PLAID_SECRET` already exist with sandbox values, **overwrite** them
with the production values. (`PLAID_WEBHOOK_URL` is optional — the code already defaults it
to `https://partyondelivery.com/api/webhooks/plaid`.)

## Step 4 — Redeploy

Vercel only picks up new env vars on the next deploy. Either push any commit, or Vercel
dashboard → **Deployments → latest → ⋯ → Redeploy**.

## Step 5 — Reconnect to your real Wells Fargo

1. Go to <https://partyondelivery.com/admin/finance/connect-bank>.
2. It will still show the sandbox connection. Click **Connect bank**.
3. In the Plaid flow, pick **Wells Fargo**. You'll be sent to Wells Fargo's own login —
   **sign in with the real Party On Delivery bank login** and authorize, then you'll bounce
   back to the connect page.
4. The page re-initializes automatically on return (the OAuth handoff) and finishes linking.

## Step 6 — Verify it's production + real

On the connect page, confirm:
- **Environment** now says `production` (not `sandbox`)
- **Institution** shows *Wells Fargo* (not "Platypus" / "First Platypus Bank")
- Your real accounts are listed (checking/savings with the right masks)
- No "Last error"

Then tell Claude it's connected. The cleanup follow-up will: purge the old sandbox data,
run the first production sync, categorize the bank outflows, and rebuild the monthly rollup
so 2026 net income flips to reliable.

---

## Notes

- **Purge the sandbox data after cutover.** The fake "Platypus" PlaidItem + its accounts +
  transactions + sync cursor are removed with
  `POST /api/admin/finance/plaid/purge-non-prod` (deletes everything where
  `environment != 'production'`). The cleanup code also gates all bank-derived expense logic
  on `environment = 'production'`, so sandbox rows never pollute the rollup even before the
  purge — the purge is just housekeeping.
- **Transaction history window.** Plaid backfills roughly the **last ~24 months** on first
  sync. That fills the 2026 expense gap (the whole point); 2021–2022 stays thin and that's
  accepted. QuickBooks remains the source for 2023–2025 expenses.
- **First sync can take a few minutes.** Plaid pulls history asynchronously and fires a
  webhook when ready; the daily `finance-plaid-sync` cron is the safety net if a webhook is
  missed.
- **QuickBooks (the accounting connection) is separate and unaffected** by this. See
  `docs/CONNECT-PRODUCTION-QUICKBOOKS.md`.

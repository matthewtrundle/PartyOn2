# Connecting production QuickBooks (Finance Director)

Right now the Finance Director's QuickBooks link points at the **Intuit sandbox**
— a fake sample company. To pull Party On Delivery's real books (and run the
Phase 5B expense backfill), you need to point it at **production** and reconnect.

This is a one-time setup. Once it's done, the Director reads your real OpEx and
net-profit numbers, and the all-time backfill becomes meaningful.

You'll touch three places: the Intuit developer portal, Vercel env vars, and the
admin connect page. ~20 minutes.

---

## Step 1 — Get production keys from Intuit

1. Go to <https://developer.intuit.com> and sign in.
2. **My Apps** → open the existing Party On Delivery app (the one created during
   Phase 0 setup).
3. Left nav → **Keys & credentials**. There are two tabs: **Development** (what
   we're using now — sandbox) and **Production**.
4. Click the **Production** tab. If it asks you to finish the app profile first,
   fill in the required fields:
   - App name, host domain (`partyondelivery.com`)
   - Privacy policy URL and EULA/terms URL (any live page on the site is fine —
     e.g. `https://partyondelivery.com/privacy` and `/terms`)
   - Select the **com.intuit.quickbooks.accounting** scope
   - Agree to the production terms
   Accessing your *own* single company doesn't require Intuit's full marketplace
   review — completing the profile is enough to activate production keys.
5. Copy the **Production Client ID** and **Production Client Secret**. You'll
   paste these into Vercel in Step 3. (Treat the secret like a password.)

## Step 2 — Set the production redirect URI in Intuit

Still in the Intuit app, under **Keys & credentials → Production**:

1. Find **Redirect URIs**.
2. Add exactly (no trailing slash, must match character-for-character):
   ```
   https://partyondelivery.com/api/admin/finance/qb/callback
   ```
3. Save.

## Step 3 — Set Vercel environment variables (Production)

In the Vercel dashboard → Party On Delivery project → **Settings → Environment
Variables**. Add/update these four for the **Production** environment:

| Variable | Value |
|----------|-------|
| `INTUIT_ENV` | `production` |
| `INTUIT_CLIENT_ID` | *(Production Client ID from Step 1)* |
| `INTUIT_CLIENT_SECRET` | *(Production Client Secret from Step 1)* |
| `INTUIT_REDIRECT_URI` | `https://partyondelivery.com/api/admin/finance/qb/callback` |

If `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET` already exist with sandbox values,
**overwrite** them with the production values.

## Step 4 — Redeploy

Vercel only picks up new env vars on the next deploy. Either:
- Push any commit, or
- Vercel dashboard → **Deployments** → latest → **⋯ → Redeploy**.

## Step 5 — Reconnect to your real QuickBooks

1. Go to <https://partyondelivery.com/admin/finance/connect-quickbooks>.
2. It will still show the sandbox connection. Click **Reconnect QuickBooks**.
3. You'll land on the Intuit consent screen — **sign in with the real Party On
   Delivery QuickBooks login** (not the sandbox/developer account) and authorize.
4. You'll bounce back to the connect page.

## Step 6 — Verify it's production + real

On the connect page, confirm:
- **Environment** now says `production` (not `sandbox`)
- **Company** shows *Party On Delivery* (not "Sandbox Company_US_1" or a sample name)
- No "Last error"

That's it. Tell Claude it's connected and the Phase 5B backfill can run — it'll
pull every Purchase, Bill, Journal Entry (and optionally Sales Receipt / Invoice
/ Deposit) from your real books, then keep current nightly.

---

## Notes

- The sandbox expense rows currently in `qb_expenses` (47 fake ones) should be
  cleared before/after the production backfill so they don't pollute OpEx. The
  Phase 5B backfill script will include a `--purge-sandbox` step keyed on the
  sandbox realm ID.
- Plaid (bank feed) is a separate connection and isn't affected by this.

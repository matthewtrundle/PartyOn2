# Google Ads Conversion Tracking — Setup Guide

The code-level wiring is already in place behind env-var gates. Until the
env vars below are populated in Vercel, conversion firing is a silent
no-op — safe to deploy unset.

## 1. The 3 conversion actions to build in Google Ads UI

In Google Ads UI: **Tools → Conversions → + New conversion action → Website**.
Create all three:

### Wedding Quote Lead

- **Category**: Lead
- **Value**: `0` (no monetary value on a quote — value comes when the invoice is paid)
- **Count**: One (one conversion per click)
- **Deduplication**: None — quote leads don't repeat in a meaningful window
- **Click-through window**: 30 days
- **Attribution model**: Data-driven (fall back to Last click if traffic is too low)
- **Include in "Conversions" column**: Yes (Smart Bidding optimizes toward this)

### Invoice Purchase

- **Category**: Purchase
- **Value**: Use different values per conversion (code sends the Stripe session
  `amount` at fire time)
- **Count**: Every (purchases can legitimately repeat)
- **Deduplication**: by `transaction_id` (code already passes the Stripe session
  id / order id as `transaction_id` so Google can dedupe direct fires against
  any GA4-imported purchase events)
- **Click-through window**: 30 days
- **Attribution model**: Data-driven
- **Include in "Conversions" column**: Yes
- **Enhanced Conversions**: Recommended once live

### Phone Call (Ad)

- **Category**: Lead
- **Source**: Calls from ads (call-extension conversion) — set up via Google's
  "Call from ads" feature, no code change needed
- **Minimum call length**: 60 seconds (filters out misdials)
- **Count**: One

No env var for this one — Google Ads tracks call-extension conversions natively.

## 2. Env-var → conversion-action mapping

| Env var | Value format | Holds |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-XXXXXXXXX` | The account-level tag id, no slash |
| `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID` | `AW-XXXXXXXXX/abc123def456` | Full conversion label for Wedding Quote Lead |
| `NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID` | `AW-XXXXXXXXX/xyz789ghi012` | Full conversion label for Invoice Purchase |

**Important**: the two conversion-id env vars hold the FULL label including
the slash + suffix (`AW-XXXXXXXXX/abc123def456`). That's the value pasted into
`send_to` on `gtag('event', 'conversion', { send_to: ... })`. Not just the
suffix.

## 3. How to find the labels

In Google Ads UI:

1. **Tools → Conversions** → click into the conversion action you created.
2. Scroll to **Tag setup**.
3. Click **Use Google Tag Manager** (don't actually use GTM — this view exposes the raw label).
4. Copy the `send_to` value. It looks like `AW-1234567890/AbCdEfGhIjKlMnOp`.
5. Paste into the corresponding Vercel env var.

Repeat for both Quote and Purchase.

## 4. GA4 linking as redundancy

Beyond the direct `gtag('event', 'conversion', ...)` fires the code already does,
also link Google Ads ↔ GA4:

1. Google Ads → **Tools → Linked accounts → Google Analytics 4** → link the
   GA4 property `376300916`.
2. Once linked, GA4-defined `generate_lead` and `purchase` events can be
   imported into Google Ads as conversion actions automatically.
3. Set the direct-fired actions (above) as **primary** and the GA4-imported
   ones as **secondary** so the same event doesn't double-count.

This is defensive: if the direct `gtag` firing ever breaks (CSP change,
ad-blocker, env-var typo), the GA4 import keeps Smart Bidding fed.

## 5. Verification

After env vars are set in Vercel + deploy is live:

1. Install the [Google Tag Assistant](https://tagassistant.google.com/) Chrome
   extension.
2. Visit `https://partyondelivery.com/wedding-drink-calculator`. Confirm
   gtag.js loads with the `AW-` id.
3. Submit a test quote on the page. Tag Assistant should show a `conversion`
   hit with `send_to` matching `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID`.
4. Run a Stripe test checkout, land on `/checkout/success`. Tag Assistant
   should show a `conversion` hit with the purchase id and dollar `value`.
5. Within ~3 hours, Google Ads UI flips the conversion action status from
   "No recent conversions" to "Recording conversions."

## 6. Where conversions fire in the codebase

| Conversion | File | Trigger |
|---|---|---|
| Wedding Quote Lead | `src/app/wedding-drink-calculator/sections/QuoteFormCard.tsx` | On successful POST to `/api/v1/landing/quote` (form `setStatus('success')` path). Fires both inline + bottom placements; `placement` parameter on the GA4 event distinguishes them. |
| Invoice Purchase | `src/app/checkout/success/page.tsx` | Two call sites — one inside the Stripe-session-fetched `try` block (~line 110), one in the non-Stripe fallback (~line 134). Each fires `gtag('event', 'conversion', ...)` right after its existing `trackMetaEvent('Purchase', ...)` call. |
| Phone Call (Ad) | n/a | Tracked entirely in Google Ads via call-extension setup. No code path. |

All three direct-fire calls are env-gated: if the matching
`NEXT_PUBLIC_GADS_*_CONVERSION_ID` is empty, the `gtag('event', 'conversion', ...)`
call short-circuits and nothing fires. Safe to ship without the env vars set.

## References

- [Set up conversion tracking for your website](https://support.google.com/google-ads/answer/6095821)
- [Use the Google tag for conversion tracking](https://support.google.com/google-ads/answer/12002338)
- [Link GA4 to Google Ads](https://support.google.com/google-ads/answer/9379420)
- [Enhanced conversions for web](https://support.google.com/google-ads/answer/9888656)

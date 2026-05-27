# Google Ads Conversion Tracking — Setup Guide

This doc explains the conversion actions the operator needs to create in
the Google Ads UI before paid traffic to `/wedding-drink-calculator`
(and future landing pages) can be optimized by Smart Bidding.

The code-level wiring is already in place behind env-var gates. Until the
env vars below are populated in Vercel, conversion firing is a silent
no-op — safe to deploy unset.

## The three env vars

| Env var | Holds | Used by |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | The account-level tag id, format `AW-XXXXXXXXX` | `src/components/GoogleAdsTag.tsx` (loads gtag.js) |
| `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID` | Full conversion label for the Quote Lead action, format `AW-XXXXXXXXX/abc123def456` | `src/app/wedding-drink-calculator/sections/QuoteFormSection.tsx` |
| `NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID` | Full conversion label for the Invoice Purchase action, format `AW-XXXXXXXXX/abc123def456` | `src/app/checkout/success/page.tsx` |

**Important**: the conversion-id env vars must hold the FULL label
(`AW-XXXXXXXXX/abc123def456`), not just the suffix after the slash.
That's the value you paste into `send_to` on `gtag('event', 'conversion', ...)`.

## Conversion actions to create in Google Ads

In Google Ads UI: **Tools & Settings → Measurement → Conversions → + New conversion action → Website**.

Create these three actions. For each, capture the resulting "Conversion ID + label" pair
(under "Tag setup → Use Google tag → install yourself") — that's the value the env var holds.

### 1. Quote Lead

- **Conversion name**: `Wedding Bar Quote Submitted`
- **Category**: Submit lead form
- **Value**: Don't use a value for this conversion action (we send `value: 0` from code)
- **Count**: One (one conversion per click — quote forms aren't a repeat action)
- **Click-through conversion window**: 30 days
- **Attribution model**: Data-driven (fall back to Last click if traffic is too low)
- **Includes "Conversions" column**: Yes (Smart Bidding will optimize toward this)

Once created, paste `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID=AW-XXXXXXXXX/quote-label-here` into Vercel.

### 2. Invoice Purchase

- **Conversion name**: `Invoice Purchase (Stripe)`
- **Category**: Purchase
- **Value**: Use different values for each conversion (code passes the `value` from the Stripe session amount)
- **Count**: Every (purchases can repeat)
- **Click-through conversion window**: 30 days
- **Attribution model**: Data-driven
- **Includes "Conversions" column**: Yes
- **Enhanced conversions**: Recommended once live — code already passes `transaction_id` for dedup

Once created, paste `NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID=AW-XXXXXXXXX/purchase-label-here` into Vercel.

### 3. Phone Call

- **Conversion name**: `Wedding Calculator Phone Call`
- **Category**: Phone call lead
- **Method**: Calls from ads using call extensions (set up via Google's "Call from ads" — no code change needed)
- **Minimum call length**: 60 seconds (filters out misdials)
- **Count**: One

No env var for this one — Google Ads tracks call-extension conversions natively.
It's listed here so the operator remembers to enable it in the same setup pass.

## GA4 ↔ Google Ads link (redundancy)

In parallel with the direct conversion firing above, link the GA4 property to
Google Ads (**Google Ads UI → Tools & Settings → Linked accounts → Google Analytics (GA4)**).
That gives Google Ads access to GA4-defined `generate_lead` and `purchase`
events as importable conversions. If the direct `gtag('event', 'conversion')`
calls ever drift or block, the GA4 import keeps Smart Bidding fed.

Set the direct-fired action as **primary** and the GA4-imported version as
**secondary** for the same conversion category, so they don't double-count.

## Verifying it works

1. Once env vars are set in Vercel and a build is deployed, open the
   calculator page in Chrome with the [Google Tag Assistant](https://tagassistant.google.com/)
   extension. Confirm gtag.js loads with the `AW-` id.
2. Submit a test quote. Tag Assistant should show a `conversion` hit
   with `send_to` matching `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID`.
3. Run a Stripe test checkout and land on `/checkout/success`. Tag Assistant
   should show a second `conversion` hit with the purchase id and `value`.
4. In Google Ads UI, the conversion action status will flip from
   "No recent conversions" to "Recording conversions" within ~3 hours of the first fire.

## References

- [Set up conversion tracking for your website](https://support.google.com/google-ads/answer/6095821)
- [Use the Google tag for conversion tracking](https://support.google.com/google-ads/answer/12002338)
- [Link Google Analytics 4 to Google Ads](https://support.google.com/google-ads/answer/9379420)
- [Enhanced conversions for web](https://support.google.com/google-ads/answer/9888656)

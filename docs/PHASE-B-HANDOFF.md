# Phase B Handoff — Wedding Calculator + Conversion Tracking

_Written 2026-05-27. For the other Claude Code session picking up Phase B work._

## TL;DR

Phase B is in the home stretch. The **wedding calculator page is design-complete and tracking-complete on the calculator side**. What's left is the **non-calculator** scaffolding: Google Ads global tag, `/checkout/success` Purchase event, lead-magnet config fix, env docs.

This file is your scope. Do every item in **§ "Still to do"** below. Don't touch anything in **§ "Hands off"** unless explicitly asked.

---

## § Hands off — DO NOT MODIFY

The wedding calculator page (`/wedding-drink-calculator`) is finished. The editorial-estate visual design + conversion-tracking calls are both live and tested. Touching these files risks breaking the design or duplicating tracking calls that already fire.

| File | Status |
|---|---|
| `src/app/wedding-drink-calculator/page.tsx` | Final — server component, FAQ/HowTo JSON-LD, 7 FAQs |
| `src/app/wedding-drink-calculator/CalculatorPageBody.tsx` | Final — composes all sections, includes inline quote form below calculator |
| `src/app/wedding-drink-calculator/CalculatorClient.tsx` | Final — editorial inputs (no card chrome, hairline-underline fields) |
| `src/app/wedding-drink-calculator/CalculatorResults.tsx` | Final — monumental drink count, hairline shopping list, no in-result email form |
| `src/app/wedding-drink-calculator/sections/CalculatorHero.tsx` | Final — 88vh hero with corner marks, italic gold accent, gold-outline CTA. `trackCTAClick` already fires. |
| `src/app/wedding-drink-calculator/sections/WhyYouNeedUs.tsx` | Final — numbered editorial rows + refund callout |
| `src/app/wedding-drink-calculator/sections/ReceptionPackagesColumns.tsx` | Final — 3-column editorial layout, featured column overflows with gold frame |
| `src/app/wedding-drink-calculator/sections/GuaranteeRow.tsx` | Final — editorial manifesto pull-quote |
| `src/app/wedding-drink-calculator/sections/EditorialReviews.tsx` | Final — dark espresso, giant gold quote marks |
| `src/app/wedding-drink-calculator/sections/HowMathWorks.tsx` | Final — drop cap + numbered mistakes |
| `src/app/wedding-drink-calculator/sections/FaqColumn.tsx` | Final — hairline-divided rows, gold "+" markers |
| `src/app/wedding-drink-calculator/sections/QuoteFormCard.tsx` | Final — shared RSVP-card form used in both inline + bottom placements. Fires Meta `Lead` + GA4 `generate_lead` + gtag `conversion` (env-gated). |
| `src/app/wedding-drink-calculator/sections/QuoteFormSection.tsx` | Final — bottom-of-page wrapper around `QuoteFormCard` |
| `src/app/wedding-drink-calculator/sections/MobileStickyCta.tsx` | Final — espresso bg, gold-outline ghost button. `trackCTAClick` already fires. |
| `src/app/wedding-drink-calculator/sections/receptionPackages.ts` | Final — 3 tiers (Beer & Wine $1,199 / Standard Bar $1,799 featured / Top Shelf + Toast $2,199), all 100 guests, no non-consumables |

**Conversion tracking already wired on the calculator:**
- Hero CTA → `trackCTAClick('Show me the calculator', '#calculator', 'wedding_calc_hero')`
- Package CTAs → `trackCTAClick('Get My Wedding Bar Quote', '#quote-form', 'wedding_calc_package')` (via `scrollToQuoteForm` in `CalculatorPageBody.tsx`)
- Mobile sticky → `trackCTAClick('Get My Wedding Bar Quote', '#quote-form', 'wedding_calc_sticky')`
- Quote form success (both inline + bottom placements) → `trackMetaEvent('Lead', {...})` + `gtag('event', 'generate_lead', {...})` + `gtag('event', 'conversion', { send_to: NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID, ... })`

The Google Ads conversion fire is **already env-gated** — it's a no-op until the operator fills `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID` in Vercel.

---

## § Still to do — YOUR SCOPE

Six items, all small. Do them in order.

### 1. Lead-magnet config fix (2 min)

`src/lib/leadMagnet/config.ts` lines ~82-101:

- Replace `'/austin-wedding-delivery'` → `'/austin-wedding-weekend-delivery'`
- Replace `'/austin-corporate-party-delivery'` → `'/austin-corporate-event-delivery'`
- Add `'/wedding-drink-calculator'` to the `excludePages` array (after `'/affiliate/*'`)

Why: the first two are stale route names that don't exist (popup never fires there). The third prevents the playbook popup from competing with the dedicated quote form on the calculator.

### 2. Install Google Ads global tag (15 min)

Create `src/components/GoogleAdsTag.tsx` mirroring the structure of `src/components/GoogleAnalytics.tsx`:

- Reads `process.env.NEXT_PUBLIC_GOOGLE_ADS_ID` (format: `AW-XXXXXXXXX`)
- Returns null if env var missing OR `NODE_ENV !== 'production'`
- Otherwise loads `https://www.googletagmanager.com/gtag/js?id=${id}` via `<Script strategy="lazyOnload">` and calls `gtag('config', id)`

**Important:** GA4 (`GoogleAnalytics.tsx`) already initializes `window.dataLayer` and `function gtag()`. Your component must NOT re-declare these — just call `gtag('config', adsId)` directly. Otherwise the two scripts will fight.

Mount the component in `src/app/layout.tsx` next to the existing `<GoogleAnalytics />` and `<MetaPixel />` (search for those to find the spot).

### 3. Document env vars + Google Ads setup (10 min)

Append to `.env.example`:
```
# --- Google Ads conversion tracking (Phase C) ---
# Operator fills these once conversion actions are built in the Google Ads UI.
# Empty values are safe — conversion firing is a no-op until populated.
NEXT_PUBLIC_GOOGLE_ADS_ID=
NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID=
NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID=
```

Create `docs/GOOGLE-ADS-CONVERSIONS.md` (~80 lines):

- **Section 1 — The 3 conversion actions to build in Google Ads UI:**
  - "Wedding Quote Lead" — category Lead, value 0, no-deduplicate
  - "Invoice Purchase" — category Purchase, value from transaction, deduplicate by `transaction_id`
  - "Phone Call (Ad)" — category Lead, via call-extension conversion (separate setup)
- **Section 2 — Env-var → conversion-action mapping:**
  - `NEXT_PUBLIC_GOOGLE_ADS_ID` = `AW-XXXXXXXXX` (the account ID without slash)
  - `NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID` = full label `AW-XXXXXXXXX/abc123def456`
  - `NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID` = full label `AW-XXXXXXXXX/xyz789ghi012`
- **Section 3 — How to find the labels:** Google Ads → Tools → Conversions → click action → "Tag setup" → "Use Google Tag Manager" → copy the `send_to` value
- **Section 4 — GA4 linking as redundancy:** Google Ads → Linked accounts → Google Analytics 4 → link the GA4 property so any `generate_lead` / `purchase` events from GA4 import as conversions automatically (defensive — if direct gtag firing breaks, GA4 import keeps tracking working)
- **Section 5 — Verification:** Google Ads → Tag Assistant → load `/wedding-drink-calculator` → submit a test quote → verify the conversion fires
- **Section 6 — Where conversions fire in the codebase:**
  - Quote lead: `src/app/wedding-drink-calculator/sections/QuoteFormCard.tsx` on successful POST to `/api/v1/landing/quote`
  - Purchase: `src/app/checkout/success/page.tsx` (after you complete step 4 below)

### 4. Add Purchase conversion to /checkout/success (10 min)

In `src/app/checkout/success/page.tsx`, find the existing `trackMetaEvent('Purchase', ...)` calls (lines 110 and 134 as of last read).

Right after each one, add:

```ts
if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
  const conversionId = process.env.NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID;
  if (conversionId) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value: orderTotal, // use the same value the Meta call uses at this site
      currency: 'USD',
      transaction_id: orderId, // match the variable name in scope
    });
  }
}
```

Match the variable names that already exist in scope at each call site (one is in a `try`, one is the fallback). Don't refactor — just add gtag firing next to the Meta firing.

### 5. Audit ops/orders/[id] for deliveryNotes visibility (5 min)

The quote form stores the calculator summary in `DraftOrder.deliveryNotes` (because some calculator output items don't have matching product handles — operator has to add them manually). Verify the ops admin UI surfaces this field prominently.

- Grep for the ops draft-order detail view (likely `src/app/ops/orders/[id]/page.tsx` or `src/app/ops/draft-orders/[id]/page.tsx`)
- Check whether `deliveryNotes` is rendered, where, and how visible

If it's visible: no action.

If it's hidden / truncated / buried: **DO NOT FIX**. Append a short section to the bottom of `docs/wedding-calculator-upgrade-spec.md` titled `"Phase B follow-up: ops admin UI shows deliveryNotes?"` with the file path + line range showing the gap. The operator will decide whether to fix.

### 6. Verification (5 min)

- `npx tsc --noEmit` — clean (one pre-existing unrelated error in `src/__tests__/group-v2-payments.test.ts` is expected, ignore it)
- `npx next lint` — no NEW errors in your changed files
- **DO NOT** run `next build` (project rule per CLAUDE.md)
- **DO NOT** use Playwright or take screenshots (project rule)

---

## § Constraints — project rules (per CLAUDE.md)

- All buttons `rounded-lg` — never `rounded-full`
- No emojis in UI code (SVG icons only)
- Components <200 lines, files <500 lines
- No `any` type; use `ReactElement` not `JSX.Element`
- Use design-system classes (`.btn-primary`, `.btn-cart`, `.input-premium`, `.card`, etc.) when adding non-wedding components
- Wedding calculator uses its own editorial palette (champagne gold `#C8A96A`, espresso `#1a1410` / `#2A2218`, mocha `#7E5A40`, cream `#FBF6EC`) — **don't apply the brand-blue/brand-yellow palette there**

---

## § Out of scope — operator only

These pieces are NOT yours. Don't attempt them.

| Item | Why operator-only |
|---|---|
| Live end-to-end quote-form submission test | Operator submits with real email, verifies invoice arrives + DraftOrder row populates correctly + `Order.landingPage`/`utmCampaign`/`segment` capture at payment time |
| Visual desktop + mobile QA | Operator eyeballs the page in browser at multiple viewports |
| Create 3 Google Ads conversion actions in Google Ads UI | Phase C work — requires operator login + campaign setup |
| Fill the 3 `NEXT_PUBLIC_GADS_*` env vars in Vercel | Operator does this once conversion-action IDs exist |
| Close upstream Phase B task IDs `#15, #20, #21, #22, #23, #27` | Lives in Obsidian; operator's tracker |
| "Add All to Cart" button below calculator | Deferred by operator — keep task in the list, don't build |

---

## § Report back

When done, write a short summary back. Include:

1. **Files changed** — one bullet per file with a one-liner of what changed
2. **`tsc` + `lint`** — clean or what's left
3. **Deferred follow-ups discovered** — e.g. if step 5 found an ops UI gap, the path + line range you appended to the spec doc
4. **The 3 env-var names that need to be filled in Vercel** for conversions to actually go live
5. **Confirmation that you did NOT touch any file in § Hands off**

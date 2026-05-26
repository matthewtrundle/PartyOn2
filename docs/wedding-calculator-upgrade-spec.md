# Wedding Drink Calculator — Wes + Hormozi Upgrade Spec (Phase B)

_Last updated: 2026-05-24. Source: Wes + Hormozi audit deliverable (agent transcript `a8064e71a595bdae7`), plan file `/Users/allan/.claude/plans/actually-the-pages-i-distributed-swan.md`._

## Why this exists

The `/wedding-drink-calculator` page is the first Google Ads landing target for Party On Delivery. It has proven organic demand (~400 clicks/mo at avg position ~14) but was built for SEO, not for ad conversion. The audit scored it 3/14 on the Wes McDowell 16-checklist and 8/20 on Hormozi's Value Equation. **Recommendation was UPGRADE, not REBUILD** — the calculator mechanics, FAQ, and Schema.org structured data are all solid; the conversion layers around them are missing.

This doc is the consolidated implementation spec — audit findings + operator decisions, ready to execute in a fresh session.

## Operator decisions (locked 2026-05-24)

| Question | Decision |
|---|---|
| Guarantee copy | "If we're late, we'll refund your delivery fee. No questions asked." (delivery-fee refund — lower exposure than free setup) |
| Hero image | `/images/services/weddings/outdoor-bar-setup.webp` (distinct from wedding-weekend page) |
| Sample packages | 3 reception-bar tiers by guest count: 50 / 100 / 150 (middle featured = 100-guest "MOST BOOKED"). New static recipes, not the weekend-oriented packages from `wedding.ts`. |
| Primary CTA strategy | Single quote form (Wes "one conversion goal"). REPLACES both existing CTAs ("Start Wedding Order" + "Wedding Services"). Quote form POSTs to existing `/api/v1/landing/quote` endpoint with `occasion='wedding'`. |
| Cross-link | New page should link to `/austin-wedding-weekend-delivery` from a small "Need the full weekend coordinator?" callout near the sample packages section. |

## Critical files

**Read these first:**
- `/Users/allan/.claude/plans/actually-the-pages-i-distributed-swan.md` — the approved plan
- `src/app/landing-page-playbook/content.ts` — Wes principles (sections 1 + 7 are the rubric)
- `src/app/wedding-drink-calculator/page.tsx` — current state (227 lines, server component)
- `src/app/wedding-drink-calculator/CalculatorClient.tsx` — interactive calculator (client component)
- `src/components/landing/configs/wedding.ts` — for reviews data + theme colors
- `src/components/landing/LandingPageTemplate.tsx` — source for component extraction
- `src/components/landing/QuickBuyModal.tsx` (792 lines) — modal pattern reference
- `src/app/api/v1/landing/quote/route.ts` — quote-submission endpoint (no changes needed, calculator just POSTs to this)
- `docs/AD-CAMPAIGN-UTM-CONVENTION.md` — UTM tagging the page must support
- `2026-05-14-ad-creatives-and-pinterest.md` (Obsidian vault) — Campaign 4 wedding ad copy for message-match

**Files to modify:**
- `src/app/wedding-drink-calculator/page.tsx` — major restructure (see Page structure below)
- `src/app/wedding-drink-calculator/CalculatorClient.tsx` — surface calculator state to parent OR hook into quote form
- `src/components/landing/sections/` — NEW directory for extracted Wes section components (see Component Extraction below)

**Files NOT to modify (compliance fixes already shipped):**
- The 21+/TABC compliance badge strip is already added to the calculator hero (lines 117–138 after the subhead). Don't remove it.
- `LandingPageTemplate.tsx` line 672 already has the `/tabc` Link. Don't remove it.
- `heroTrustBadges` arrays on bachelor/bachelorette/corporate configs are now populated. Don't reset to `[]`.
- All 4 Wes configs have `quoteInbox: 'info@partyondelivery.com'`. Don't revert.

## Component extraction (per audit recommendation)

Extract 3 reusable section components from `LandingPageTemplate.tsx` into a new directory `src/components/landing/sections/`:

1. **`PainSolutionSection.tsx`** — accepts `{ headline, body, theme }` props. Source: `LandingPageTemplate.tsx` lines ~370–415 (the pain section).
2. **`PackageCardGrid.tsx`** — accepts `{ packages: Package[], theme, onCardClick? }` props. Source: lines ~417–550 (the packages grid). Should support a `featured: true` package being scaled 1.03× and bordered in brand color.
3. **`ReviewsSection.tsx`** — accepts `{ reviews: Review[], theme, eyebrow?, headline? }` props. Source: lines ~570–620 (the social proof section).

Do NOT extract the hero or modal — too much config coupling.

After extraction:
- `LandingPageTemplate.tsx` should import and render these instead of inlining the markup
- The calculator page imports them directly without instantiating the full template

Pre-flight: run `npx tsc --noEmit` + `npx next lint` after extraction, before adding new content to the calculator. The extraction should be a no-op visually for the 4 Wes pages.

## Page structure after upgrade

Section order top → bottom:

### A. Hero (replaces lines 107–139, keeps the 21+ compliance strip at lines 117–138)

Add a full-bleed hero image section following the standard pattern from `CLAUDE.md`: `h-[60vh] md:h-[70vh] mt-24`. Background image: `/images/services/weddings/outdoor-bar-setup.webp`.

Proposed copy (message-matched to Campaign 4):
- **Eyebrow**: `AUSTIN WEDDING BAR DELIVERY`
- **H1 (two lines)**: "Your Wedding Bar." / "Calculated. Delivered. Done." (second line in champagne gold `#C8A96A`)
- **Subhead**: "Plug in your guest count. Get exact quantities for beer, wine, spirits, and bubbly. Then let Austin's wedding alcohol delivery team handle the rest."
- **Primary CTA**: "Get My Wedding Bar Quote →" — scrolls to the calculator section (or to the quote form below results)

KEEP the 4-badge compliance strip already in place under the subhead. Move it from the gray-gradient hero into the new full-bleed hero (overlay on the image with semi-transparent background).

### B. Calculator tool — keep `CalculatorClient` exactly as-is

The calculator mechanics are not the problem. The `<CalculatorClient />` component stays put. If the calculator's result state needs to feed the quote form (Section I), pass a callback down (`onResultsComputed: (state) => void`).

### C. Pain → Solution (new section, between calculator and "How the math works")

Use the extracted `<PainSolutionSection>` component.

- **Headline**: "The Costco run is not your wedding-day job."
- **Body**: "You're planning a wedding, not managing a liquor inventory. Give us your guest count — we've already done the math. Beer, wine, spirits, champagne for the toast, ice, mixers. Delivered cold to your venue. Reviewed with you before delivery so nothing's missing."

### D. 3 Sample Reception Bar Packages (new section, after Pain)

Use the extracted `<PackageCardGrid>` component with 3 hardcoded reception-bar packages:

```ts
const RECEPTION_PACKAGES: Package[] = [
  {
    name: 'Intimate Reception',
    serves: 'Reception bar for 50 guests',
    price: '$899',
    save: 'Save $80 in supplies',
    blurb: 'A clean bar for backyard, Hill Country, or boutique-venue weddings.',
    items: [
      'House red + white wine (×6 bottles)',
      'Veuve Clicquot for the toast (×3 bottles)',
      'Beer + seltzer variety case',
      'Premium spirits well kit (vodka, tequila, whiskey)',
      'Mixers, ice, citrus, garnishes',
      'Cups, napkins, opener — included free ($80 value)',
    ],
    image: '/images/services/weddings/boho-hill-country-2.webp',
    featured: false,
  },
  {
    name: 'Reception Bar Standard',
    serves: 'Reception bar for 100 guests',
    price: '$1,799',
    save: 'Save $140 in supplies',
    blurb: 'The most-booked package — full bar for a 100-guest reception, no upcharge.',
    items: [
      'Curated red + white wine (×12 bottles)',
      'Champagne toast for the room (×6 bottles)',
      'Beer + seltzer variety (3 cases)',
      'Premium spirits (vodka, tequila, whiskey, gin)',
      'Signature cocktail kit (your pick)',
      'Mixers, ice, citrus, garnishes',
      'Glassware-grade cups + bar tools ($140 value, bundled free)',
    ],
    image: '/images/services/weddings/outdoor-bar-setup-travis.webp',
    featured: true,  // MIDDLE FEATURED — Wes pattern
  },
  {
    name: 'Full Reception + Toast',
    serves: 'Reception bar for 150 guests',
    price: '$2,499',
    save: 'Save $200 in supplies',
    blurb: 'For larger receptions — premium pour, sommelier-curated wines, full toast.',
    items: [
      'Sommelier-curated red + white wine (×18 bottles)',
      'Champagne toast service (×9 bottles)',
      'Beer + seltzer variety (4 cases)',
      'Premium spirits across 5 categories',
      'Signature cocktail kits (×2)',
      'Mixers, ice, citrus, garnishes, fresh herbs',
      'Premium bar setup ($200 value, bundled free)',
    ],
    image: '/images/services/weddings/signature-cocktails-closeup.webp',
    featured: false,
  },
];
```

Add a small cross-link CTA below the package grid: "Need full-weekend coordination (welcome reception → ceremony → after-party)? → Build your weekend at /austin-wedding-weekend-delivery"

**Compliance note**: All prices and "Save $X" values are placeholders for Allan to confirm before deploy. Match real margins from `getOccasionPackages('wedding')` if needed.

### E. Hormozi Guarantee Row (new, between packages and reviews)

A single centered callout block:

> **If we're late, we'll refund your delivery fee. No questions asked.**
> Call or text **(737) 371-9700** the day of your wedding if anything's off — we'll make it right.

Style as a brand-blue strip with white text + the brand-yellow trust badge feel. Single line emphasized, second line smaller.

### F. Named Reviews (new section, after guarantee)

Use the extracted `<ReviewsSection>` component. Source data: `src/components/landing/configs/wedding.ts` `reviews` array. Should render:
- Caroline H. — Wedding Planner, Austin
- Megan & Tom S. — Hill Country wedding
- Jules R. — MOH + planner liaison

These are already in `weddingConfig.reviews` — import and pass through.

### G. "How the math works" — keep existing section (lines 126–184)

Don't touch. Good SEO content. Moves down the page but stays.

### H. FAQ — keep existing 5 + add 2 (lines 186–203)

Add to FAQS array:
- Question: "Can I return bottles we didn't open?" / Answer: "Yes — we can take back unopened cases for a partial refund (depending on volume) or leave everything with you. Your call. Decision made at delivery."
- Question: "Do you set up the bar or just deliver?" / Answer: "Both options. Standard delivery drops everything at your venue. White-glove setup includes ice, bar tools, glassware, garnish prep, and a coordinator handoff with your venue staff. Add white-glove on the quote form."

Update the `HOW_TO_SCHEMA` and `FAQS` exports to include the new questions.

### I. Quote Form — REPLACES the existing final CTA section (lines 204–222)

New section, 3-field form (4 fields if delivery date is required by Stripe — see existing endpoint validation):
- Name (required)
- Email (required)
- Phone (recommended — used for delivery-day reach)
- Hidden: guestCount (auto-populated from calculator state)
- Hidden: occasion = 'wedding'
- Hidden: items array (auto-populated from calculator output — converted to product handles)
- Hidden: deliveryDate (default to 30 days out, user can change on the invoice page)

Submit handler:
```ts
const response = await fetch('/api/v1/landing/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'quote',
    occasion: 'wedding',
    customerName: formName,
    customerEmail: formEmail,
    customerPhone: formPhone,
    groupSize: calculatorGuestCount,
    deliveryDate: defaultDeliveryDate.toISOString().slice(0, 10),
    items: calculatorOutputItems, // [{ handle, qty }, ...]
  }),
});
```

On success: show "Quote sent! Check your inbox for the editable invoice." + redirect to `invoiceUrl` from response. On error: show error message + phone number to call.

Primary CTA button: "Get My Wedding Bar Quote →"

**Important**: the calculator currently outputs quantities by category (beer, wine, spirits, seltzer), NOT by product handle. The CalculatorClient may need a small extension to map computed quantities → product handles. Use `getCuratedCatalog().productById` or a hard-coded recommendation table. If this is complex, ship Phase B with the form posting just `groupSize` + `customerNotes` (= calculator JSON summary) and let admin manually fill the items in the draft order. Document this as a follow-up.

### J. Mobile sticky CTA (new, `md:hidden`)

Match the pattern at `LandingPageTemplate.tsx` lines 681–699. Single button: "Get My Wedding Bar Quote →" — scrolls to the quote form section.

### K. Schema.org JSON-LD — KEEP

Both `FAQPage` and `HowTo` schemas at lines 93–105 stay verbatim. Update `FAQS` for the schema generator after adding the 2 new FAQs in section H.

## Verification before merging

```bash
npx tsc --noEmit  # no new type errors
npx next lint     # no new lint errors
npm run test:run  # no broken tests
```

Then locally (`npm run dev`):
1. Visit `/wedding-drink-calculator` on desktop. Verify:
   - New hero with eyebrow + 2-line headline + outdoor-bar-setup.webp image
   - 21+ compliance strip still visible
   - Calculator works (enter 100 guests, 5 hours — expect ~600 drinks total)
   - 3 packages render with middle featured
   - Named reviews show Caroline H., Megan & Tom S., Jules R.
   - Guarantee row visible
   - Quote form below results
   - "How the math works" + FAQ still present (now with 7 FAQs not 5)
   - TABC link in footer
2. Submit a test quote with mode=quote. Confirm:
   - Invoice email received at the form's email address
   - `Order.landingPage = '/wedding-drink-calculator'`
   - `Order.utmCampaign = 'wedding-bar-delivery'` (set test URL with UTMs first)
   - `Order.segment = 'wedding'`
3. Test on mobile viewport (`<768px`): hero loads, sticky CTA appears, quote form usable
4. Run Lighthouse on the page — Performance score should not drop more than 5 points from current baseline. Document baseline first (current LCP/CLS) before changes.
5. Monitor GSC for 7 days post-deploy — position for "wedding drink calculator" should not drop more than 2 positions. If it does, the calculator may have moved too far down the page.

## Out of scope (Phase 2+)

- Bachelor/bachelorette/corporate page upgrades (they were 12–13/15 already — small polish only)
- Component-level Hormozi additions to Wes pages (urgency badges on package cards)
- The `📞`/`💬` emoji replacement in `LandingPageTemplate.tsx` (CLAUDE.md violation but not blocking)
- The "Austin Bach Babes" review attribution fix on bachelorette.ts (needs operator to source real name)
- Splitting `'bach'` segment into separate bachelor/bachelorette labels (medium refactor — defer until campaign-level reporting needs it)

## When Phase B is done

Move to Phase C (Google Ads campaign build). See plan file for spec.

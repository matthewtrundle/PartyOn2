---
name: harvest-reviews
description: One-command bulk harvest of the full Google review set (100+) into src/lib/reviews/reviews.ts — replaces the manual 2-min-per-review copy-paste in HARVEST.md. Drives the Claude in Chrome extension over the PUBLIC Google Maps review wall (no login needed), dumps every review verbatim via an in-page JS snippet, then runs the deterministic ingest script (dedupe, entry generation, avatar download/webp). Use when Allan says "harvest reviews", "pull the Google reviews", "update the review pool", or the pool needs fresh quotes for a thin segment. Requires a LOCAL session with the Chrome extension paired — refuse gracefully in remote/cloud sessions (Google is egress-blocked there).
---

# harvest-reviews — bulk Google review harvest

Replaces the manual per-review workflow in `src/lib/reviews/HARVEST.md` (kept
as the fallback + rulebook). Total operator labor: launch this skill. Everything
else — scrolling, expanding, extracting, deduping, entry generation, avatar
download — is automated. Curation judgment (excerpts, faces) stays with Claude
in this session, governed by HARVEST.md's non-negotiable rules:

1. **Verbatim only** — quotes byte-for-byte from the DOM dump, never re-typed.
2. **Real reviews only** — everything comes off the live profile, nothing invented.
3. **Real faces only** — avatar goes live only after you SEE a personal photo.

## Preconditions

- **Local session with the Claude in Chrome extension paired.** In a remote/CCR
  session Google is egress-blocked — stop and tell the operator to run this
  locally (`claude --teleport` a cloud session down, or start a local one).
- No Google login required — the harvest reads the public Maps review wall.

## Step 1 — capture (browser, ~2 min)

1. Navigate to the place page:
   `https://www.google.com/maps/place/?q=place_id:ChIJc8cN7oDLRIYRY734oDi4Gpo`
   (fallback: search "Party On Delivery Austin" on google.com/maps).
   **Verify the header says "Party On Delivery"** before touching anything —
   wrong business = poisoned pool. Note the header rating + review count.
2. Open the **Reviews** tab and set sort to **Newest**.
3. Evaluate the ENTIRE contents of `.claude/skills/harvest-reviews/extract-reviews.js`
   in the page. It auto-scrolls the feed to the bottom (~1–3 min for 100+
   reviews), clicks every "More", and returns one JSON string.
4. Write the returned string **verbatim** to
   `data/reviews/harvest/<YYYY-MM-DD>/reviews.raw.json` — file-write the tool
   result. NEVER re-type, trim, or "fix" it; the verbatim rule starts here.
5. Sanity checks before closing the tab:
   - `count` in the JSON ≈ the review count shown in the page header. If it's
     far short (>15% missing), the scroll loop stalled — rerun the snippet
     (it's idempotent; the feed keeps its scroll position).
   - Spot-check 3 random entries' `text` against the visible cards — exact match.
   - If the snippet returned an `{"error": ...}` object, Google likely changed
     the DOM. Inspect the page, adapt selectors IN THE SNIPPET FILE (commit the
     fix), and note the churn here.

## Step 2 — ingest (deterministic script)

```bash
npx tsx scripts/reviews/ingest-review-harvest.ts data/reviews/harvest/<YYYY-MM-DD>
```

The script (never the model) does: dedupe against the current
`CUSTOMER_REVIEWS` pool, skip rating-only and <5★ reviews, generate paste-ready
entries (id, verbatim quote, suggested excerpt/highlight centered on pain
vocabulary, inferred segments, rotated avatarBg), download non-default avatars
→ 256px webp in `<dir>/avatars/`, and save attached party photos to
`<dir>/photos/`. Outputs `candidates.json` + `candidates.snippet.ts`.

Script self-test (run after any edit to it): `npx tsx scripts/reviews/ingest-review-harvest.ts --test`

## Step 3 — curation (Claude judgment, per HARVEST.md)

Work through `candidates.snippet.ts` and move entries into
`src/lib/reviews/reviews.ts`:

- **Excerpt**: the script's suggestion is mechanical — tighten it to the
  punchiest ≤20-word pain-point substring. Stay an exact substring (use … for
  omissions); the vitest gate enforces this.
- **Context**: short occasion line from the review's own content. Never invent.
- **Segments**: sanity-check the inference; most-specific first.
- **possibleDuplicateOf / flags**: resolve every flag by reading the quote —
  especially `owner response` contamination (compare against `cardInnerText`
  in the raw dump).
- **Priorities** (HARVEST.md): corporate first, wedding second, anxiety
  vocabulary, reviewers with real photos. Target ~30–50 total in the pool.

**Faces**: view every file in `<dir>/avatars/` with the Read tool. Real
personal photo → copy to `public/images/reviewers/<id>.webp` and set
`photoSrc`. Silhouette / logo / pet / ambiguous → delete, keep initials.
Never stock or AI faces.

**Aggregate**: if the page-header rating/count from Step 1 differs from
`GOOGLE_RATING_DISPLAY` / `GOOGLE_REVIEW_COUNT_DISPLAY` in `reviews.ts`,
update them (that's the only place the site-wide claim lives).

## Step 4 — verify + ship

```bash
npx vitest run src/lib/reviews   # verbatim integrity + photo files
npx tsx scripts/reviews/ingest-review-harvest.ts --test
```

Then ship via the normal `/ship` flow. Every surface (marquee, facepiles,
/reviews wall) picks up the pool automatically — no other files to touch.

## Notes / known friction

- `data/reviews/harvest/` is raw material, not app code — safe to commit
  (useful history) but the app never reads it.
- Google churns obfuscated class names. `extract-reviews.js` leans on
  structural selectors (`div[data-review-id]`, aria attributes) with class
  fallbacks (`.MyEned`, `.wiI7pd`, `.rsqaWe`) and always captures
  `cardInnerText` as the recovery path. If extraction degrades, fix the
  snippet file and commit.
- Reviews with `hasOwnerResponse: true` need a manual glance — make sure the
  extracted text is the customer's words only, not Allan's reply.
- Re-runs are cheap and idempotent: the ingest dedupes against the pool, so a
  monthly harvest just surfaces whatever's new.

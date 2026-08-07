# Handoff: run the Google review harvest locally

_Written 2026-08-07 by a remote (cloud) Claude Code session for a local session
to execute. Delete this file once the harvest has shipped._

## Why you (the local session) are doing this

Allan wants the full Google review set (100+ reviews) in the site's review pool
— `src/lib/reviews/reviews.ts` — which currently holds only 22 hand-copied
entries. The remote session automated the whole pipeline but **cannot execute
it**: the cloud environment's network policy blocks Google entirely (Maps
pages, review endpoints, avatar images), and the official APIs are dead ends
(Places API returns only 5 reviews; Business Profile API needs weeks of
approval). A local session with the **Claude in Chrome extension** paired has
none of those limits — the review wall is public, no Google login needed.

## What's already built (on branch `claude/reviews-testimonials-landing-pages-cfuycc`)

- `.claude/skills/harvest-reviews/SKILL.md` — the full workflow. **This is your
  script; follow it step by step.**
- `.claude/skills/harvest-reviews/extract-reviews.js` — in-page JS snippet that
  auto-scrolls the Maps review feed, expands truncated reviews, and returns
  every card as JSON (verbatim from the DOM — never re-typed by the model).
- `scripts/reviews/ingest-review-harvest.ts` — deterministic ingest: dedupes
  against the current pool, skips <5★ and rating-only reviews, emits
  paste-ready entries + avatar webps. Self-test: `npx tsx scripts/reviews/ingest-review-harvest.ts --test`.
- `src/lib/reviews/HARVEST.md` — the rulebook (verbatim quotes only, real
  reviews only, real faces only). It governs the curation pass. The vitest
  suite in `src/lib/reviews/__tests__` enforces the verbatim rule in CI.
- Earlier on the same branch: the landing-page testimonial redesign
  (ReviewMarquee/facepiles) — already visually verified in the remote session.

## Execution plan

1. **Get the branch.** `git fetch origin claude/reviews-testimonials-landing-pages-cfuycc`
   and check it out. If it has already been merged to main, just pull main.
2. **Ship the branch first if it isn't merged** (use `/ship`, the repo's
   mandatory merge flow) — the skill and redesign should land on main before
   the harvest commit stacks on top. If Allan prefers, harvesting on the
   branch and shipping once is also fine — ask him only if it matters.
3. **Confirm the Chrome extension is paired** (a browser tab Claude can
   drive). If not, stop and tell Allan to pair it — nothing else works.
4. **Run `/harvest-reviews`** and follow SKILL.md exactly:
   - Maps place page → verify header says **"Party On Delivery"** → Reviews
     tab → sort **Newest**.
   - Evaluate the whole `extract-reviews.js` file in the page; write the
     returned JSON **verbatim** to `data/reviews/harvest/<YYYY-MM-DD>/reviews.raw.json`.
   - Sanity-check count vs the page header; spot-check 3 entries against the
     visible cards.
   - `npx tsx scripts/reviews/ingest-review-harvest.ts data/reviews/harvest/<YYYY-MM-DD>`
   - Curate `candidates.snippet.ts` into `src/lib/reviews/reviews.ts` per the
     rules (tighten excerpts — must stay exact substrings; fill `context` from
     review content only; face-check every avatar with the Read tool before
     enabling `photoSrc`; priorities: corporate > wedding > anxiety vocabulary
     > reviewers with photos; target ~30–50 pool entries).
   - Update `GOOGLE_RATING_DISPLAY` / `GOOGLE_REVIEW_COUNT_DISPLAY` in
     `reviews.ts` if the live header differs.
5. **Verify:** `npx vitest run src/lib/reviews` and the ingest `--test`, plus
   `npx tsc --noEmit`.
6. **Ship** via `/ship`. Every surface (marquee, facepiles, /reviews wall)
   reads the pool automatically — no other wiring needed.
7. Delete this handoff file in the shipping commit.

## Gotchas the remote session already hit

- Google churns CSS class names. The extractor uses structural selectors
  (`div[data-review-id]`, aria labels) with class fallbacks and always captures
  `cardInnerText` for recovery. If it degrades, fix the snippet file and commit.
- Cards with `hasOwnerResponse: true`: confirm the quote is the customer's
  words, not Allan's reply.
- Default-silhouette avatars are skipped automatically; only real personal
  photos may become `photoSrc` (never stock/AI faces — a fabricated-persona
  cleanup already happened once; see HARVEST.md).
- The fixture test (`--test`) rewrites `candidates.json`/`candidates.snippet.ts`
  inside the fixture dir; they're gitignored — only `expected-candidates.json`
  is source of truth.

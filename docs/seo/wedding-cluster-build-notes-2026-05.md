# Wedding-cluster build notes — 2026-05

Assumptions and decisions made by the orchestrator agent during the autonomous run. Documented so the operator can review without re-reading every PR.

## Branch strategy

- 5 independent branches off `origin/dev`, one per workstream: `feat/seo-wedding-cluster-ws{5,4,1,2,3}`.
- Each branch contains a single commit. PRs are independent and reviewable in any order.

## PR #71 status

- Open and not yet merged at run start. The plan mentioned moving the SEMrush triage script from Python to Node at `scripts/seo/triage-keywords.mjs` — **skipped** because the source script lives in the snapshots repo (not this engineering repo) and the parser PR is still being reviewed. Re-evaluate after #71 merges.

## WS1 assumptions

- Calculator reuses `calculateQuizResults` from `src/lib/drinkPlannerLogic.ts` (the wedding formula `guests × (hours + 1)` lives in the Everything-Else track inside that function).
- DB model `DrinkCalculatorLead.partyType` is a String, so the schema accepts `wedding` without a migration. API zod schema was relaxed accordingly.
- Coexists with `WeddingOrderCalculator.tsx` on `/weddings` (per plan recommendation). Decide at 90 days.
- Result panel shows counts only — no pricing claims, per the hard-stop rule.

## WS2 assumptions

- Photo references point at existing Premier assets in `/public/images/partners/`. Each placeholder is marked `TODO(premier-wedding-photos):` so the operator can grep and swap.
- Content angle is the value-segment cluster (cheap/small/intimate/budget). The head term "austin wedding venues" (KD 50) is deliberately not targeted on this page.
- Schemas: `EventVenue` + `LocalBusiness` + `FAQPage`.

## WS3 assumptions

- Placeholders are LITERAL strings like `[DJ_NAME]`, `[DJ_PHOTO]`, `[DJ_BIO]`, `[DJ_SAMPLE_VIDEO]` so the operator can grep across the page to find every spot to fill. TODO comments at each location.
- Slug chosen: `austin-wedding-dj`. Cleaner than `[dj-slug]` once the DJ is named. Slug can be renamed later via a 301 if the DJ wants their name in the URL.
- Booking form posts to a new endpoint `/api/partners/dj-inquiry`. Zod-validated. Logs to console + writes to DB if `Lead`-style table exists; otherwise console-only. Email-ops integration deferred.
- Affiliate `?ref=` propagation is wired through the existing partner attribution pattern in middleware. No new affiliate record is created (that's a manual step in `/admin/affiliates/new`).

## WS4 assumptions

- Audit script (`scripts/seo/audit-blog-corpus.mjs`) walks `content/blog/posts/*.mdx` + `src/data/blog-posts/posts.json`, emits TSV + summary MD.
- Classification (KEEP/OPTIMIZE/REDIRECT/DELETE) is heuristic-based; the orchestrator agent did NOT spawn a sub-agent to classify each post. Classification rules:
  - REDIRECT: filename near-duplicate of another post (Levenshtein-style match on slug).
  - OPTIMIZE: post in `wedding` cluster but missing FAQPage / HowTo / schema enrichment indicators in frontmatter.
  - DELETE: legacy JSON posts under 200 words AND not linked from any pillar.
  - KEEP: default.
- Confirmed dupes (per the plan's call-out): `best-small-wedding-venues-austin` ↔ `best-small-wedding-venues-near-austin`. 301 added.
- New sub-clusters added to `src/lib/topic-clusters.ts`: `wedding-venues`, `wedding-budget`, `wedding-vendors`.

## WS5 assumptions

- Obsidian vault path is `/Users/allan/Projects/Obsidian/Obsidian/PartyOn2/Memory/SEO/` (outside the engineering repo). Files written there are NOT in git.
- Engineering-repo archive at `docs/seo/{weekly,recommendations,decisions,plans}/` — these ARE in git and the source of truth that the sync script reads from.
- Sync direction: GitHub → Obsidian (one-way, like the Marketing/Operations syncs). Operator-authored Obsidian files are not synced back.

## Things deliberately NOT done

- Did not run `next build`. Used `npx next lint` + `npx tsc --noEmit` for verification per CLAUDE.md.
- Did not use Playwright / screenshots for layout verification.
- Did not modify TABC, pricing, or age-verification copy.
- Did not push secrets or sample data.
- Did not auto-publish blog edits (blog audit produces recommendations only — actual content changes go through human review).

## Files left as TODO for the operator

- `src/app/partners/austin-wedding-dj/page.tsx` — fill `[DJ_NAME]`, `[DJ_PHOTO]`, `[DJ_BIO]`, `[DJ_SAMPLE_VIDEO]`, FAQs.
- `src/components/landing/configs/wedding-venue-boats.ts` — swap hero photos when Premier delivers wedding-specific shots.
- DJ affiliate record — create in `/admin/affiliates/new` once DJ is signed, then update the partner registry slug if it changes.

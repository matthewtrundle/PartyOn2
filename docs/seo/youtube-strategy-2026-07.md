# YouTube Strategy — 3 Segment Videos (updated 2026-07-10)

Companion to [youtube-keyword-research-2026-07.md](./youtube-keyword-research-2026-07.md) — read that for the data behind every keyword here.

> **Order changed 2026-07-10 (seasonality beats raw ROI): BACH FIRST — it's peak bach season now; wedding and corporate move to fall.** The bach video also changed format: a 3–5 min Q&A listicle (10 keyword-targeted questions as chapters) that gets chopped into per-question shorts. Full deep-dive research + shoot-ready spec: **[bach-video-brief-2026-07.md](./bach-video-brief-2026-07.md)** — it supersedes the Video 2 sketch below. Wedding and corporate briefs below remain the plan for fall.

> **Update 2026-08-03 — all three scripts now exist, and the embed plumbing is built.**
> Shoot scripts: [bach](./bach-video-script-2026-07.md) (approved) ·
> [wedding](./wedding-video-script-2026-08.md) (4 sign-offs pending, 1 blocker) ·
> [corporate](./corporate-video-script-2026-08.md) (3 sign-offs pending).
> Code side: `YouTubeEmbed` is registered in the MDX components map, `LandingPageTemplate`
> renders an optional video section above the FAQ with `VideoObject` JSON-LD (chapters become
> Google "key moments"), and the servings-math canon that all three scripts quote is now
> consistent across every calculator on the site. **Nothing renders until a config supplies a
> real `videoId`** — see `src/components/landing/configs/bachVideo.ts` for the one-line enable.



## Strategy in one paragraph

Each video does two jobs. **On the landing page** it deepens the page that already half-ranks for its money terms (dwell time, content depth, a second indexable asset) — note there is currently no video carousel on these SERPs to hijack, so the Google win is indirect. **On YouTube** it fishes where planners actually search, which per both this research and the 2026-06 vidIQ study means broad planning phrasings ("corporate event ideas", "austin bachelorette party"), not hyperlocal service terms. Titles use the exact live-autocomplete phrasing; the Austin/service specificity lives in the content, description, and end-screen CTA, not the title.

## Video 1 — Wedding (FALL 2026 — full brief: [wedding-video-brief-2026-07.md](./wedding-video-brief-2026-07.md), supersedes this sketch)

- **Title:** How Much Alcohol Do You Need for a Wedding? (100–200 Guests)
- **Target:** Google "how much alcohol to buy for a wedding" cluster (3,580/mo, KD~10); YouTube "how much alcohol for wedding" (live-verified autocomplete incl. "of 150" / "of 200")
- **Embeds on:** `/wedding-drink-calculator` (primary) and `/weddings`
- **Outline (5–7 min):**
  1. The rule of thumb: 1 drink/guest/hour + 15% buffer (this is what the AI Overview cites — say it better, with a real Austin wedding example)
  2. The 50/25/25 liquor/beer/wine split, and when to flip it for Texas summer weddings
  3. Worked examples on screen: 100 / 150 / 200 guests — exact bottle counts
  4. What venues charge for open bar vs. buying it yourself (tease: this is Video 1b territory)
  5. CTA: "we built a free calculator that does this for your exact guest count" → wedding-drink-calculator; end-screen to the bach video
- **Why first:** biggest cluster, lowest effective competition (The Knot ranks with a text page; nobody owns a good video), the landing page and a live Google Ads campaign already exist — the video compounds spend already happening.
- **Follow-up candidate (Video 1b):** "What an Open Bar Really Costs (DIY vs Venue)" — open-bar-cost sub-cluster, ~2,500/mo at KD 3–18, "wedding open bar math" is verbatim YouTube autocomplete, and it's PartyOn's exact value proposition.

## Video 2 — Bach (NOW — see [bach-video-brief-2026-07.md](./bach-video-brief-2026-07.md), which supersedes this sketch)

- **Title:** Austin Bachelorette Party: Drinks, Boat Day & What to Plan
- **Target:** YouTube "austin bachelorette party" (top live autocomplete); Google "bachelorette party drinks" (210/mo KD4) + repair-by-association for `bachelorette party alcohol delivery austin` (pos 22.9) and `bachelor party alcohol delivery austin` (pos 18.8), which today land on the homepage instead of the landers
- **Embeds on:** `/austin-bachelorette-party-delivery` (primary) and `/austin-bachelor-party-delivery`
- **Outline (5–7 min):**
  1. The Austin bachelorette weekend shape: house day → Lake Travis boat day → Rainey/6th night ("yacht bachelorette party" and "bachelorette party cruise" are real YouTube phrasings — lean into boat footage)
  2. Drinks that survive a boat: seltzers, batched cocktails, what NOT to bring (glass) — natural segue to delivery
  3. Signature drink + supplies checklist for the house (drink recipes = the 140/mo secondary)
  4. Bachelor version in 60 seconds: kegs, BBQ pairing, golf-cart coolers
  5. CTA: "we deliver all of it cold to your Airbnb or the marina" → lander
- **One video covers both genders** — bachelorette carries ~3× bachelor volume; splitting halves the effort budget for the weakest marginal gain.
- **Note:** the "how much alcohol for a bachelorette party" angle tested dead (20/mo, cluster skews non-alcoholic) — deliberately not the hook.

## Video 3 — Corporate (FALL 2026 — full brief: [corporate-video-brief-2026-07.md](./corporate-video-brief-2026-07.md), supersedes this sketch)

- **Title:** Corporate Event Ideas That Aren't Lame (Happy Hour Edition)
- **Target:** YouTube + Google "corporate event ideas" (1,900/mo KD20; 13,450/mo cluster; top live autocomplete). The briefed angles ("how much alcohol for corporate event", "office party bar setup", "company party drink calculator") all tested at ~0 volume — skipped per research.
- **Embeds on:** `/austin-corporate-event-delivery`
- **Outline (5–7 min):**
  1. Hook: the Reddit r/Austin thread "corporate team event that isn't lame" ranks #1 here — answer it
  2. 8–10 event formats ranked by effort: office happy hour, cocktail-kit team build, casino night, boat outing…
  3. The drinks logistics section nobody covers: quantities for 50/100 people, TABC/venue rules in Texas offices
  4. Seasonal spin: holiday party planning timeline (corporate christmas/holiday event ideas = 190/mo combined, December spike)
  5. CTA: happy-hour delivery + bartending → lander
- **Positioning caveat (honest):** highest reach, weakest purchase intent, and CPC $3–5 says event *vendors* are the ones paying for this audience. Expect brand/discovery value more than direct orders; that's why it's third.

## Distribution & targeting (added 2026-07-14)

"Targeted to Austin" means three different things — the videos are built to work at all three layers without re-cutting:

1. **Organic YouTube search: no geo-targeting exists.** Titles are deliberately BROAD because hyperlocal event terms have almost no YouTube volume (2026-06 vidIQ study + 2026-07 competitive reads; the one Austin-specific bachelorette short found has 2.5K views). Austin lives *inside* each video — venue names, Lake Travis footage, description, pinned comment, end-screen CTA to the lander. Out-of-market viewers cost nothing and their watch time helps ranking. Exception that proves the rule: the bach video's YouTube target IS "austin bachelorette party" — the one local phrasing verified as a top live autocomplete.
2. **Landing-page embeds: Austin-targeted by construction.** Viewers on `/wedding-drink-calculator`, the bach landers, and the corporate pages arrived from Austin-intent searches or Austin ad clicks — this is the conversion layer and needs no targeting work.
3. **Paid YouTube (if/when funded): the only layer with real geo-targeting, and it's a campaign setting, not a video property.** Build as a Google Ads video campaign targeting the **Austin DMA, presence-only**, mirroring the search campaigns — and apply the standard delivery-footprint exclusions (never target Round Rock, Pflugerville, Leander, Dripping Springs, Buda, Kyle). The per-question shorts are the ad creative (15–45s, question-first hooks); no separate cut needed. Use the per-occasion `lead_*` key events as conversion goals (never "Submit lead forms" — it double-counts).

## Production & measurement notes

- **Channel reality check:** no posting integration exists anywhere in the stack; YouTube is embed-only today. Uploading is manual (that's fine — 3 videos).
- **Embedding — BUILT 2026-08-03.** `LandingPageTemplate.tsx` now renders an optional video
  section (heading, blurb, embed, visible chapter list) directly above the FAQ, driven by a
  `video?: LandingVideo` field on `LandingConfig`. It renders nothing when the field is absent, so
  every existing lander is unchanged until a video ID is supplied. `YouTubeEmbed` is also registered
  in `MDXContentRSC.tsx`, so MDX blog posts can now embed video (they could not before).
  `/weddings` and `/wedding-drink-calculator` are standard pages and still need their own embed
  when the wedding video lands.
- **Schema — BUILT 2026-08-03.** `generateVideoSchema()` in `src/lib/seo/schemas.ts` emits
  `VideoObject` JSON-LD, with chapters mapped to `hasPart`/`Clip` so Google can surface each
  question as a jump-to "key moment." The landing template emits it automatically alongside the
  existing FAQ schema whenever a video is configured. Covered by
  `src/lib/seo/__tests__/video-schema.test.ts`.
- **To go live once footage exists:** set `video:` in the lander config
  (`buildBachVideo({ videoId, uploadDate, duration })` in
  `src/components/landing/configs/bachVideo.ts`), after confirming the chapter timestamps against
  the final cut — the ones committed today come from the script's target runtimes, not a real edit.
- **Measure (re-check ~2026-09-01, gives 6+ weeks):**
  - GSC position deltas on each video's embed-target queries (the pos 5–25 flags in `data/seo/gsc/2026-07-09-segments.json` are the baseline)
  - YouTube Studio: impressions + CTR on the three target phrasings
  - GA4: engagement time on embedding pages before/after; `lead_*` key events on the landers
- **Out of scope for this doc:** video production itself, channel setup/branding, Shorts strategy (the vault's Metricool/Reels plan covers social distribution separately).

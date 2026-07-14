# YouTube Keyword Research — 3 Segment Videos (2026-07-09)

Research for 3 YouTube videos to embed on the segment landing pages:
bach → `/austin-bachelor-party-delivery` + `/austin-bachelorette-party-delivery`,
wedding → `/weddings` + `/wedding-drink-calculator`,
corporate → `/austin-corporate-event-delivery`.

## Data sources (all captured 2026-07-09, raw files committed alongside this doc)

| Source | What | Raw data |
|---|---|---|
| Google Search Console (first-party API) | Actual rankings, last 90 days (2026-04-09 → 2026-07-06), segment-filtered, positions 5–25 flagged | `data/seo/gsc/2026-07-09-segments.json` |
| SEMrush Keyword Magic + Organic Rankings (browser session) | Volume, KD, CPC, intent for 8 seed clusters | `data/seo/semrush/2026-07-09/*.txt` |
| YouTube autocomplete (suggest endpoint, 131 queries + live search-bar verification) | Real user phrasings on YouTube | `data/seo/youtube-autocomplete/2026-07-09.json` |
| Live Google SERP checks (3 primary keywords) | Video-pack presence, who ranks | notes below |

**Method caveats:**
- The raw suggest endpoint is not reliably US-localized; every finalist was re-verified by typing into the real YouTube search bar (US, logged-in). Where they disagreed, the live search bar won — e.g. "how much alcohol for wedding" IS in live US autocomplete but absent from the raw endpoint.
- Live checks ran from an Austin IP on Allan's Google account, so local suggestions ("austin bachelorette party", Reddit r/Austin ranking #1 for corporate) may be geo/personalization-boosted. That skew matches our actual customers, but don't read national intent into them.
- **No video pack appeared on any of the 3 primary Google SERPs** (desktop, Austin). SEMrush "SF" counts include other features (AI Overview, PAA, discussions). So the Google-side win from these videos is landing-page enrichment (dwell time, content depth) and Videos-tab/thumbnail presence — not a carousel slot waiting to be taken. The YouTube-side win is search + suggested traffic on the broad phrasings.

## Key GSC facts (our actual rankings, 90 days)

- 106 segment queries sit in the video-moveable position 5–25 range (39 bach, 62 wedding, 5 corporate).
- `bachelor party alcohol delivery austin` — pos 18.8, 121 impressions, 0 clicks → lands on `/` (homepage), **not** the bachelor lander.
- `bachelorette party alcohol delivery austin` — pos 22.9, 91 impr, 0 clicks → also lands on `/`.
- `wedding drink delivery` — pos 15.0, 96 impr → `/`.
- `wedding bar` — pos 49.3, 88 impr → `/weddings`; `bar packages for weddings` — pos 69 → `/weddings`.
- Corporate is thin: best is `where to get soft drinks delivered for corporate events?` pos 7.9, 49 impr.
- Bach blog posts already win informational Austin queries (brunch pos 9–10, BBQ pos 22.7).

---

## Segment 1 — Bach (bachelor + bachelorette)

**Verdict: viable, but NOT with the "how much alcohol" angle.** The bachelorette-alcohol cluster is ~420/mo total and skews *non-alcoholic* ("non alcoholic bachelorette party ideas" is its biggest term). The drinks/planning angle is where the volume is. On YouTube, bachelorette content is planning/vlog/ideas — "drinks" doesn't even autocomplete after "bachelorette party d" (decorations/dresses/drama do). "austin bachelorette party" is the TOP live autocomplete for "bachelorette party aust", and "yacht bachelorette party" + "bachelorette party cruise" appear — the Lake Travis boat angle has real YouTube phrasing.

| Keyword | Vol/mo | KD | CPC | Video in Google SERP | In YT autocomplete | We rank | Rec |
|---|---|---|---|---|---|---|---|
| bachelorette party drinks | 210 | 4 | 0.32 | no pack | no (planning terms instead) | – | **primary (Google)** |
| bachelorette party drink recipes | 140 | 6 | 0.37 | no pack | no | – | secondary |
| bachelor party drinking games | 170 | 3 | 0.18 | not checked | yes ("bachelor party games") | – | secondary |
| bachelor party drinks | 140 | 12 | 0.32 | not checked | no | – | secondary |
| austin bachelorette party | ~25 impr/mo (GSC) | – | – | no pack | **yes — top suggestion** | pos 49 | **primary (YouTube)** |
| bachelor party austin tx | low | – | – | not checked | yes — top for "bachelor party a" | pos 44.9 | secondary |
| bachelorette party alcohol delivery austin | 10 | n/a | – | not checked | no | **pos 22.9 → wrong page (/)** | embed target |
| bachelor party alcohol delivery austin | ~10 (121 impr GSC) | n/a | – | not checked | no | **pos 18.8 → wrong page (/)** | embed target |
| how much alcohol to buy for bachelorette party | 20 | n/a | 0.00 | not checked | no | – | skip |
| bachelorette party alcohol checklist (seed) | ~0 | – | – | – | no | – | skip |

**One video for both bachelor + bachelorette is the right call at this volume** — bachelorette leads (higher volume + top autocomplete), bachelor gets a section + end-screen.

## Segment 2 — Wedding

**Verdict: the strongest segment by far — two stacked clusters, both low-KD.**
(1) The "how much alcohol" calculator cluster: 3,580/mo total, avg KD 10, and we already own `/wedding-drink-calculator` (our Google Ad already serves on it; The Knot owns organic #1 with an AI Overview above it).
(2) The open-bar-cost cluster inside "wedding bar" (85,820/mo umbrella): ~2,500/mo combined on cost phrasings at KD 3–18. Live YouTube autocomplete confirms both phrasings: "how much alcohol for wedding (of 150 / of 200)" and "wedding bar setup" (top suggestion) / "wedding open bar math".

| Keyword | Vol/mo | KD | CPC | Video in Google SERP | In YT autocomplete | We rank | Rec |
|---|---|---|---|---|---|---|---|
| how much alcohol to buy for a wedding | 390 | 7 | 0.37 | no pack (AI Overview + PAA) | yes (live) | – | **primary** |
| how much alcohol for wedding | 170 | 5 | 0.47 | no pack | yes (live, + "of 150", "of 200") | – | **primary phrasing** |
| how much alcohol to buy for wedding | 210 | 7 | 0.60 | no pack | yes | – | primary variant |
| how much is an open bar at a wedding | 720 | 18 | 1.42 | not checked | yes ("wedding open bar math") | – | **secondary / video #2 seed** |
| open bar wedding cost | 590 | 10 | 1.52 | not checked | yes | – | secondary |
| price for open bar at wedding | 390 | 3 | 1.64 | not checked | yes | – | secondary |
| wedding bar menu | 1,600 | 15 | 1.10 | not checked | yes | – | secondary |
| wedding bar setup (from YT) | low Google | – | – | – | **yes — top suggestion** | – | YouTube title phrasing |
| how much alcohol for a wedding of 100 | 90 | 5 | 0.40 | not checked | yes | – | title modifier |
| wedding alcohol calculator cluster (calculator ×16 kws) | ~200 | ~10 | – | no pack | no | our page + ad | embed target |
| wedding drink delivery | ~30 (96 impr GSC) | – | – | not checked | no | **pos 15 → /** | embed target |
| stock the bar party for wedding | 170 | 12 | 0.59 | not checked | no ("stock the bar party" generic) | – | skip for video |
| byob wedding venue austin (seed) | ~0 | – | – | – | no | – | skip |

## Segment 3 — Corporate

**Verdict: the briefed angle ("how much alcohol for corporate event", "office party bar setup") is a dead end — say so and pivot.** "Corporate event drinks" totals 110/mo (half of it Houston venue queries); "office party" appears once at 0 volume in the entire party-alcohol-quantity cluster. The real cluster is **"corporate event ideas"**: 1,900/mo head KD20, 13,450/mo across 1,285 keywords, CPC $3–5, and it's the top live YouTube autocomplete for "corporate event id". Bonus local signal: for an Austin searcher, Google ranks Reddit r/Austin "Corporate team event that isn't lame" #1 — planners here search broad, then localize.

| Keyword | Vol/mo | KD | CPC | Video in Google SERP | In YT autocomplete | We rank | Rec |
|---|---|---|---|---|---|---|---|
| corporate event ideas | 1,900 | 20 | 3.95 | no pack | **yes — top suggestion** | – | **primary** |
| fun corporate event ideas | 480 | 28 | 3.88 | no pack | yes (variants) | – | secondary |
| ideas for corporate events | 320 | 9 | 3.95 | no pack | yes | – | secondary |
| corporate event entertainment ideas | 260 | 16 | 3.28 | not checked | yes | – | secondary |
| corporate social event ideas | 110 | 4 | 3.78 | not checked | no | – | secondary |
| corporate holiday event ideas | 50 | 14 | 4.60 | not checked | no | – | seasonal secondary |
| office party ideas (from YT) | not pulled | – | – | – | yes | – | YouTube phrasing |
| where to get soft drinks delivered for corporate events? | ~10 (49 impr GSC) | – | – | not checked | no | **pos 7.9** | leave to page |
| how much alcohol for corporate event (seed) | ~0 | – | – | – | no | – | **skip — no demand** |
| company party drink calculator (seed) | ~0 | – | – | – | no | – | skip |
| corporate event bartending austin (seed) | ~0 | – | – | – | no | – | skip |

---

## Final picks (one per segment)

| Segment | Primary Google keyword (page/embed target) | Exact YouTube title phrasing (user language) |
|---|---|---|
| Wedding | **how much alcohol to buy for a wedding** (390/mo KD7; cluster 3,580/mo) | **"How Much Alcohol Do You Need for a Wedding? (100–200 Guests)"** — "how much alcohol for wedding" + guest counts are verbatim live autocomplete |
| Bach | **bachelorette party drinks** (210/mo KD4; + fix the two "…alcohol delivery austin" queries at pos 18.8/22.9 landing on `/`) | **"Austin Bachelorette Party: Drinks, Boat Day & What to Plan"** — "austin bachelorette party" is the top live autocomplete |
| Corporate | **corporate event ideas** (1,900/mo KD20) — Austin-modified on the page | **"Corporate Event Ideas That Aren't Lame (Happy Hour Edition)"** — "corporate event ideas" is the top live autocomplete; "not lame" mirrors the Reddit thread Google ranks #1 locally |

Production order by expected ROI: **wedding first** (volume + existing calculator page + existing ad), bach second (fixes two wrong-page rankings), corporate third (biggest reach but weakest purchase intent).

Full strategy, briefs, and embed plan: `docs/seo/youtube-strategy-2026-07.md`.

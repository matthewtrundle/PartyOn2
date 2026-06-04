---
title: Partner Landing Strategy
status: active
owner: seo-director
created: 2026-05-20
---

# Partner Landing Strategy

## The model

Each external partner that drives wedding leads gets a custom landing page at `/partners/<slug>`. Three current partners:

| Partner | URL | Funnel |
|---------|-----|--------|
| Premier Party Cruises (existing) | `/partners/premier-party-cruises` | Boat charter + alcohol delivery cross-sell |
| Premier as wedding venue (new, WS2) | `/austin-wedding-venue-boats` | Boat-as-venue + alcohol delivery |
| Austin Wedding DJ (new, WS3) | `/partners/austin-wedding-dj` | DJ booking + alcohol delivery |

Every partner page has the same two-sided CTA: book the partner's service AND order alcohol from POD. Affiliate `?ref=` codes propagate through the order flow so we can attribute who drove what.

## Why partner pages instead of blog content

- Wedding-DJ vol is 390 at KD 8 — easy to win with a focused commercial page, hard to win with a blog post fighting for the same query.
- Boat-as-venue value-segment cluster (cheap/small wedding venues) is ~1,500 vol combined. Same logic: commercial page beats blog post for transactional intent.
- Partners get a real lead-gen tool, not a content marketing post.

## Asset gates (what blocks shipping)

- **DJ** — needs `[DJ_NAME]`, `[DJ_PHOTO]`, `[DJ_BIO]`, `[DJ_SAMPLE_VIDEO]`, plus FAQ content. Page shipped with literal placeholders so the operator can grep + fill.
- **Boat-as-venue** — needs Premier wedding-specific photos (ceremony-on-deck, rehearsal-dinner, brunch). Existing Premier marina/exterior shots are placeholders. Each one tagged `TODO(premier-wedding-photos):`.

## Cross-link map

```
/weddings  ──────────┬──→ /wedding-drink-calculator (WS1)
                     ├──→ /austin-wedding-venue-boats (WS2)
                     └──→ /partners/austin-wedding-dj (WS3)

/partners/premier-party-cruises ──→ /austin-wedding-venue-boats
/austin-wedding-venue-boats ─────→ /partners/premier-party-cruises
/wedding-drink-calculator ────────→ /order?type=wedding
/partners/austin-wedding-dj ──────→ /order?ref=<dj-code>
```

## Future partners (queue)

- Wedding photographer (no asset yet)
- Wedding florist (no asset yet)
- Wedding cake (no asset yet)

Each will follow the same pattern: `/partners/<slug>` custom page, custom config in `src/lib/partners/landing-pages.ts`, affiliate code wired through `?ref=`.

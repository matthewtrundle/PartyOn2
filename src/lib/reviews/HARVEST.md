# GBP review harvest — the workflow

The Places API sync only mirrors the **5 most-recent** reviews per night
(`src/lib/analytics/gbp.ts`), so the full 100+ set gets on the site exactly one
way: a manual harvest from the Business Profile reviews manager into
`src/lib/reviews/reviews.ts`. This is the same workflow bachelor.ts documented
on 2026-06-12 — this file just makes it repeatable, and adds photos.

Every surface scales automatically as this file grows: the landing-page
marquee, the facepile strips, and the /reviews wall all read `CUSTOMER_REVIEWS`.

## The rules (non-negotiable)

1. **Verbatim only.** Copy-paste the review text exactly — typos, caps, and
   `!!` included. Never paraphrase, never "clean up". Excerpts must be exact
   substrings (mark omissions with `…`). `npx vitest run src/lib/reviews`
   enforces this mechanically.
2. **Real reviews only.** No composites, no personas (that cleanup already
   happened once — see configs/corporate.ts history).
3. **Real faces only.** A photo goes in only when the reviewer's public Google
   profile shows an actual personal photo. Skip default silhouettes, logos,
   pets-only, and anything ambiguous — initials render instead and look
   better than a gray head. Never substitute stock or AI faces (they test
   worse than no face at all). If a reviewer ever asks to be removed, delete
   their entry + photo and ship it the same day.

## Step by step (~2 min per review)

1. **Open the reviews manager**: business.google.com → the Party On Delivery
   profile → **Reviews** (or google.com/maps → the business page → Reviews
   tab, signed in). The manager lists all reviews, filterable, newest first.
2. **Pick the next review** — work highest-quotable first (see "What to
   prioritize" below).
3. **Copy the text** into a new entry in `CUSTOMER_REVIEWS`
   (`src/lib/reviews/reviews.ts`). Fill in:
   - `id`: kebab-case of the reviewer name (`'jane-doe'`; add `-2` on a
     collision).
   - `quote`: the full verbatim text.
   - `excerpt`: the punchiest ≤20-word substring — the sentence that names a
     **pain point** (lugging, running around town, on time, how much to buy…).
   - `highlight`: the exact pain phrase inside the excerpt.
   - `context`: short occasion line (`'Lake Travis boat day'`) — from the
     review's own content, don't invent details.
   - `segments`: most-specific first (`['boat', 'bachelor']`).
   - `avatarBg`: rotate through `#F2D34F`, `#F5B0C5`, `#7FC8F5`, `#A8E0B0`,
     `#E8B87F`.
4. **Grab the photo (when there's a real face)**:
   - Click the reviewer's name/avatar in the reviews manager → their public
     profile opens. Right-click the profile photo → **Open image in new tab**.
   - In the URL, replace the size suffix (e.g. `=s120-c` or `=w60-h60`) with
     `=s400-c` for a crisp square, then save the image.
   - Convert + compress to a 256px square webp (target <25 KB). Easiest:
     [squoosh.app](https://squoosh.app), or
     `npx sharp-cli -i in.jpg -o public/images/reviewers/<id>.webp resize 256 256`.
   - Save as `public/images/reviewers/<id>.webp` and set
     `photoSrc: '/images/reviewers/<id>.webp'` on the entry.
   - **Do NOT hotlink** `googleusercontent.com` URLs — they expire and rot.
     Self-hosting the copy is the whole point.
5. **Bonus — customer party photos.** Reviews with attached photos (coolers on
   boats, stocked Airbnb counters) are gold. Save the good ones to
   `public/images/reviewers/` too — they're not wired into a surface yet, but
   collect them during the same pass; a photo-backed tile variant is the
   obvious next iteration.
6. **Verify + ship**: `npx vitest run src/lib/reviews` (verbatim-integrity +
   photo-file checks), then ship via the normal `ship` flow. Done — every
   surface picks the new reviews up automatically.

## What to prioritize

- **Corporate quotes** — thinnest segment in the pool (the corporate lander
  still leans on two boat/bach quotes; see the TODO in configs/corporate.ts).
- **Wedding quotes** — second thinnest relative to traffic.
- **Anxiety vocabulary** — reviews containing *worried, stress, last minute,
  on time, running around, how much, lugging, didn't have to* make the best
  excerpts and pain-point mirrors.
- **Reviewers with real profile photos** — faces multiply the facepile and
  wall effect.
- Target: ~30–50 harvested total is enough to make the marquee and wall feel
  bottomless; 100% coverage is not required (the wall links to the Google
  profile for the full set).

## When the aggregate changes

`GOOGLE_RATING_DISPLAY` / `GOOGLE_REVIEW_COUNT_DISPLAY` at the top of
`reviews.ts` are the only place the site-wide "5.0 · 100+" claim lives
(landing strips, marquee eyebrow, /reviews page, inn-cahoots). Update them
when the profile's numbers change — nothing else to touch.

# Quote Builder

Renders a two-page, print-ready Premier Party Cruises quote/proposal from a JSON file.
The layout is fixed (approved 2026-08-17); the data changes per quote.

```bash
node scripts/ops/quote-builder/build-quote.mjs <quote.json> [--pdf] [--out=path.html] [--open]
```

Writes `quote-<quoteId>.html` (single self-contained file — photos and font are inlined,
works offline and as an email attachment). `--pdf` also writes a PDF next to it and
**fails loudly if the result isn't exactly 2 pages.**

The `/quote-builder` skill wraps this with intake questions, pricing/copy guardrails, and
vault archiving. Use the skill for real quotes; use the script directly only for testing.

## Files

| Path | Purpose |
|---|---|
| `build-quote.mjs` | The generator. Plain Node, no dependencies. |
| `template.html` | The layout. Static HTML + CSS with `{{TOKENS}}`. Never hand-edit a built output — edit JSON and rebuild. |
| `presets/clever-girl-holiday.json` | Worked example: the Elizabeth Morgan & Associates quote. **Copy it for a new quote; don't edit it in place.** |
| `photos/` | Seven optimized JPEGs (1.1 MB total). `06` and `07` are cropped so no faces appear — keep it that way. |
| `playfair-display.woff2` | Latin subset of the display face, inlined at build. |

## Starting a new quote

1. `cp presets/clever-girl-holiday.json /tmp/my-quote.json`
2. Change `quoteId`, `client`, `eventDates`, prices, `total`. Leave the rest unless the
   copy genuinely needs to differ.
3. `node build-quote.mjs /tmp/my-quote.json --pdf --open`
4. Look at both pages before sending anything.

## The JSON

Top-level identity/lifecycle fields exist so a quote is a **durable record**, not just
template input — the plan is to import these into the site later:

| Field | Meaning |
|---|---|
| `quoteId` | Stable ID; also the archive folder name. `yyyy-mm-<client-slug>` |
| `schema` | Bump if the JSON shape ever changes |
| `status` | `draft` · `sent` · `accepted` · `declined` · `expired` |
| `created` · `sent` · `validUntil` | ISO dates (`sent` is `null` until it goes out) |
| `eventDates` | ISO array — the machine-readable dates. `client.eventLabel` is what prints. |

Content sections map 1:1 to the page. Every one takes a `title` (so the wording is
yours, not baked into the template) and either a `body`, `items`, or `rows`.

**Rows** (`boat`, `food`, `drinks`, `addOns`) are `{ label, price, note? | inline? }`.
`note` renders as a second muted line under the label; `inline` renders after an em-dash on
the same line (used for add-ons). **Prices are strings on purpose** — `$800–900`, `~$900`,
`$2,000–2,300` are all real. The script does no arithmetic; you type the total.

`addOns.rows: []` removes the whole add-ons section.

**Photos**: `hero` is one `{ file, alt }`; `sidebar1` and `sidebar2` are arrays of the same
(three each fits the page; two also works). Files must exist in `photos/`. To add a photo,
resize to ~900px wide (hero ~1700), JPEG quality ~65, and drop it in.

Small HTML is allowed in text fields (`<b>`, `<strong>`, `<br>`, `&amp;`) — it's passed
through, not escaped. Keep it to those.

## Design rules that live in the template

- Two pages, Letter, navy sidebar on the left of page 1 and the right of page 2.
- Sections on page 2 are color-coded: boat **navy**, food **sand**, drinks **cyan**, add-ons **gray**.
- **Yellow appears once per page** — the partner button (p1) and the total (p2) — and always
  carries dark text.
- Long totals shrink to fit (`> 9` chars → 22px, `> 12` → 19px). Keep the amount short.

## Gotchas

- **`--window-size=1400,1600` in the Chrome call is load-bearing.** Headless Chrome's default
  viewport is ~756px, narrower than a Letter page, which trips the mobile breakpoint and
  silently renders single-column. Every early PDF from this project had that bug.
- If Chrome isn't installed the script prints manual instructions instead of failing:
  open the HTML, print, Letter, margins None. Set `CHROME_BIN` to point at another binary.
- The template's mobile breakpoint is `780px` and the print block is last in the cascade —
  keep both if you touch the CSS.

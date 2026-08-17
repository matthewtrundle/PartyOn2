#!/usr/bin/env node
/**
 * Quote Builder — renders a two-page Premier Party Cruises quote/proposal
 * (Letter, print-ready) from a quote.json.
 *
 * Usage:
 *   node scripts/ops/quote-builder/build-quote.mjs <quote.json> [--pdf] [--out=path.html] [--open]
 *
 *   quote.json     A quote file (start from presets/clever-girl-holiday.json — copy it, never edit it in place)
 *   --pdf          Also render a PDF next to the HTML via headless Chrome
 *   --out=PATH     Output HTML path (default ./quote-<quoteId>.html)
 *   --open         Open the HTML in the default browser when done
 *
 * Behavior:
 *   - Fills scripts/ops/quote-builder/template.html with the JSON. Every visible
 *     string is a token; layout is fixed. Prices are strings on purpose (ranges,
 *     tildes) — the script does no arithmetic.
 *   - Photos are inlined as base64 from ./photos so the HTML is a single file
 *     that works offline and in email. Playfair Display is inlined too.
 *   - addOns.rows = [] hides the whole add-ons section.
 *   - --pdf runs Chrome with --window-size=1400,1600. Chrome's default headless
 *     viewport (~756px) is narrower than a Letter page and trips the mobile
 *     breakpoint, which silently renders single-column. Do not remove that flag.
 *   - Prints a hard error if the PDF is not exactly 2 pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ----- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const positional = args.filter((a) => !a.startsWith('--'));

if (!positional[0]) {
  console.error('usage: build-quote.mjs <quote.json> [--pdf] [--out=path.html] [--open]');
  process.exit(2);
}

// ----- load -----------------------------------------------------------------
const quotePath = path.resolve(positional[0]);
const q = JSON.parse(fs.readFileSync(quotePath, 'utf8'));
const template = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');

const REQUIRED = ['quoteId', 'client', 'sender', 'headline', 'lede', 'includes', 'boat', 'food', 'drinks', 'total', 'photos'];
const missing = REQUIRED.filter((k) => q[k] === undefined);
if (missing.length) {
  console.error(`quote.json is missing required keys: ${missing.join(', ')}`);
  process.exit(2);
}

// ----- helpers --------------------------------------------------------------
const esc = (s) => String(s ?? '');
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const photo = (name) => {
  const p = path.join(HERE, 'photos', name);
  if (!fs.existsSync(p)) {
    console.error(`photo not found: ${p}`);
    process.exit(2);
  }
  return dataUri(p, 'image/jpeg');
};

const rowsHtml = (rows) =>
  rows
    .map((r) => {
      const label = r.note
        ? `<b>${esc(r.label)}</b><span class="note">${esc(r.note)}</span>`
        : r.inline
          ? `<b>${esc(r.label)}</b> — ${esc(r.inline)}`
          : esc(r.label);
      return `<tr><td>${label}</td><td class="price">${esc(r.price)}</td></tr>`;
    })
    .join('\n');

const sidebarPhotos = (list) =>
  list.map((p) => `<img src="${photo(p.file)}" alt="${esc(p.alt)}">`).join('\n');

const badges = (list) =>
  list.map((b) => `<span class="badge${b.highlight ? ' hi' : ''}">${esc(b.text)}</span>`).join('\n');

const includes = (items) => items.map((i) => `<li>${esc(i)}</li>`).join('\n');

const addOnsBlock = () => {
  const a = q.addOns;
  if (!a || !Array.isArray(a.rows) || a.rows.length === 0) return '';
  return `<div class="sh gray"><h2>${esc(a.title)}</h2><span class="tag">${esc(a.tag)}</span></div>
    <table><tbody>${rowsHtml(a.rows)}</tbody></table>`;
};

// ----- token map ------------------------------------------------------------
const tokens = {
  TITLE: `${esc(q.headline).replace(/<br\s*\/?>/g, ' ')} — ${esc(q.sender.brandLine1)} ${esc(q.sender.brandLine2)}`,
  FONT_PLAYFAIR: dataUri(path.join(HERE, 'playfair-display.woff2'), 'font/woff2'),

  BRAND_LINE_1: q.sender.brandLine1,
  BRAND_LINE_2: q.sender.brandLine2,
  SENDER_NAME: q.sender.name,
  SENDER_PHONE: q.sender.phone,
  SENDER_EMAIL: q.sender.email,
  SENDER_VENUE_SHORT: q.sender.venueShort,

  BADGES: badges(q.badges ?? []),
  CLIENT_COMPANY: q.client.company,
  CLIENT_CONTACT: q.client.contact,
  EVENT_LABEL: q.client.eventLabel,
  GUESTS: q.client.guests,

  SIDEBAR_1_PHOTOS: sidebarPhotos(q.photos.sidebar1 ?? []),
  SIDEBAR_2_PHOTOS: sidebarPhotos(q.photos.sidebar2 ?? []),
  HERO_SRC: photo(q.photos.hero.file),
  HERO_ALT: q.photos.hero.alt,

  HEADLINE: q.headline,
  SUBHEAD: q.subhead,
  LEDE_TITLE: q.lede.title,
  LEDE_BODY: q.lede.body,
  INCLUDES_TITLE: q.includes.title,
  INCLUDES: includes(q.includes.items ?? []),
  MAKE_IT_YOURS_TITLE: q.makeItYours?.title ?? '',
  MAKE_IT_YOURS: q.makeItYours?.body ?? '',
  GETTING_THERE_TITLE: q.gettingThere?.title ?? '',
  GETTING_THERE: q.gettingThere?.body ?? '',
  PARTNER_TITLE: q.partnerCallout?.title ?? '',
  PARTNER_BODY: q.partnerCallout?.body ?? '',
  PARTNER_BUTTON: q.partnerCallout?.buttonLabel ?? '',
  PARTNER_URL: q.partnerCallout?.url ?? '',
  PARTNER_URL_LABEL: q.partnerCallout?.urlLabel ?? q.partnerCallout?.url ?? '',

  ESTIMATE_TITLE: q.estimate?.title ?? 'Party Details &amp; Estimate',
  ESTIMATE_SUB: q.estimate?.sub ?? '',
  BOAT_TITLE: q.boat.title,
  BOAT_TAG: q.boat.tag ?? '',
  BOAT_ROWS: rowsHtml(q.boat.rows ?? []),
  FOOD_TITLE: q.food.title,
  FOOD_TAG: q.food.tag ?? '',
  FOOD_ROWS: rowsHtml(q.food.rows ?? []),
  DRINKS_TITLE: q.drinks.title,
  DRINKS_TAG: q.drinks.tag ?? '',
  DRINKS_ROWS: rowsHtml(q.drinks.rows ?? []),
  ADDONS_BLOCK: addOnsBlock(),

  TOTAL_LABEL: q.total.label,
  TOTAL_AMOUNT: q.total.amount,
  TOTAL_CLASS: String(q.total.amount).length > 12 ? ' xlong' : String(q.total.amount).length > 9 ? ' long' : '',
  TOTAL_NOTE: q.total.note ?? '',
  WEATHER_TITLE: q.weather?.title ?? '',
  WEATHER: q.weather?.body ?? '',
  QUESTIONS_TITLE: q.questions?.title ?? '',
  QUESTIONS: q.questions?.body ?? '',
};

// ----- render ---------------------------------------------------------------
let html = template;
for (const [k, v] of Object.entries(tokens)) {
  html = html.split(`{{${k}}}`).join(esc(v));
}
const leftover = [...new Set(html.match(/\{\{[A-Z0-9_]+\}\}/g) ?? [])];
if (leftover.length) {
  console.error(`template tokens left unfilled: ${leftover.join(', ')}`);
  process.exit(1);
}

const slug = String(q.quoteId).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
const outPath = path.resolve(flags.out ?? `quote-${slug}.html`);
fs.writeFileSync(outPath, html);
console.log(outPath);
console.error(`\n=== Quote HTML written: ${outPath} ===`);
console.error(`quoteId: ${q.quoteId}  ·  ${q.client.company.replace(/&amp;/g, '&')}  ·  ${q.client.guests} guests  ·  status: ${q.status ?? 'draft'}`);
console.error(`size: ${(fs.statSync(outPath).size / 1048576).toFixed(2)} MB`);

// ----- pdf ------------------------------------------------------------------
if (flags.pdf === 'true') {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const chrome = candidates.find((c) => fs.existsSync(c));
  const pdfPath = outPath.replace(/\.html?$/i, '') + '.pdf';

  if (!chrome) {
    console.error('\nChrome not found — open the HTML in a browser and print: Letter, margins None.');
    console.error('(set CHROME_BIN to point at a Chrome/Chromium binary to automate this)');
  } else {
    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--window-size=1400,1600', // MUST exceed Letter width; see header comment
        '--no-pdf-header-footer',
        `--print-to-pdf=${pdfPath}`,
        '--virtual-time-budget=6000',
        `file://${outPath}`,
      ],
      { stdio: ['ignore', 'ignore', 'ignore'] }
    );
    const pdf = fs.readFileSync(pdfPath);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    console.error(`=== PDF written: ${pdfPath} (${pages} page${pages === 1 ? '' : 's'}) ===`);
    if (pages !== 2) {
      console.error(`ERROR: expected exactly 2 pages, got ${pages}. Content overflowed — trim copy or rows.`);
      process.exit(1);
    }
    console.log(pdfPath);
  }
}

if (flags.open === 'true') {
  try {
    execFileSync('open', [outPath], { stdio: 'ignore' });
  } catch {
    /* non-mac: ignore */
  }
}

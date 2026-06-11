import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const raw = JSON.parse(fs.readFileSync('docs/seo/recommendations/keyword-recovery-2026-06-raw.json', 'utf8'));

// Collect ALL product URLs from GSC
const slugMap = new Map<string, {impr: number, clicks: number}>();
for (const w of [raw.by_query_page.current, raw.by_query_page.prior]) {
  for (const r of w) {
    if (!r.page.includes('/products/')) continue;
    const slug = r.page.replace(/^https?:\/\/[^/]+\/products\//, '').split('?')[0];
    const cur = slugMap.get(slug) || {impr: 0, clicks: 0};
    cur.impr += r.impressions || 0;
    cur.clicks += r.clicks || 0;
    slugMap.set(slug, cur);
  }
}

// Filter out malformed slugs (full URLs, image paths, anything with / or :)
const SLUG_OK = /^[a-z0-9][a-z0-9-_]*$/i;
for (const k of [...slugMap.keys()]) {
  if (!SLUG_OK.test(k)) slugMap.delete(k);
}
const slugs = [...slugMap.keys()];
const products = await prisma.product.findMany({
  where: { handle: { in: slugs } },
  select: { handle: true, status: true, productType: true, tags: true, title: true },
});
const byHandle = new Map(products.map(p => [p.handle, p]));

// Slug-keyword classifier for both tagged + untagged products
function classify(slug: string, p?: {productType?: string|null, tags?: string[]}): string {
  const s = slug.toLowerCase();
  const tags = (p?.tags || []).join(' ').toLowerCase();
  const pt = (p?.productType || '').toLowerCase();
  const blob = `${s} ${tags} ${pt}`;

  // Order matters — more specific first
  if (/keg|barrel|sankey/.test(blob)) return '/kegs';
  if (/cocktail.?kit|spritz.?kit|margarita.?kit|jello.?shot|bundle|pitcher.?kit/.test(blob)) return '/cocktail-kits';
  if (/rental|cooler|chair|tent|dispenser|table.?rental/.test(blob)) return '/products?search=rentals';
  if (/horseshoes|game|cornhole|sunglasses|hat|pool.?lounger|decor|disco|cowboy|party.?favor|straws?|cups?|napkin|photo.?booth/.test(blob)) return '/products?search=party+supplies';
  if (/hydration|hangover|electrolyte|recovery|supplement/.test(blob)) return '/products?search=hydration';
  if (/seltzer|hard.?seltzer|claw|high.?noon|ranch.?water|truly|fizz|tall.?boy/.test(blob)) return '/products?search=seltzers';
  if (/wine|cava|champagne|prosecco|chardonnay|cabernet|sauvignon|merlot|rose|brut|riesling|pinot/.test(blob)) return '/products?search=wine';
  if (/vodka|tequila|whiskey|whisky|rum|gin|scotch|bourbon|liqueur|triple.?sec|absinthe|cognac|brandy|mezcal|amaretto/.test(blob)) return '/products?search=liquor';
  if (/beer|ipa|lager|pilsner|stout|ale|hefe|porter|wheat|blonde|amber/.test(blob)) return '/products?search=beer';
  if (/juice|soda|water|mixer|tonic|syrup|grenadine|bitters|brine|na\b|non.?alcoholic|mocktail/.test(blob)) return '/products?search=mixers';
  return '/products';
}

const rows = slugs
  .filter(slug => {
    const p = byHandle.get(slug);
    return !p || p.status === 'ARCHIVED' || p.status === 'DRAFT';
  })
  .map(slug => {
    const p = byHandle.get(slug);
    const g = slugMap.get(slug)!;
    return {
      slug,
      status: p?.status || 'NOT_IN_DB',
      title: p?.title || null,
      impr: g.impr,
      clicks: g.clicks,
      target: classify(slug, p),
      is_copy_dup: slug.endsWith('-copy'),
    };
  })
  .sort((a, b) => b.impr - a.impr);

// Stats
const stats = {
  total: rows.length,
  by_target: rows.reduce((acc: any, r) => { acc[r.target] = (acc[r.target] || 0) + 1; return acc; }, {}),
  copy_dups: rows.filter(r => r.is_copy_dup).length,
  total_impr_recovered: rows.reduce((s, r) => s + r.impr, 0),
};

console.log('STATS:', JSON.stringify(stats, null, 2));
console.log('\nSAMPLE_BY_TARGET:');
const samples: any = {};
for (const r of rows) {
  if (!samples[r.target]) samples[r.target] = [];
  if (samples[r.target].length < 3) samples[r.target].push({slug: r.slug, impr: r.impr, status: r.status});
}
console.log(JSON.stringify(samples, null, 2));

// Write the final redirect map as JSON
fs.writeFileSync('/tmp/redirect-map.json', JSON.stringify(rows, null, 2));
console.log('\nWrote /tmp/redirect-map.json');
await prisma.$disconnect();

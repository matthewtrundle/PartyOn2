import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const raw = JSON.parse(fs.readFileSync('docs/seo/recommendations/keyword-recovery-2026-06-raw.json', 'utf8'));

// Aggregate ALL /products/ pages from GSC across both windows
const map = new Map<string, {impr: number, clicks: number, queries: number}>();
for (const w of [raw.by_query_page.current, raw.by_query_page.prior]) {
  for (const r of w) {
    if (!r.page.includes('/products/')) continue;
    const slug = r.page.replace(/^https?:\/\/[^/]+\/products\//, '').split('?')[0];
    const cur = map.get(slug) || {impr: 0, clicks: 0, queries: 0};
    cur.impr += r.impressions || 0;
    cur.clicks += r.clicks || 0;
    cur.queries += 1;
    map.set(slug, cur);
  }
}

const slugs = [...map.keys()];
const products = await prisma.product.findMany({
  where: { handle: { in: slugs } },
  select: { handle: true, status: true, title: true },
});
const byHandle = new Map(products.map(p => [p.handle, p]));

const rows = slugs.map(slug => {
  const g = map.get(slug)!;
  const p = byHandle.get(slug);
  return {
    handle: slug,
    title: p?.title || '(NOT IN DB)',
    status: p?.status || 'NOT_IN_DB',
    queries: g.queries, impr: g.impr, clicks: g.clicks,
  };
});

const archived = rows.filter(r => r.status === 'ARCHIVED' || r.status === 'NOT_IN_DB');
archived.sort((a,b) => b.impr - a.impr);

const summary = {
  total_product_pages: rows.length,
  archived_count: rows.filter(r=>r.status==='ARCHIVED').length,
  not_in_db_count: rows.filter(r=>r.status==='NOT_IN_DB').length,
  active_count: rows.filter(r=>r.status==='ACTIVE').length,
  draft_count: rows.filter(r=>r.status==='DRAFT').length,
  archived_total_impr: rows.filter(r=>r.status==='ARCHIVED').reduce((s,r)=>s+r.impr,0),
  archived_total_clicks: rows.filter(r=>r.status==='ARCHIVED').reduce((s,r)=>s+r.clicks,0),
  not_in_db_total_impr: rows.filter(r=>r.status==='NOT_IN_DB').reduce((s,r)=>s+r.impr,0),
};

console.log('SUMMARY:', JSON.stringify(summary, null, 2));
console.log('\nFULL_ARCHIVED:');
console.log(JSON.stringify(archived, null, 2));
await prisma.$disconnect();

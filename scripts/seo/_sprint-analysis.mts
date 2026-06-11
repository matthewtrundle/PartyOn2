import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const gsc = JSON.parse(fs.readFileSync('/tmp/gsc-products.json', 'utf8'));
const slugs: string[] = gsc.map((r: any) => r.page.replace('https://partyondelivery.com/products/', ''));

const products = await prisma.product.findMany({
  where: { handle: { in: slugs } },
  select: {
    id: true, handle: true, title: true, description: true, descriptionHtml: true,
    metaTitle: true, metaDescription: true, status: true, basePrice: true,
    variants: { select: { title: true, price: true, inventoryQuantity: true } },
  },
});
const productsById = new Map(products.map(p => [p.id, p]));

const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
const ids = products.map(p => p.id);
const sales90 = ids.length ? await prisma.$queryRaw<Array<{product_id: string, qty: bigint, rev: any}>>`
  SELECT product_id, SUM(quantity)::bigint as qty, SUM(total_price)::numeric as rev
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= ${ninetyDaysAgo} AND oi.product_id = ANY(${ids})
  GROUP BY product_id
` : [];
const salesByHandle = new Map<string, {qty: number, rev: number}>();
for (const row of sales90) {
  const handle = productsById.get(row.product_id)?.handle;
  if (handle) salesByHandle.set(handle, {qty: Number(row.qty), rev: Number(row.rev)});
}

const rows = gsc.map((g: any) => {
  const handle = g.page.replace('https://partyondelivery.com/products/', '');
  const p = products.find(p => p.handle === handle);
  const descLen = (p?.description || (p?.descriptionHtml || '').replace(/<[^>]+>/g, '')).trim().length;
  const s = salesByHandle.get(handle) || {qty: 0, rev: 0};
  return {
    handle, title: p?.title || '(NOT IN DB)', status: p?.status || '?',
    impr: g.total_impr, clicks: g.total_clicks,
    pos: g.avg_pos ? Math.round(g.avg_pos*10)/10 : null,
    desc_chars: descLen,
    has_meta_title: !!p?.metaTitle, has_meta_desc: !!p?.metaDescription,
    sales_90d: s.qty, rev_90d: Math.round(s.rev),
    base_price: p?.basePrice ? Number(p.basePrice) : null,
  };
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();

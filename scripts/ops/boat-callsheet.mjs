#!/usr/bin/env node
/**
 * Boat / Premier CALL SHEET for a date window.
 *
 * Cross-references BoatSchedule (the Premier "2026 Bookings Master List" sheet,
 * synced nightly → source of truth) against GroupOrderV2 boat dashboards, and
 * produces a printable HTML call list: cruise booker, tap-to-call phone, email,
 * FULL dashboard URL (copy/paste into a text), order count + total, and data
 * flags. Contains customer PII — writes a LOCAL html file only, never uploaded.
 *
 * Matching (important — an earlier version over-matched):
 *   1. exact 10-digit phone
 *   2. else STRICT name — both a real 2+ token name, ≥5 chars (rejects junk
 *      single-letter host dashboards like "C"/"j" that substring-matched names)
 *   Among candidates, prefer the one whose boat tab is dated on the cruise.
 *
 * Usage:
 *   node scripts/ops/boat-callsheet.mjs                       # today → +7 days
 *   node scripts/ops/boat-callsheet.mjs 2026-08-01            # from a date, +7
 *   node scripts/ops/boat-callsheet.mjs 2026-08-01 2026-08-08 # explicit window
 *   node scripts/ops/boat-callsheet.mjs --out=/tmp/week.html  # custom output
 * Load env first: set -a && source .env.local && set +a
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
const prisma = new PrismaClient();

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const argv = process.argv.slice(2);
const dateArgs = argv.filter((a) => /^\d{4}-\d\d-\d\d$/.test(a));
const outArg = (argv.find((a) => a.startsWith('--out=')) || '').slice(6) || argv.find((a) => a.endsWith('.html'));
const START = dateArgs[0] || iso(new Date());
const END = dateArgs[1] || iso(addDays(new Date(START + 'T00:00:00Z'), 7));
const OUT = outArg || 'boat-callsheet.html';

const P = (s) => (s || '').replace(/\D/g, '').slice(-10);
const N = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const fmtPhone = (s) => { const p = P(s); return p.length === 10 ? `(${p.slice(0,3)}) ${p.slice(3,6)}-${p.slice(6)}` : (s || ''); };
const clean = (n) => (n || '').replace(/\*+.*$/s, '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[☀-➿←-⇿⬀-⯿]/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const telHref = (s) => '+1' + P(s);
// Non-customer rows in the Premier sheet (boat status markers, not people to call)
const NON_CUSTOMER = /(under repair|maintenance|out of service|dry dock|available|^open$|^blocked|^hold$|^tbd$|^n a$|^disco$)/;

async function main() {
  const start = new Date(START + 'T00:00:00Z');
  const end = new Date(END + 'T23:59:59Z');

  const sched = (await prisma.boatSchedule.findMany({
    where: { cruiseDate: { gte: start, lte: end }, isStale: false },
    orderBy: [{ cruiseDate: 'asc' }, { timeSlot: 'asc' }],
  })).filter((s) => { const n = N(s.clientName); return n && n.length > 2 && !NON_CUSTOMER.test(n); });

  const dashes = await prisma.groupOrderV2.findMany({
    where: { OR: [{ source: 'WEBHOOK' }, { partyType: 'BOAT' }] },
    select: {
      shareCode: true, hostName: true, hostEmail: true, hostPhone: true, name: true, source: true, status: true,
      tabs: { select: { deliveryDate: true, deliveryTime: true, deliveryContextType: true, status: true }, orderBy: { position: 'asc' } },
      orders: { select: { id: true, total: true } },
    },
  });
  const usedCodes = new Set();
  const findDash = (s, cruiseDate) => {
    const sp = P(s.clientPhone), sn = N(s.clientName);
    const strictName = (x) => { const hn = N(x.hostName);
      return hn.length >= 5 && sn.length >= 5 && hn.split(' ').length >= 2 && sn.split(' ').length >= 2 && (hn === sn || hn.includes(sn) || sn.includes(hn)); };
    let cands = sp.length === 10 ? dashes.filter((x) => P(x.hostPhone) === sp) : [];
    if (!cands.length) cands = dashes.filter(strictName);
    if (!cands.length) return null;
    return cands.find((x) => x.tabs.some((t) => t.deliveryDate?.toISOString().slice(0, 10) === cruiseDate)) || cands[0];
  };

  const rows = sched.map((s) => {
    const cruiseDate = s.cruiseDate.toISOString().slice(0, 10);
    const d = findDash(s, cruiseDate);
    if (d) usedCodes.add(d.shareCode);
    const boatTab = d ? (d.tabs.find((t) => t.deliveryContextType === 'BOAT') || d.tabs[0]) : null;
    const dashDate = boatTab?.deliveryDate?.toISOString().slice(0, 10) || null;
    const anyOpen = d ? d.tabs.some((t) => t.status === 'OPEN') : false;
    const flags = [];
    if (!d) flags.push('NO DASHBOARD');
    else { if (dashDate !== cruiseDate) flags.push('DATE MISMATCH'); if (!anyOpen) flags.push('LOCKED — reopen'); }
    return {
      cruiseDate,
      day: (s.dayOfWeek || new Date(cruiseDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })).toUpperCase(),
      slot: s.timeSlot || '', type: s.sheetTab.includes('PVT') ? 'PRIVATE' : 'DISCO', boat: s.boat === 'UNASSIGNED' ? '' : s.boat,
      name: clean(s.clientName), phone: fmtPhone(s.clientPhone || d?.hostPhone), email: d?.hostEmail || '',
      occ: s.occasion || '', hc: s.headcount ?? '',
      code: d?.shareCode || null, url: d ? `https://partyondelivery.com/dashboard/${d.shareCode}` : null,
      ordered: d ? d.orders.length > 0 : false,
      orderCount: d ? d.orders.length : 0,
      orderTotal: d ? d.orders.reduce((a, o) => a + Number(o.total || 0), 0) : 0,
      flags,
    };
  });

  // Orphan dashboards: real-name boat dashboards with a tab this window but no schedule match
  const orphans = dashes.filter((d) => {
    if (usedCodes.has(d.shareCode)) return false;
    const hn = N(d.hostName);
    if (hn.length < 5 || hn.split(' ').length < 2 || hn.includes('wedding') || hn === 'party host' || !d.hostPhone) return false;
    return d.tabs.some((t) => { const td = t.deliveryDate?.toISOString().slice(0, 10); return td >= START && td <= END; });
  }).map((d) => ({ code: d.shareCode, name: clean(d.hostName), phone: fmtPhone(d.hostPhone),
      url: `https://partyondelivery.com/dashboard/${d.shareCode}`, date: d.tabs[0]?.deliveryDate?.toISOString().slice(0, 10) }));

  const days = [...new Set(rows.map((r) => r.cruiseDate))].sort();
  const dayName = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const typeBadge = (t) => t === 'PRIVATE' ? '<span class="badge pvt">PRIVATE</span>' : '<span class="badge dsc">DISCO</span>';
  const flagBadge = (f) => `<span class="flag ${f.startsWith('LOCKED') ? 'amber' : 'red'}">${esc(f)}</span>`;
  const totalNeedCall = rows.filter((r) => !r.ordered).length;
  const flagged = rows.filter((r) => r.flags.length);

  let html = `<!doctype html><html><head><meta charset="utf-8"><title>Boat Call Sheet · ${START} → ${END}</title>
<style>
  :root{ --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --blue:#0B74B8; }
  *{ box-sizing:border-box; } body{ font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif; color:var(--ink); margin:0; padding:24px; background:#f8fafc; }
  h1{ font-size:22px; margin:0 0 2px; } .sub{ color:var(--muted); margin:0 0 16px; }
  .stats{ display:flex; gap:10px; flex-wrap:wrap; margin:0 0 20px; }
  .stat{ background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px 14px; min-width:110px; }
  .stat b{ display:block; font-size:22px; } .stat span{ color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  .alert{ background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:12px 16px; margin:0 0 20px; }
  .alert h3{ margin:0 0 6px; font-size:14px; color:#9a3412; } .alert ul{ margin:0; padding-left:18px; }
  h2{ font-size:15px; margin:22px 0 8px; padding-bottom:4px; border-bottom:2px solid var(--ink); text-transform:uppercase; letter-spacing:.05em; }
  table{ width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th,td{ text-align:left; padding:9px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th{ background:#f1f5f9; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  tr:last-child td{ border-bottom:none; }
  .name{ font-weight:700; font-size:15px; } .meta{ color:var(--muted); font-size:12px; }
  a.tel{ font-variant-numeric:tabular-nums; font-weight:600; color:var(--ink); text-decoration:none; white-space:nowrap; }
  a.dash{ color:var(--blue); text-decoration:none; font-family:ui-monospace,Menlo,monospace; font-size:12px; word-break:break-all; }
  .slot{ font-variant-numeric:tabular-nums; white-space:nowrap; }
  .badge{ display:inline-block; font-size:10px; font-weight:700; padding:2px 6px; border-radius:5px; letter-spacing:.04em; }
  .badge.dsc{ background:#ffedd5; color:#9a3412; } .badge.pvt{ background:#ccfbf1; color:#0f766e; }
  .flag{ display:inline-block; font-size:10px; font-weight:700; padding:2px 6px; border-radius:5px; }
  .flag.red{ background:#fee2e2; color:#b91c1c; } .flag.amber{ background:#fef9c3; color:#854d0e; }
  .pill{ display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:99px; white-space:nowrap; }
  .pill.ok{ background:#dcfce7; color:#166534; } .pill.call{ background:#e0f2fe; color:#075985; }
  tr.done td{ background:#fafefb; }
  @media print{ body{ background:#fff; padding:0; } .stat,table,.alert{ break-inside:avoid; } a{ color:var(--ink); } }
</style></head><body>
<h1>Boat / Premier Call Sheet</h1>
<p class="sub">${dayName(days[0] || START)} – ${dayName(days[days.length - 1] || END)} · schedule = source of truth · status shows orders · $total</p>
<div class="stats">
  <div class="stat"><b>${rows.length}</b><span>Boat bookings</span></div>
  <div class="stat"><b>${rows.filter((r) => r.code).length}</b><span>Have dashboards</span></div>
  <div class="stat"><b>${totalNeedCall}</b><span>No orders — CALL</span></div>
  <div class="stat"><b>${rows.length - totalNeedCall}</b><span>Have ≥1 order</span></div>
</div>`;

  if (flagged.length || orphans.length) {
    html += `<div class="alert"><h3>⚠ Data checks</h3><ul>`;
    if (!flagged.length) html += `<li>All ${rows.length} bookings matched a dashboard with the correct cruise date. ✓</li>`;
    for (const r of flagged) html += `<li><b>${esc(r.name)}</b> (${r.code || 'no code'}, ${r.cruiseDate}) — ${r.flags.join(', ')}</li>`;
    for (const o of orphans) html += `<li>Orphan dashboard <b>${esc(o.name)}</b> (${o.code}, tab ${o.date}) — no matching Premier-sheet entry; verify not cancelled.</li>`;
    html += `</ul></div>`;
  }

  for (const day of days) {
    const dr = rows.filter((r) => r.cruiseDate === day);
    html += `<h2>${dayName(day)} · ${dr.length} boats</h2><table><thead><tr>
      <th>Status</th><th>Guest / cruise</th><th>Phone</th><th>Dashboard URL (copy → text)</th><th>Flags</th></tr></thead><tbody>`;
    for (const r of dr) {
      html += `<tr class="${r.ordered ? 'done' : ''}">
        <td>${r.ordered ? `<span class="pill ok">${r.orderCount} order${r.orderCount > 1 ? 's' : ''} · $${r.orderTotal.toFixed(0)}</span>` : '<span class="pill call">CALL</span>'}</td>
        <td><div class="name">${esc(r.name)}</div>
            <div class="meta"><span class="slot">${esc(r.slot)}</span> · ${typeBadge(r.type)}${r.boat ? ' · ' + esc(r.boat) : ''} · ${esc(r.occ)}${r.hc ? ' · ' + r.hc + ' ppl' : ''}</div>
            ${r.email ? `<div class="meta">${esc(r.email)}</div>` : ''}</td>
        <td><a class="tel" href="tel:${telHref(r.phone)}">${esc(r.phone)}</a></td>
        <td>${r.url ? `<a class="dash" href="${r.url}">${r.url}</a>` : '<span class="flag red">NONE</span>'}</td>
        <td>${r.flags.map(flagBadge).join(' ') || '<span class="meta">ok</span>'}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</body></html>`;

  writeFileSync(OUT, html);
  console.error(`Wrote ${OUT}`);
  console.error(`Window ${START}..${END} | bookings ${rows.length} | dashboards ${rows.filter((r) => r.code).length} | no-order ${totalNeedCall} | flags ${flagged.length} | orphans ${orphans.length}`);
  console.log(OUT);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

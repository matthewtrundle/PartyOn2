#!/usr/bin/env node
/**
 * Ensure every UPCOMING boat/Premier cruise dashboard is correctly dated and OPEN.
 *
 * Report-only by default. `--apply` performs ONLY the safe fix (reopen tabs that
 * are LOCKED but already have the correct cruise date). Date mismatches, missing
 * dashboards, and ambiguous matches are FLAGGED, never auto-fixed — those need a
 * human call (a "stale date" is often a repeat customer's real past cruise, and
 * re-dating it would destroy that record).
 *
 * Matching mirrors boat-callsheet.mjs: exact phone, else strict 2+ token name,
 * preferring the candidate dated on the cruise (avoids junk single-letter hosts
 * and old same-phone dashboards).
 *
 * Categories:
 *   OK       - dashboard dated on the cruise + a tab OPEN. No action.
 *   REOPEN   - dated on the cruise but all tabs LOCKED, cruise upcoming. --apply reopens.
 *   REDATE?  - only a stale (past-dated) dashboard found. FLAG — verify repeat customer vs bug.
 *   REVIEW   - ambiguous match (multiple candidates). FLAG.
 *   NO_DASH  - none found. FLAG — needs a dashboard created.
 *
 * Usage:
 *   node scripts/ops/dashboard-openaudit.mjs                 # today → +14, report
 *   node scripts/ops/dashboard-openaudit.mjs --apply         # + reopen safe cases
 *   node scripts/ops/dashboard-openaudit.mjs 2026-08-01 2026-08-20
 * Load env first: set -a && source .env.local && set +a
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const dateArgs = argv.filter((a) => /^\d{4}-\d\d-\d\d$/.test(a));
const START = dateArgs[0] || iso(new Date());
const END = dateArgs[1] || iso(addDays(new Date(START + 'T00:00:00Z'), 14));

const P = (s) => (s || '').replace(/\D/g, '').slice(-10);
const N = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const clean = (n) => (n || '').replace(/\*+.*$/s, '').replace(/\s+/g, ' ').trim();
const NON = /(under repair|maintenance|out of service|dry dock|available|^open$|^blocked|^hold$|^tbd$|^n a$|^disco$)/;

async function main() {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const start = new Date(START + 'T00:00:00Z'), end = new Date(END + 'T23:59:59Z');

  const sched = (await prisma.boatSchedule.findMany({
    where: { cruiseDate: { gte: start, lte: end }, isStale: false }, orderBy: [{ cruiseDate: 'asc' }],
  })).filter((s) => { const n = N(s.clientName); return n && n.length > 2 && !NON.test(n); });

  const dashes = await prisma.groupOrderV2.findMany({
    where: { OR: [{ source: 'WEBHOOK' }, { partyType: 'BOAT' }] },
    select: { id: true, shareCode: true, hostName: true, hostPhone: true,
      tabs: { select: { id: true, deliveryDate: true, deliveryContextType: true, status: true } } },
  });
  // returns { list: candidates, chosen } — chosen prefers the on-cruise-date candidate
  const match = (s, cd) => {
    const sp = P(s.clientPhone), sn = N(s.clientName);
    const strict = (x) => { const hn = N(x.hostName);
      return hn.length >= 5 && sn.length >= 5 && hn.split(' ').length >= 2 && sn.split(' ').length >= 2 && (hn === sn || hn.includes(sn) || sn.includes(hn)); };
    let list = sp.length === 10 ? dashes.filter((x) => P(x.hostPhone) === sp) : [];
    if (!list.length) list = dashes.filter(strict);
    if (!list.length) return null;
    const onDate = list.find((x) => x.tabs.some((t) => t.deliveryDate?.toISOString().slice(0, 10) === cd));
    return { list, chosen: onDate || list[0], onDate: !!onDate };
  };

  const plan = { OK: [], REOPEN: [], REDATE: [], REVIEW: [], NO_DASH: [] };
  for (const s of sched) {
    const cd = s.cruiseDate.toISOString().slice(0, 10);
    const m = match(s, cd);
    const row = { cd, name: clean(s.clientName), tab: s.sheetTab };
    if (!m) { plan.NO_DASH.push(row); continue; }
    row.code = m.chosen.shareCode; row.dashId = m.chosen.id;
    const anyOpen = m.chosen.tabs.some((t) => t.status === 'OPEN');
    if (m.onDate) { (anyOpen ? plan.OK : plan.REOPEN).push(row); continue; }
    // no candidate dated on the cruise
    row.detail = `${m.list.length} candidate(s), best dated ${m.chosen.tabs[0]?.deliveryDate?.toISOString().slice(0, 10)}`;
    (m.list.length === 1 ? plan.REDATE : plan.REVIEW).push(row);
  }

  const line = (r) => `  ${r.cd}  ${String(r.name).slice(0, 28).padEnd(29)} ${r.code || '—'}${r.detail ? '  ' + r.detail : ''}`;
  console.log(`\n=== DASHBOARD OPEN/DATE AUDIT  ${START}..${END}  [${APPLY ? 'APPLY' : 'REPORT'}]  today=${iso(today)} ===`);
  console.log(`OK ${plan.OK.length} | REOPEN ${plan.REOPEN.length} | REDATE? ${plan.REDATE.length} | REVIEW ${plan.REVIEW.length} | NO_DASH ${plan.NO_DASH.length}\n`);
  console.log('REOPEN (locked, correct date, upcoming → --apply reopens):'); plan.REOPEN.forEach((r) => console.log(line(r)));
  console.log('\nREDATE? (only a stale dashboard — VERIFY repeat-customer vs bug, then fix by hand):'); plan.REDATE.forEach((r) => console.log(line(r)));
  console.log('\nREVIEW (ambiguous match — inspect):'); plan.REVIEW.forEach((r) => console.log(line(r)));
  console.log('\nNO_DASHBOARD (needs a dashboard created):'); plan.NO_DASH.forEach((r) => console.log(line(r)));

  if (!APPLY) { console.log('\nREPORT-ONLY — re-run with --apply to reopen the safe (REOPEN) cases.'); await prisma.$disconnect(); return; }
  let reopened = 0;
  for (const r of plan.REOPEN) {
    const res = await prisma.subOrder.updateMany({ where: { groupOrderId: r.dashId, status: 'LOCKED' }, data: { status: 'OPEN' } });
    reopened += res.count;
  }
  console.log(`\nAPPLIED: reopened ${reopened} locked tabs across ${plan.REOPEN.length} dashboards. (REDATE?/REVIEW/NO_DASH left for manual handling.)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

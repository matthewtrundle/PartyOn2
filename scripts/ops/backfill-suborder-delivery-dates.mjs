#!/usr/bin/env node
/**
 * One-time backfill for the delivery-date honesty fix (2026-08-01).
 *
 * Self-serve dashboards used to be born with a silent "+7 days" placeholder
 * delivery date (delivery_date_confirmed=false), while real-date creation
 * paths (Premier webhook, quote flow, portal) never set the confirmed flag
 * either — so real and fake dates were indistinguishable. New code creates
 * dateless tabs (NULL) for self-serve and confirmed dates for real-date
 * paths; this script fixes the existing rows.
 *
 * Phases (run separately; each is idempotent — matched rows stop matching):
 *
 *   confirm  Mark trustworthy existing dates as confirmed:
 *              A1: WEBHOOK dashboards (Premier cruise dates are authoritative)
 *              A2: non-webhook tabs whose date does NOT fit the fake pattern
 *                  (noon UTC AND created_at + 7..8 days) — those dates were
 *                  caller-supplied or ops-set, not defaulted.
 *            SAFE TO RUN BEFORE THE CODE DEPLOY (only flips a boolean the
 *            old code already handles).
 *
 *   null     Clear the fake placeholder on live prospects: OPEN, unconfirmed,
 *            non-WEBHOOK, fake-pattern date, and zero purchases/payments/paid
 *            delivery invoices → delivery_date = NULL, order_deadline = NULL.
 *            ONLY AFTER THE NEW CODE IS LIVE — old serializers crash on NULL.
 *
 * Report-only by default; `--apply` performs the update.
 *
 * Usage:
 *   node scripts/ops/backfill-suborder-delivery-dates.mjs --phase confirm
 *   node scripts/ops/backfill-suborder-delivery-dates.mjs --phase confirm --apply
 *   node scripts/ops/backfill-suborder-delivery-dates.mjs --phase null
 *   node scripts/ops/backfill-suborder-delivery-dates.mjs --phase null --apply
 * Load env first: set -a && source .env.local && set +a
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const phaseIdx = argv.findIndex((a) => a === '--phase' || a.startsWith('--phase='));
const PHASE = phaseIdx === -1
  ? null
  : argv[phaseIdx].includes('=')
    ? argv[phaseIdx].split('=')[1]
    : argv[phaseIdx + 1];

if (PHASE !== 'confirm' && PHASE !== 'null') {
  console.error('Usage: backfill-suborder-delivery-dates.mjs --phase confirm|null [--apply]');
  process.exit(1);
}

// The fake default was always createdAt+7d (Sunday-bumped to +8), forced to
// noon UTC. Any PATCHed date is already confirmed=true, so an unconfirmed
// date matching this pattern is the placeholder; one that doesn't is a real
// caller-supplied date.
const FAKE_PATTERN = `
  s.delivery_date IS NOT NULL
  AND s.delivery_date::time = '12:00:00'
  AND (s.delivery_date::date - s.created_at::date) BETWEEN 7 AND 8
`;

const SELECT_COLS = `
  SELECT g.share_code AS "shareCode", g.name AS "groupName", g.source::text AS source,
         s.name AS "tabName", s.status::text AS "tabStatus",
         s.created_at AS "createdAt", s.delivery_date AS "deliveryDate"
  FROM sub_orders s JOIN group_orders_v2 g ON g.id = s.group_order_id
`;

async function report(label, whereSql) {
  const rows = await prisma.$queryRawUnsafe(`${SELECT_COLS} WHERE ${whereSql} ORDER BY s.created_at DESC`);
  const bySource = {};
  for (const r of rows) bySource[r.source] = (bySource[r.source] || 0) + 1;
  console.log(`\n${label}: ${rows.length} tab(s)  ${JSON.stringify(bySource)}`);
  for (const r of rows.slice(0, 10)) {
    console.log(
      `  ${r.shareCode}  [${r.source}/${r.tabStatus}]  "${r.tabName}" of "${r.groupName}"  ` +
      `created ${r.createdAt.toISOString().slice(0, 10)}  date ${r.deliveryDate ? r.deliveryDate.toISOString().slice(0, 10) : 'NULL'}`
    );
  }
  if (rows.length > 10) console.log(`  … and ${rows.length - 10} more`);
  return rows.length;
}

async function main() {
  console.log(`Phase: ${PHASE}   Mode: ${APPLY ? 'APPLY' : 'dry-run (pass --apply to write)'}`);

  if (PHASE === 'confirm') {
    const whereA1 = `
      g.source = 'WEBHOOK'
      AND s.delivery_date_confirmed = false
      AND s.delivery_date IS NOT NULL
    `;
    const whereA2 = `
      g.source <> 'WEBHOOK'
      AND s.delivery_date_confirmed = false
      AND s.delivery_date IS NOT NULL
      AND NOT (${FAKE_PATTERN})
    `;
    const n1 = await report('A1 — WEBHOOK dates → confirmed', whereA1);
    const n2 = await report('A2 — non-webhook real (non-fake-pattern) dates → confirmed', whereA2);

    if (APPLY) {
      const u1 = await prisma.$executeRawUnsafe(
        `UPDATE sub_orders s SET delivery_date_confirmed = true, updated_at = NOW()
         FROM group_orders_v2 g WHERE g.id = s.group_order_id AND ${whereA1}`
      );
      const u2 = await prisma.$executeRawUnsafe(
        `UPDATE sub_orders s SET delivery_date_confirmed = true, updated_at = NOW()
         FROM group_orders_v2 g WHERE g.id = s.group_order_id AND ${whereA2}`
      );
      console.log(`\nAPPLIED: A1 updated ${u1} row(s), A2 updated ${u2} row(s) (expected ${n1}/${n2}).`);
    }
  }

  if (PHASE === 'null') {
    const whereNull = `
      g.source <> 'WEBHOOK'
      AND s.delivery_date_confirmed = false
      AND s.status = 'OPEN'
      AND ${FAKE_PATTERN}
      AND NOT EXISTS (SELECT 1 FROM purchased_items pi WHERE pi.sub_order_id = s.id)
      AND NOT EXISTS (SELECT 1 FROM participant_payments pp
                      WHERE pp.sub_order_id = s.id AND pp.status IN ('PENDING', 'PAID'))
      AND NOT EXISTS (SELECT 1 FROM group_delivery_invoices gi
                      WHERE gi.sub_order_id = s.id AND gi.status = 'PAID')
    `;
    const n = await report('NULL — fake-pattern placeholder dates on open, unpaid, non-webhook tabs', whereNull);

    if (APPLY) {
      const u = await prisma.$executeRawUnsafe(
        `UPDATE sub_orders s SET delivery_date = NULL, order_deadline = NULL, updated_at = NOW()
         FROM group_orders_v2 g WHERE g.id = s.group_order_id AND ${whereNull}`
      );
      console.log(`\nAPPLIED: cleared ${u} row(s) (expected ${n}).`);
    }
  }

  if (!APPLY) console.log('\nDry run only — nothing written.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

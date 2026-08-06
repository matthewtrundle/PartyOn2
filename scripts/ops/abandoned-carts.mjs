/**
 * abandoned-carts.mjs — READ-ONLY export of unpaid-cart dashboards.
 *
 * Self-serve (DIRECT) dashboards convert at ~4% vs 11.4% partner-page and
 * 15.2% boat-webhook; ~$88K of product sits in DIRECT dashboards that hold
 * items and never got a payment. This lists them so an operator can work them
 * (or feed an approved campaign). It NEVER emails anyone, NEVER flips a flag,
 * and NEVER mutates the database — no --apply, no writes.
 *
 * The headline "raw" total matches the $88,190 analysis method (every unpaid
 * cart with items, including cancelled/past-date). The RECOVERABLE subtotal is
 * reported SEPARATELY — alive + reachable + not our own/test/outbound — so
 * nobody plans against a number padded with dead carts.
 *
 * USAGE
 *   set -a && source .env.local && set +a
 *   node scripts/ops/abandoned-carts.mjs                 # console summary
 *   node scripts/ops/abandoned-carts.mjs --csv           # also write CSV (PII → gitignored data/)
 *   node scripts/ops/abandoned-carts.mjs --json          # machine-readable
 *   node scripts/ops/abandoned-carts.mjs --out=/path.csv # custom CSV path
 *
 * Before anyone emails this list, the standing gates apply: the follow-up
 * engine's flags are OFF (needs a CAN-SPAM address + copy pass), the
 * abandoned-quote journey must apply the keystroke-fragment guard before
 * enqueuing, and SMS needs provable consent the legacy list lacks. This script
 * produces the list only — the channel decision is the operator's.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

// Anchor all default paths to the REPO ROOT (this file lives at
// scripts/ops/), not the cwd — running from another directory must not drop
// the PII CSV outside the gitignored data/ tree.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
import {
  cartValue,
  classifyDead,
  classifyExcluded,
  contactability,
  isRecoverable,
  ageDays,
  csvCell,
} from './_abandoned-carts-lib.mjs';

const WRITE_CSV = process.argv.includes('--csv');
const JSON_OUT = process.argv.includes('--json');
const OUT_FLAG = process.argv.find((a) => a.startsWith('--out='));

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
if (!process.env.DATABASE_URL) fail('DATABASE_URL missing — source your env file first.');

const prisma = new PrismaClient();

const DASHBOARD_BASE = 'https://partyondelivery.com/dashboard';

function fmtUsd(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

async function main() {
  const nowMs = Date.now();
  // Central calendar date (delivery dates are stored noon UTC → their UTC day
  // equals the Central day, so a YYYY-MM-DD string compare is correct).
  const todayCentralISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
  }).format(new Date());

  // Our own outbound-prospecting leads — exclude their dashboards from the
  // worked list (we solicited them; they're not inbound abandoned carts).
  const outreachLeads = await prisma.lead.findMany({
    where: { sourceWidget: 'PARTNER_OUTREACH' },
    select: { email: true },
  });
  const outreachEmails = new Set(
    outreachLeads.map((l) => (l.email || '').trim().toLowerCase()).filter(Boolean),
  );

  const dashes = await prisma.groupOrderV2.findMany({
    select: {
      shareCode: true,
      source: true,
      status: true,
      name: true,
      partyType: true,
      hostName: true,
      hostEmail: true,
      hostPhone: true,
      createdAt: true,
      landingPage: true,
      tabs: {
        select: {
          deliveryDate: true,
          draftItems: { select: { quantity: true, price: true } },
        },
      },
      orders: { select: { status: true } },
    },
  });

  const rows = [];
  for (const g of dashes) {
    // Unpaid = no non-cancelled order attached.
    const hasLiveOrder = (g.orders || []).some((o) => o.status !== 'CANCELLED');
    if (hasLiveOrder) continue;

    const items = (g.tabs || []).flatMap((t) => t.draftItems || []);
    const value = cartValue(items);
    if (value <= 0) continue; // only carts that actually hold items

    const itemCount = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const deliveryDates = (g.tabs || [])
      .map((t) => t.deliveryDate)
      .filter((d) => d != null);
    const latestDeliveryDate = deliveryDates.length
      ? deliveryDates.reduce((a, b) => (a > b ? a : b))
      : null;

    const dead = classifyDead(g.status, latestDeliveryDate, todayCentralISO);
    const excluded = classifyExcluded(
      { source: g.source, email: g.hostEmail },
      outreachEmails,
    );
    const contact = contactability({ email: g.hostEmail, phone: g.hostPhone });
    const recoverable = isRecoverable({
      dead: dead.dead,
      excluded: excluded.excluded,
      contact,
    });

    rows.push({
      shareCode: g.shareCode,
      dashboardUrl: `${DASHBOARD_BASE}/${g.shareCode}`,
      source: g.source,
      groupStatus: g.status,
      name: g.name,
      partyType: g.partyType,
      hostName: g.hostName,
      hostEmail: g.hostEmail || '',
      hostPhone: g.hostPhone || '',
      cartValue: Math.round(value * 100) / 100,
      itemCount,
      ageDays: ageDays(g.createdAt, nowMs),
      latestDeliveryDate: latestDeliveryDate
        ? new Date(latestDeliveryDate).toISOString().slice(0, 10)
        : '',
      dead: dead.dead,
      deadReason: dead.reason || '',
      excluded: excluded.excluded,
      excludedReason: excluded.reason || '',
      contactability: contact,
      recoverable,
    });
  }

  rows.sort((a, b) => b.cartValue - a.cartValue);

  // ─── Aggregates ───────────────────────────────────────────────────
  const bySource = {};
  for (const r of rows) {
    const s = (bySource[r.source] ??= { count: 0, raw: 0, recoverable: 0, recoverableCount: 0 });
    s.count += 1;
    s.raw += r.cartValue;
    if (r.recoverable) {
      s.recoverable += r.cartValue;
      s.recoverableCount += 1;
    }
  }
  const rawTotal = rows.reduce((s, r) => s + r.cartValue, 0);
  const recoverable = rows.filter((r) => r.recoverable);
  const recoverableTotal = recoverable.reduce((s, r) => s + r.cartValue, 0);

  const contactBuckets = { email: 0, phone: 0, none: 0 };
  for (const r of recoverable) contactBuckets[r.contactability] += 1;

  const deadCancelled = rows.filter((r) => r.deadReason === 'group-cancelled');
  const deadPastDate = rows.filter((r) => r.dead && r.deadReason.startsWith('delivery-past'));
  const deadCount = rows.filter((r) => r.dead).length;
  const excludedCount = rows.filter((r) => r.excluded && !r.dead).length;
  // Alive-but-not-recoverable = has no delivery date passed / not cancelled,
  // but we can't reach them (no email/phone) or they're excluded.
  const alive = rows.filter((r) => !r.dead);
  const aliveUnreachable = alive.filter((r) => !r.excluded && r.contactability === 'none');

  if (JSON_OUT) {
    // NOTE: --json prints full PII (host name/email/phone) to stdout. Fine for
    // the documented manual run; do NOT pipe it into a shared log / CI artifact
    // / chat sink without redacting first.
    console.log(
      JSON.stringify(
        { generatedAt: new Date().toISOString(), bySource, rawTotal, recoverableTotal, contactBuckets, rows },
        null,
        2,
      ),
    );
  } else {
    console.log(`\n=== Abandoned-cart dashboards (read-only) — ${todayCentralISO} ===\n`);
    console.log(`Unpaid dashboards holding items: ${rows.length}`);
    console.log(`RAW total (analysis method, incl. dead): ${fmtUsd(rawTotal)}`);
    console.log(
      `  DEAD: ${deadCount}  (cancelled group ${deadCancelled.length}` +
        ` / delivery date already passed ${deadPastDate.length} = ${fmtUsd(
          deadPastDate.reduce((s, r) => s + r.cartValue, 0),
        )})`,
    );
    console.log(
      `  ALIVE: ${alive.length}   excluded (own/test/outbound) ${excludedCount}` +
        `   alive-but-unreachable (no email/phone) ${aliveUnreachable.length}`,
    );
    console.log('');
    console.log('By dashboard source:');
    for (const [src, s] of Object.entries(bySource).sort((a, b) => b[1].raw - a[1].raw)) {
      console.log(
        `  ${src.padEnd(13)} ${String(s.count).padStart(4)} carts  raw ${fmtUsd(s.raw).padStart(10)}` +
          `   recoverable ${String(s.recoverableCount).padStart(4)} / ${fmtUsd(s.recoverable)}`,
      );
    }
    console.log('');
    console.log(
      `RECOVERABLE subtotal (alive + reachable + not own/test/outbound): ` +
        `${recoverable.length} carts / ${fmtUsd(recoverableTotal)}`,
    );
    console.log(
      `  reachable by — email: ${contactBuckets.email}   phone-only: ${contactBuckets.phone}` +
        `   neither: (excluded from recoverable)`,
    );
    console.log('');
    console.log('Top 15 recoverable carts by value:');
    for (const r of recoverable.slice(0, 15)) {
      console.log(
        `  ${fmtUsd(r.cartValue).padStart(9)}  ${String(r.itemCount).padStart(3)} items  ` +
          `${String(r.ageDays ?? '?').padStart(3)}d  ${r.source.padEnd(12)} ` +
          `${(r.hostName || '—').slice(0, 20).padEnd(20)} ${r.contactability.padEnd(6)} ${r.shareCode}`,
      );
    }
    console.log('');
    console.log(
      'NOTE: this is a LIST ONLY. No email sent, no flag flipped, no DB write. ' +
        'Channel + go-live gates (CAN-SPAM address, keystroke-fragment guard, SMS consent) are the operator\'s.',
    );
    console.log('');
  }

  // ─── CSV ──────────────────────────────────────────────────────────
  if (WRITE_CSV || OUT_FLAG) {
    const header = [
      'share_code', 'dashboard_url', 'cart_value', 'item_count', 'age_days', 'source',
      'group_status', 'host_name', 'host_email', 'host_phone', 'latest_delivery_date',
      'dead', 'dead_reason', 'excluded', 'excluded_reason', 'contactability', 'recoverable',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.shareCode, r.dashboardUrl, r.cartValue, r.itemCount, r.ageDays ?? '', r.source,
          r.groupStatus, r.hostName, r.hostEmail, r.hostPhone, r.latestDeliveryDate,
          r.dead, r.deadReason, r.excluded, r.excludedReason, r.contactability, r.recoverable,
        ]
          .map(csvCell)
          .join(','),
      );
    }
    const outPath =
      OUT_FLAG?.split('=')[1] ||
      path.join(REPO_ROOT, 'data', 'ops', `abandoned-carts-${todayCentralISO}.csv`);
    // PII-containment guard: the default lands under the repo's gitignored
    // data/. A custom --out= path outside it risks committing PII (or writing
    // it to a synced drive), so warn loudly — the operator can still choose to.
    if (!path.resolve(outPath).startsWith(path.join(REPO_ROOT, 'data') + path.sep)) {
      console.warn(
        `WARNING: ${outPath} is OUTSIDE the gitignored data/ tree — this file ` +
          `contains customer PII (names/emails/phones). Make sure it won't be committed or synced.`,
      );
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, lines.join('\n') + '\n');
    console.log(`CSV written: ${outPath}  (${rows.length} rows — contains PII, data/ is gitignored)`);
  }
}

main()
  .catch((err) => {
    // Log only the message — a full Prisma connection error can embed the
    // DATABASE_URL (with credentials) in its stack.
    console.error('ERROR:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

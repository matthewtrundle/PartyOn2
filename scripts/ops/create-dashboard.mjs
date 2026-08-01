#!/usr/bin/env node
/**
 * Create one or more Premier customer dashboards manually.
 *
 * Replicates the /api/webhooks/create-dashboard flow (POD-side): creates a
 * GroupOrderV2 with 2 tabs (Cruise + Lodging), ties it to the PREMIER affiliate,
 * and fires the GHL dashboard webhook so the customer gets contacted.
 *
 * Skips the Premier Supabase callback (that's only for real inbound bookings).
 *
 * Usage:
 *   # Single customer
 *   node scripts/ops/create-dashboard.mjs \
 *     --name "Jane Doe" \
 *     --email jane@example.com \
 *     --phone +15125551234 \
 *     --date 2026-04-26 \
 *     --type private \
 *     [--start-time 14:00] [--booking-id XOLA-123]
 *
 *   # Batch from JSON file: array of { customer_name, customer_email, customer_phone,
 *   #                                  cruise_date, cruise_type, cruise_start_time?, booking_id? }
 *   node scripts/ops/create-dashboard.mjs --file customers.json
 *
 * Flags:
 *   --dry-run       Search for duplicates but don't create anything
 *   --no-ghl        Skip the GHL webhook call
 *   --force         Create even if a possible duplicate is found
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

// ── Constants (mirrored from src/lib/affiliates/presets.ts) ──
const PREMIER_MARINA_ADDRESS = {
  address1: '13993 Farm to Market Rd 2769',
  city: 'Leander',
  province: 'TX',
  zip: '78641',
  country: 'US',
};
const PREMIER_AFFILIATE_CODE = 'PREMIER';
const LODGING_TAB_NAME = 'Stock-the-House/BnB/Hotel';
const DEFAULT_DELIVERY_WINDOW = '12:00 PM - 2:00 PM';

// Mirrors src/lib/delivery/rates calculateDeliveryFee for zip 78641
// Leander 78641 is Extended Austin -> $65 base fee. We let DB default if zip unknown.
// Marina zip 78641 fee — safe default since it's where all boat deliveries go.
const MARINA_DELIVERY_FEE = 65;

// ── Helpers ──
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function generateShareCode() {
  // 6-char alphanumeric, uppercase (matches generateShareCode in src/lib/group-orders-v2/utils.ts)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[randomInt(0, chars.length)];
  return code;
}

async function uniqueShareCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateShareCode();
    const existing = await prisma.groupOrderV2.findUnique({ where: { shareCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique share code after 10 tries');
}

function normalizeCruiseType(input) {
  if (!input) return 'disco';
  const s = String(input).toLowerCase();
  return s.includes('private') ? 'private' : 'disco';
}

function buildCruiseTabName(cruiseType, customerName) {
  return cruiseType === 'private'
    ? `${customerName} Private Cruise Drink Delivery!`
    : 'ATX Disco Cruise Drink Delivery!';
}

function buildDashboardTitle(customerName) {
  return `${customerName} Drink Delivery!`;
}

function formatTime12h(totalMinutes) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const display = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return minutes === 0 ? `${display}:00 ${period}` : `${display}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDeliveryWindow(cruiseStartTime) {
  if (!cruiseStartTime) return DEFAULT_DELIVERY_WINDOW;
  const [h, m] = String(cruiseStartTime).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return DEFAULT_DELIVERY_WINDOW;
  const total = h * 60 + m;
  return `${formatTime12h(total - 120)} - ${formatTime12h(total - 60)}`;
}

function computeOrderDeadline(deliveryDate) {
  // 4 hours before delivery (matches src/lib/group-orders-v2/utils.ts)
  const d = new Date(deliveryDate);
  d.setUTCHours(d.getUTCHours() - 4);
  return d;
}

function defaultExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d;
}

// ── Duplicate detection ──
async function findPossibleDuplicates({ customer_name, customer_email, cruise_date, booking_id }) {
  const or = [];
  if (customer_email) {
    or.push({ hostEmail: { equals: customer_email, mode: 'insensitive' } });
  }
  if (customer_name) {
    or.push({ hostName: { equals: customer_name, mode: 'insensitive' } });
    or.push({ name: { contains: customer_name, mode: 'insensitive' } });
  }
  if (booking_id) {
    or.push({ externalBookingId: booking_id });
  }
  if (or.length === 0) return [];

  const candidates = await prisma.groupOrderV2.findMany({
    where: { OR: or, status: { not: 'CANCELLED' } },
    select: {
      id: true,
      shareCode: true,
      name: true,
      hostName: true,
      hostEmail: true,
      externalBookingId: true,
      status: true,
      createdAt: true,
      tabs: { select: { deliveryDate: true }, orderBy: { deliveryDate: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // If a cruise_date was given, prefer matches where tab date is same day
  if (cruise_date) {
    const target = cruise_date.slice(0, 10);
    const dateMatches = candidates.filter((c) =>
      c.tabs.some((t) => t.deliveryDate?.toISOString().slice(0, 10) === target)
    );
    if (dateMatches.length > 0) return dateMatches;
  }
  return candidates;
}

// ── GHL notify (mirrors src/lib/webhooks/ghl.ts notifyDashboardCreated) ──
async function notifyGhl(payload) {
  const url = process.env.GHL_DASHBOARD_WEBHOOK_URL;
  if (!url) {
    console.warn('  [GHL] skipped — GHL_DASHBOARD_WEBHOOK_URL not set');
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`  [GHL] FAILED ${res.status}: ${await res.text()}`);
      return false;
    }
    console.log('  [GHL] notified');
    return true;
  } catch (err) {
    console.error('  [GHL] ERROR:', err.message);
    return false;
  }
}

// ── Core creation ──
async function createDashboard({ customer, affiliate, skipGhl }) {
  const cruiseType = normalizeCruiseType(customer.cruise_type || customer.items_name);
  const cruiseTabName = buildCruiseTabName(cruiseType, customer.customer_name);
  const dashboardTitle = buildDashboardTitle(customer.customer_name);
  const deliveryTime = formatDeliveryWindow(customer.cruise_start_time);

  const deliveryDate = new Date(customer.cruise_date);
  deliveryDate.setUTCHours(12, 0, 0, 0);
  const orderDeadline = computeOrderDeadline(deliveryDate);

  const shareCode = await uniqueShareCode();
  const hostClaimToken = randomBytes(24).toString('hex');

  const marinaAddr = PREMIER_MARINA_ADDRESS;
  const lodgingAddr = { address1: '', city: '', province: 'TX', zip: '', country: 'US' };

  const group = await prisma.groupOrderV2.create({
    data: {
      name: dashboardTitle,
      hostName: customer.customer_name,
      hostEmail: customer.customer_email || null,
      hostPhone: customer.customer_phone || null,
      shareCode,
      hostClaimToken,
      partyType: 'BOAT',
      affiliateId: affiliate.id,
      source: 'WEBHOOK',
      externalBookingId: customer.booking_id || null,
      expiresAt: defaultExpiresAt(),
      tabs: {
        create: [
          {
            name: cruiseTabName,
            position: 0,
            deliveryDate,
            deliveryDateConfirmed: true,
            deliveryTime,
            deliveryAddress: marinaAddr,
            orderDeadline,
            deliveryFee: MARINA_DELIVERY_FEE,
            deliveryContextType: 'BOAT',
          },
          {
            name: LODGING_TAB_NAME,
            position: 1,
            deliveryDate,
            deliveryDateConfirmed: true,
            deliveryTime,
            deliveryAddress: lodgingAddr,
            orderDeadline,
            deliveryFee: 40,
            deliveryContextType: 'HOUSE',
          },
        ],
      },
    },
    select: { id: true, shareCode: true },
  });

  const dashboardUrl = `https://partyondelivery.com/dashboard/${group.shareCode}`;
  const hostClaimUrl = `${dashboardUrl}?claim=${hostClaimToken}`;

  // Log to affiliate webhook log for audit trail
  await prisma.affiliateWebhookLog.create({
    data: {
      affiliateId: affiliate.id,
      payload: {
        _source: 'manual-script',
        customer_name: customer.customer_name,
        customer_email: customer.customer_email || '',
        customer_phone: customer.customer_phone || '',
        cruise_date: customer.cruise_date,
        cruise_type: cruiseType,
        booking_id: customer.booking_id || '',
      },
      status: 'SUCCESS',
      externalBookingId: customer.booking_id || null,
      dashboardId: group.id,
      dashboardUrl,
      processingMs: 0,
    },
  }).catch(() => {});

  console.log(`  [DB] created ${group.shareCode} → ${dashboardUrl}`);

  if (!skipGhl) {
    const nameParts = customer.customer_name.trim().split(/\s+/);
    await notifyGhl({
      event: 'dashboard.created',
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: customer.customer_email || '',
      phone: customer.customer_phone || '',
      dashboard_url: dashboardUrl,
      host_claim_url: hostClaimUrl,
      cruise_date: customer.cruise_date,
      cruise_type: cruiseType,
      booking_id: customer.booking_id || '',
    });
  }

  return { shareCode: group.shareCode, dashboardUrl, hostClaimUrl };
}

// ── Input normalization ──
function normalizeCustomer(raw) {
  const c = {
    customer_name: raw.customer_name || raw.name,
    customer_email: raw.customer_email || raw.email || null,
    customer_phone: raw.customer_phone || raw.phone || null,
    cruise_date: raw.cruise_date || raw.date || raw.arrival,
    cruise_start_time: raw.cruise_start_time || raw.start_time || null,
    cruise_type: raw.cruise_type || raw.type || raw.items_name,
    booking_id: raw.booking_id || null,
  };
  if (c.cruise_date) c.cruise_date = String(c.cruise_date).slice(0, 10);
  if (!c.customer_name) throw new Error('customer_name is required');
  if (!c.cruise_date || !/^\d{4}-\d{2}-\d{2}$/.test(c.cruise_date)) {
    throw new Error(`cruise_date must be YYYY-MM-DD (got: ${c.cruise_date})`);
  }
  return c;
}

// ── Main ──
async function main() {
  const args = parseArgs(process.argv);
  const dryRun = !!args['dry-run'];
  const skipGhl = !!args['no-ghl'];
  const force = !!args.force;

  let customers = [];
  if (args.file) {
    const raw = readFileSync(args.file, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    customers = list.map(normalizeCustomer);
  } else if (args.name) {
    customers = [normalizeCustomer({
      customer_name: args.name,
      customer_email: args.email,
      customer_phone: args.phone,
      cruise_date: args.date,
      cruise_start_time: args['start-time'],
      cruise_type: args.type,
      booking_id: args['booking-id'],
    })];
  } else {
    console.error('Provide --file <json> OR --name/--email/--phone/--date/--type flags.');
    console.error('Run with no args for usage help.');
    process.exit(1);
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { code: PREMIER_AFFILIATE_CODE },
  });
  if (!affiliate) {
    console.error(`Affiliate "${PREMIER_AFFILIATE_CODE}" not found.`);
    process.exit(1);
  }

  console.log(`\nProcessing ${customers.length} customer(s) for ${affiliate.businessName}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}${skipGhl ? ' (no GHL)' : ''}${force ? ' (force)' : ''}\n`);

  const results = { created: [], duplicates: [], errors: [] };

  for (const c of customers) {
    const label = `${c.customer_name} (${c.cruise_date})`;
    console.log(`• ${label}`);

    try {
      const dupes = await findPossibleDuplicates(c);
      if (dupes.length > 0 && !force) {
        console.log(`  [SKIP] ${dupes.length} possible duplicate(s):`);
        for (const d of dupes) {
          const dt = d.tabs[0]?.deliveryDate?.toISOString().slice(0, 10) || 'no-tab';
          console.log(`    - ${d.shareCode} "${d.name}" host=${d.hostName || ''} <${d.hostEmail || ''}> date=${dt} status=${d.status}`);
        }
        results.duplicates.push({ customer: label, matches: dupes.map((d) => d.shareCode) });
        continue;
      }
      if (dupes.length > 0 && force) {
        console.log(`  [WARN] ${dupes.length} possible duplicate(s) but --force set, creating anyway`);
      }

      if (dryRun) {
        console.log(`  [DRY-RUN] would create dashboard`);
        continue;
      }

      const r = await createDashboard({ customer: c, affiliate, skipGhl });
      results.created.push({ customer: label, ...r });
    } catch (err) {
      console.error(`  [ERROR] ${err.message}`);
      results.errors.push({ customer: label, error: err.message });
    }
  }

  console.log('\n─── Summary ───');
  console.log(`Created:    ${results.created.length}`);
  console.log(`Duplicates: ${results.duplicates.length}`);
  console.log(`Errors:     ${results.errors.length}`);

  if (results.created.length > 0) {
    console.log('\nCreated dashboards:');
    for (const r of results.created) {
      console.log(`  ${r.customer} → ${r.dashboardUrl}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

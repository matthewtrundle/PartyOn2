#!/usr/bin/env node
/**
 * One-off: create Ashley's 38th-→-21st birthday boat-party dashboard.
 *
 * Single tab, BOAT context, fixed delivery details supplied by ops:
 *   Date:    Sunday, May 17, 2026
 *   Time:    3:30 PM – 7:30 PM
 *   Marina:  13993 FM 2769, Leander, TX 78641 (Anderson Mill Marina)
 *
 * Name is stored with `~~38th~~` markup so the dashboard renders the
 * strikethrough joke. `parseTitleMarkup` in src/lib/dashboard handles it.
 *
 * Usage:
 *   node scripts/ops/create-ashley-birthday.mjs --email ashley@example.com --phone +15125551234
 *
 * After running, paste the printed shareCode into customDashboardThemes
 * in src/lib/dashboard/custom-themes.ts (replace the ASHLEY key).
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';

const prisma = new PrismaClient();

const DASHBOARD_NAME = "Ashley's ~~38th~~ 21st Birthday Boat Party";
const HOST_NAME = 'Ashley';

const MARINA_ADDRESS = {
  address1: '13993 Farm to Market Rd 2769',
  city: 'Leander',
  province: 'TX',
  zip: '78641',
  country: 'US',
};

// Delivery: Sun May 17, 2026, 3:30 PM Central Time = 20:30 UTC (CDT, UTC-5)
const DELIVERY_DATE_UTC = new Date('2026-05-17T20:30:00Z');
const DELIVERY_TIME_LABEL = '3:30 PM - 7:30 PM';
const TAB_NAME = 'Boat Party';
const DELIVERY_FEE = 65;

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

function computeOrderDeadline(deliveryDate) {
  const d = new Date(deliveryDate);
  d.setUTCHours(d.getUTCHours() - 4);
  return d;
}

function defaultExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d;
}

async function main() {
  const args = parseArgs(process.argv);

  const shareCode = await uniqueShareCode();
  const hostClaimToken = randomBytes(24).toString('hex');

  const group = await prisma.groupOrderV2.create({
    data: {
      name: DASHBOARD_NAME,
      hostName: HOST_NAME,
      hostEmail: args.email || null,
      hostPhone: args.phone || null,
      shareCode,
      hostClaimToken,
      partyType: 'BOAT',
      source: 'DIRECT',
      isLastMinute: true,
      expiresAt: defaultExpiresAt(),
      tabs: {
        create: [
          {
            name: TAB_NAME,
            position: 0,
            deliveryDate: DELIVERY_DATE_UTC,
            deliveryTime: DELIVERY_TIME_LABEL,
            deliveryAddress: MARINA_ADDRESS,
            orderDeadline: computeOrderDeadline(DELIVERY_DATE_UTC),
            deliveryFee: DELIVERY_FEE,
            deliveryContextType: 'BOAT',
          },
        ],
      },
    },
    select: { id: true, shareCode: true },
  });

  const dashboardUrl = `https://partyondelivery.com/dashboard/${group.shareCode}`;
  const hostClaimUrl = `${dashboardUrl}?claim=${hostClaimToken}`;

  console.log('\nCreated Ashley\'s birthday boat dashboard:');
  console.log(`  shareCode:     ${group.shareCode}`);
  console.log(`  dashboardUrl:  ${dashboardUrl}`);
  console.log(`  hostClaimUrl:  ${hostClaimUrl}`);
  console.log('\nNext steps:');
  console.log(`  1. Replace the ASHLEY key in src/lib/dashboard/custom-themes.ts with "${group.shareCode}".`);
  console.log('  2. Save Ashley\'s photo to /public/images/dashboards/ashley-birthday.webp.');
  console.log(`  3. Open ${dashboardUrl} to verify.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

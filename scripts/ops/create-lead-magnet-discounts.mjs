/**
 * create-lead-magnet-discounts.mjs
 *
 * Creates the two free-delivery reward codes used by the new lead magnets on
 * the birthday blog post and /products (see src/lib/leadMagnet/config.ts):
 *
 *   BDAYPARTY  → birthday blog post magnet
 *   STOCKED    → /products magnet
 *
 * Both mirror the existing COLDASICE lead-magnet voucher: FREE_SHIPPING (waives
 * the delivery fee — margin-safe, never touches the product-margin floor),
 * applies to all products, single use per customer, no expiry, active.
 *
 * Total-usage backstop: because these codes are broadcast publicly (a modal on
 * two high-traffic pages + the welcome email) and usagePerCustomer is only
 * enforced when checkout supplies a customerId (guest checkout can skip it), we
 * cap total redemptions with maxUsageCount. Redemptions only increment
 * post-payment (Stripe webhook → recordDiscountUsage), so each one rides a real
 * paid order over the $100+ minimum — but the cap bounds worst-case exposure
 * and is trivially raised if the campaign converts well. No expiry (per the
 * "active until killed" decision); the cap is the bound.
 *
 * Idempotent + self-healing: a missing code is created; an existing code that
 * lacks the maxUsageCount backstop is patched up to it (never downgraded, never
 * touches usageCount/isActive).
 *
 * USAGE
 *   set -a && source .env.local && set +a
 *   node scripts/ops/create-lead-magnet-discounts.mjs            # dry run
 *   node scripts/ops/create-lead-magnet-discounts.mjs --apply    # after operator go
 */

import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!process.env.DATABASE_URL) fail('DATABASE_URL missing — source your env file first.');

const prisma = new PrismaClient();

/**
 * Total-redemption backstop for these publicly-broadcast codes. Generous
 * enough that a healthy campaign never trips it (each redemption is a real
 * paid order), but a hard ceiling against a runaway. Raise it if the magnet
 * converts well.
 */
const MAX_USAGE = 500;

/** Shared shape for a free-delivery lead-magnet voucher. */
function voucher(code, name, description) {
  return {
    code,
    name,
    description,
    type: 'FREE_SHIPPING',
    value: 0,
    appliesToAll: true,
    freeShipping: true,
    combinable: false,
    // Single use per customer (enforced only when checkout supplies a
    // customerId) + a total ceiling as the real backstop. No expiry (active
    // until an operator flips isActive or the cap is hit).
    usagePerCustomer: 1,
    maxUsageCount: MAX_USAGE,
    isActive: true,
  };
}

const VOUCHERS = [
  voucher(
    'BDAYPARTY',
    'Free Delivery — Birthday blog lead magnet',
    'Free-delivery reward for the /blog birthday-ideas lead magnet. FREE_SHIPPING, single use per customer.',
  ),
  voucher(
    'STOCKED',
    'Free Delivery — /products lead magnet',
    'Free-delivery reward for the /products lead magnet. FREE_SHIPPING, single use per customer.',
  ),
];

async function main() {
  console.log(`\n=== create-lead-magnet-discounts (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);

  for (const v of VOUCHERS) {
    const existing = await prisma.discount.findUnique({ where: { code: v.code } });
    if (existing) {
      // Self-heal: ensure the total-usage backstop is present and not weaker
      // than intended. Never downgrade a tighter existing cap, never touch
      // usageCount / isActive.
      const needsCap =
        existing.maxUsageCount == null || existing.maxUsageCount > MAX_USAGE;
      if (needsCap && APPLY) {
        await prisma.discount.update({
          where: { id: existing.id },
          data: { maxUsageCount: MAX_USAGE },
        });
        console.log(
          `  PATCHED ${v.code.padEnd(12)} maxUsageCount ${existing.maxUsageCount ?? 'null'} → ${MAX_USAGE}`,
        );
      } else {
        console.log(
          `  EXISTS  ${v.code.padEnd(12)} type=${existing.type} active=${existing.isActive} ` +
            `maxUsageCount=${existing.maxUsageCount} usagePerCustomer=${existing.usagePerCustomer} usageCount=${existing.usageCount}` +
            (needsCap ? '  (would patch cap — re-run with --apply)' : ''),
        );
      }
      continue;
    }

    if (!APPLY) {
      console.log(`  WOULD CREATE  ${v.code.padEnd(12)} ${v.name} (maxUsageCount=${MAX_USAGE})`);
      continue;
    }

    const created = await prisma.discount.create({ data: v });
    console.log(
      `  CREATED  ${created.code.padEnd(12)} id=${created.id} type=${created.type} ` +
        `freeShipping=${created.freeShipping} usagePerCustomer=${created.usagePerCustomer} maxUsageCount=${created.maxUsageCount}`,
    );
  }

  if (!APPLY) {
    console.log('\nDry run — re-run with --apply to create missing codes.\n');
  } else {
    console.log('\nDone.\n');
  }
}

main()
  .catch((err) => {
    console.error('ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Seed the hero-headline A/B tests (one per landing page) as DRAFT rows.
 * DRY-RUN BY DEFAULT — pass --apply to write. Operator-gated per house rules.
 *
 * - Creates every seed in src/lib/experiments/hero-test-seeds.ts as status
 *   DRAFT. Allan reviews the copy and presses Start per page in
 *   /admin/analytics — so startDate (which drives day counts and the
 *   projected decision date) reflects the real launch, not the deploy.
 * - Idempotent: a page that already has ANY hero experiment in
 *   DRAFT/RUNNING/PAUSED is skipped and reported. Never mutates existing
 *   rows, never touches a RUNNING test. Re-runs are safe.
 * - Low-traffic seeds (wedding-weekend, ~3 views/mo) are skipped unless
 *   --include-low-traffic: a test that mathematically can't conclude is
 *   dashboard noise by default.
 * - Every seed is validated against the SAME Zod schema the admin create
 *   route uses (shared experiment-schemas.ts), plus the weights=100 /
 *   exactly-one-control checks the route enforces.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/experiments/seed-hero-tests.ts                        # dry-run
 *   npx tsx scripts/experiments/seed-hero-tests.ts --apply                # write
 *   npx tsx scripts/experiments/seed-hero-tests.ts --apply --include-low-traffic
 */

import { prisma } from '../../src/lib/database/client';
import { CreateExperimentSchema } from '../../src/lib/experiments/experiment-schemas';
import { HERO_TEST_SEEDS, WIRED_ROUTES } from '../../src/lib/experiments/hero-test-seeds';

const APPLY = process.argv.includes('--apply');
const INCLUDE_LOW_TRAFFIC = process.argv.includes('--include-low-traffic');

async function main(): Promise<void> {
  console.log(
    `Hero-test seeder — ${APPLY ? 'APPLY (writing to DB)' : 'DRY RUN (pass --apply to write)'}`
  );

  // Validate every seed up front — abort entirely on any invalid seed.
  const wired = new Set<string>(WIRED_ROUTES);
  for (const seed of HERO_TEST_SEEDS) {
    const parsed = CreateExperimentSchema.parse(seed);
    const totalWeight = parsed.variants.reduce((s, v) => s + v.weight, 0);
    if (totalWeight !== 100) throw new Error(`${seed.page}: weights sum to ${totalWeight}, not 100`);
    const controls = parsed.variants.filter((v) => v.isControl).length;
    if (controls !== 1) throw new Error(`${seed.page}: ${controls} control variants, need exactly 1`);
    if (!wired.has(seed.page)) throw new Error(`${seed.page}: not a wired hero route`);
  }
  console.log(`Validated ${HERO_TEST_SEEDS.length} seeds.\n`);

  let created = 0;
  let skippedExisting = 0;
  let skippedLowTraffic = 0;

  for (const seed of HERO_TEST_SEEDS) {
    if (seed.lowTraffic && !INCLUDE_LOW_TRAFFIC) {
      console.log(`SKIP (low traffic)   ${seed.page} — "${seed.name}" (pass --include-low-traffic to seed)`);
      skippedLowTraffic++;
      continue;
    }

    const existing = await prisma.experiment.findFirst({
      where: {
        page: seed.page,
        elementId: seed.elementId,
        status: { in: ['DRAFT', 'RUNNING', 'PAUSED'] },
      },
      select: { id: true, name: true, status: true },
    });
    if (existing) {
      console.log(
        `SKIP (exists ${existing.status}) ${seed.page} — already has "${existing.name}" (${existing.id})`
      );
      skippedExisting++;
      continue;
    }

    if (!APPLY) {
      console.log(`WOULD CREATE (draft) ${seed.page} — "${seed.name}"`);
      for (const v of seed.variants) {
        const copy = v.content && Object.keys(v.content).length > 0
          ? JSON.stringify(v.content)
          : '(page default copy)';
        console.log(`    ${v.isControl ? '[control]' : '         '} ${v.name} ${v.weight}% ${copy}`);
      }
      created++;
      continue;
    }

    const experiment = await prisma.experiment.create({
      data: {
        name: seed.name,
        description: seed.description,
        page: seed.page,
        elementId: seed.elementId,
        goalMetric: seed.goalMetric,
        status: 'DRAFT',
        variants: {
          create: seed.variants.map((v) => ({
            name: v.name,
            isControl: v.isControl,
            weight: v.weight,
            content: v.content && Object.keys(v.content).length > 0 ? v.content : undefined,
          })),
        },
      },
      select: { id: true },
    });
    console.log(`CREATED (draft)      ${seed.page} — "${seed.name}" (${experiment.id})`);
    created++;
  }

  console.log(
    `\n${APPLY ? 'Created' : 'Would create'}: ${created} · skipped existing: ${skippedExisting} · skipped low-traffic: ${skippedLowTraffic}`
  );
  if (!APPLY) console.log('Dry run only — nothing was written.');
  else console.log('Next: open /admin/analytics, review each draft, press Start.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

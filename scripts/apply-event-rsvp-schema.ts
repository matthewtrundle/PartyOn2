/**
 * One-shot DDL applier for the EventRsvp table (one-off event invite RSVPs,
 * e.g. the /dads-gone-wild Father's Day boat party page).
 *
 * Run BEFORE deploying the new code so prod has the table the new Prisma
 * client references. Otherwise POST /api/events/rsvp will error on a missing
 * `event_rsvps` relation.
 *
 * Usage (from this worktree):
 *   source ../../../.env.local && npx tsx scripts/apply-event-rsvp-schema.ts
 *
 * Idempotent — safe to run multiple times. Additive only (CREATE ... IF NOT
 * EXISTS); never use `prisma db push` here — schema.prisma still carries
 * dropped cost columns that hold prod data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS: Array<[string, string]> = [
  [
    'event_rsvps table',
    `CREATE TABLE IF NOT EXISTS event_rsvps (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      name TEXT NOT NULL,
      adults INTEGER NOT NULL DEFAULT 1,
      kids INTEGER NOT NULL DEFAULT 0,
      dish TEXT,
      total_heads INTEGER NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ],
  [
    'event_rsvps_event_idx',
    'CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps(event)',
  ],
];

async function main(): Promise<void> {
  console.log('[apply-event-rsvp-schema] applying additive DDL…');
  for (const [label, sql] of STATEMENTS) {
    process.stdout.write(`  • ${label.padEnd(40)} `);
    await prisma.$executeRawUnsafe(sql);
    console.log('OK');
  }
  console.log('[apply-event-rsvp-schema] done. Safe to deploy now.');
}

main()
  .catch((err) => {
    console.error('[apply-event-rsvp-schema] FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

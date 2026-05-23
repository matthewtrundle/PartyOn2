/**
 * GET /api/cron/finance-qb-post-sales
 *
 * Phase 2B — daily 08:00 UTC. **Autonomous**: drafts AND posts yesterday's
 * sales journal to QuickBooks in one step. No operator approval click.
 *
 * Operator one-time setup:
 *   1. Map QB account IDs at /admin/finance/journals/settings
 *   2. Toggle `enabled` on
 * After that, every day's journal lands in QB hands-free. Operator can
 * still reverse a posted entry via /admin/finance/journals if needed.
 *
 * Idempotency: skips if a POSTED entry already exists for the target date.
 * Failures persist as FAILED rows; the cron will retry the next day.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeDailySalesJournal,
  draftAndPostAutonomous,
  getJournalConfig,
} from '@/lib/finance/qb-journal-service';
import { getStoredTokens } from '@/lib/finance/qb-client';

export const maxDuration = 60;

const ONE_DAY_MS = 86_400_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const errors: string[] = [];
  let posted: { id: string; entryDate: string; qbTransactionId: string | null; status: string } | null = null;
  let skipped: string | null = null;

  try {
    const tokens = await getStoredTokens();
    if (!tokens) {
      skipped = 'QuickBooks not connected';
      return NextResponse.json({
        success: false,
        data: { skipped, durationMs: Date.now() - startedAt },
      });
    }
    const config = await getJournalConfig();
    if (!config.enabled) {
      skipped = 'Journal config not enabled (set enabled=true on /admin/finance/journals/settings)';
      return NextResponse.json({
        success: false,
        data: { skipped, durationMs: Date.now() - startedAt },
      });
    }

    // Allow ?date=YYYY-MM-DD override; default = yesterday in UTC.
    const dateParam = request.nextUrl.searchParams.get('date');
    let target: string;
    if (dateParam) {
      const d = new Date(`${dateParam}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: 'date must be YYYY-MM-DD' },
          { status: 400 }
        );
      }
      target = dateParam;
    } else {
      const now = new Date();
      const todayUtcMidnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      target = new Date(todayUtcMidnight.getTime() - ONE_DAY_MS)
        .toISOString()
        .slice(0, 10);
    }

    const draft = await computeDailySalesJournal(target);
    if (!draft) {
      skipped = `No paid orders on ${target} — nothing to journal`;
    } else {
      const result = await draftAndPostAutonomous(draft, 'cron-autonomous');
      if (result.skipped === 'already_posted') {
        skipped = `Already posted for ${target}`;
      }
      posted = {
        id: result.saved.id,
        entryDate: result.saved.entryDate,
        qbTransactionId: result.saved.qbTransactionId,
        status: result.saved.status,
      };
      if (result.saved.status === 'FAILED' && result.saved.failureReason) {
        errors.push(`QB post failed: ${result.saved.failureReason}`);
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const report = {
    posted,
    skipped,
    errors,
    durationMs: Date.now() - startedAt,
  };
  console.log('[finance-qb-post-sales] report:', JSON.stringify(report));
  return NextResponse.json({
    success: errors.length === 0,
    data: report,
  });
}

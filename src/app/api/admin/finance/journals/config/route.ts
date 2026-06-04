/**
 * GET  /api/admin/finance/journals/config — current operator-set account mapping
 * PUT  /api/admin/finance/journals/config — update mapping
 *
 * Body for PUT: `Partial<JournalConfig>` (any of the eight accountId fields
 * + `enabled`). All fields optional; only provided keys are written.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  getJournalConfig,
  saveJournalConfig,
  type JournalConfig,
} from '@/lib/finance/qb-journal-service';
import { prisma } from '@/lib/database/client';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const config = await getJournalConfig();
    // Also surface the synced QB accounts so the UI can render a picker
    // without an extra round-trip.
    const accounts = await prisma.qbAccount.findMany({
      where: { active: true },
      orderBy: [{ accountType: 'asc' }, { name: 'asc' }],
      select: {
        qbAccountId: true,
        name: true,
        fullyQualifiedName: true,
        accountType: true,
        accountSubType: true,
      },
    });
    return NextResponse.json({ success: true, data: { config, accounts } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Journal Config GET] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const body = (await request.json().catch(() => ({}))) as Partial<JournalConfig>;
    const patch: Partial<JournalConfig> = {};
    const stringKeys: Array<keyof JournalConfig> = [
      'stripeClearingAccountId',
      'stripeFeesAccountId',
      'salesRevenueAccountId',
      'salesTaxPayableAccountId',
      'deliveryRevenueAccountId',
      'tipsPayableAccountId',
      'refundsAccountId',
      'discountsAccountId',
    ];
    for (const key of stringKeys) {
      if (key in body) {
        const v = body[key];
        if (v === null || typeof v === 'string') {
          (patch as Record<string, unknown>)[key] = v;
        }
      }
    }
    if ('enabled' in body && typeof body.enabled === 'boolean') {
      patch.enabled = body.enabled;
    }
    const config = await saveJournalConfig(patch);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Journal Config PUT] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

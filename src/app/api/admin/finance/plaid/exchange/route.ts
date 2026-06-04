/**
 * POST /api/admin/finance/plaid/exchange
 *
 * Body: `{ publicToken: string, metadata?: LinkSuccessMetadata }`
 *
 * Exchanges the Plaid public_token from the browser SDK for a long-lived
 * access_token, then persists the item + its accounts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  exchangePublicToken,
  type LinkSuccessMetadata,
} from '@/lib/finance/plaid-client';

interface ExchangeBody {
  publicToken?: string;
  metadata?: LinkSuccessMetadata;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const body = (await request.json()) as ExchangeBody;
    if (!body.publicToken || typeof body.publicToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'publicToken is required' },
        { status: 400 }
      );
    }

    const result = await exchangePublicToken(
      body.publicToken,
      body.metadata ?? null
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Exchange] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

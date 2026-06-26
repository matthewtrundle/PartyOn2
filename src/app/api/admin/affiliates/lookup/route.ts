/**
 * Affiliate Lookup API
 * GET ?code=SOMECODE → returns affiliate info for invoice attribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateByCode } from '@/lib/affiliates/affiliate-service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export async function GET(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code parameter is required' },
        { status: 400 }
      );
    }

    const affiliate = await getAffiliateByCode(code);
    if (!affiliate) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: affiliate.id,
        code: affiliate.code,
        businessName: affiliate.businessName,
        contactName: affiliate.contactName,
        customerPerk: affiliate.customerPerk,
        status: affiliate.status,
      },
    });
  } catch (error) {
    console.error('[Affiliate Lookup] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to look up affiliate' },
      { status: 500 }
    );
  }
}

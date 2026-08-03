/**
 * GET /api/v2/group-orders/my-orders - List the SIGNED-IN customer's group orders
 *
 * The customer is taken from the session cookie, never from the request. This
 * used to read `?customerId=` and trust it, so anyone holding a customer's id
 * could pull that customer's entire order history — including every tab's
 * delivery address/phone and every participant's name, email and phone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMyGroupOrders } from '@/lib/group-orders-v2/service';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sign in to view your orders' },
        { status: 401 }
      );
    }

    // The param is still accepted (existing callers send it) but is only ever
    // used to detect a mismatch — the session is the sole source of identity.
    const requested = request.nextUrl.searchParams.get('customerId');
    if (requested && requested !== session.customerId) {
      return NextResponse.json(
        { success: false, error: 'You can only view your own orders' },
        { status: 403 }
      );
    }

    const groups = await getMyGroupOrders(session.customerId);

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error('[Group V2] My orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/group-orders - Create a new group order
 */

import { NextRequest, NextResponse } from 'next/server';
import { CreateGroupOrderV2Schema } from '@/lib/group-orders-v2/validation';
import { createGroupOrder } from '@/lib/group-orders-v2/service';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Public, unauthenticated route. Each create now also mirrors the host to
    // the Lead Flow board, so an unthrottled caller could spam fabricated
    // leads (with arbitrary host emails) onto /admin/leads. A real user
    // creates one dashboard — 10/hour/IP is generous for humans, tight for a
    // script. Fails open on a KV hiccup (throttle, not access control).
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (!(await checkRateLimit('group-order-create', ip, 10, 3600))) {
      return NextResponse.json(
        { success: false, error: 'Too many requests — try again shortly' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = CreateGroupOrderV2Schema.safeParse(body);
    if (!parsed.success) {
      // Extract human-readable error messages from Zod issues
      const messages = parsed.error.issues.map((issue) => {
        // For nested paths like ['tabs', 0, 'deliveryDate'], just use the message
        return issue.message;
      });
      const uniqueMessages = [...new Set(messages)];
      return NextResponse.json(
        { success: false, error: uniqueMessages.join('. '), details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const group = await createGroupOrder(parsed.data);

    return NextResponse.json(
      { success: true, data: group },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Group V2] Create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create group order' },
      { status: 500 }
    );
  }
}

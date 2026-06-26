/**
 * POST /api/v2/group-orders/[code]/tabs/[tabId]/items - Add draft item
 */

import { NextRequest, NextResponse } from 'next/server';
import { AddDraftItemSchema } from '@/lib/group-orders-v2/validation';
import { addDraftItem, getGroupOrderByCode } from '@/lib/group-orders-v2/service';
import { ProductNotPurchasableError } from '@/lib/products/availability';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ code: string; tabId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, tabId } = await params;
    const body = await request.json();

    // Verify group exists
    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group order not found' },
        { status: 404 }
      );
    }

    // Verify tab belongs to this group
    const tab = group.tabs.find((t) => t.id === tabId);
    if (!tab) {
      return NextResponse.json(
        { success: false, error: 'Tab not found in this group' },
        { status: 404 }
      );
    }

    const parsed = AddDraftItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const item = await addDraftItem(tabId, parsed.data);

    // Auto-promote to host: first person to add an item becomes host
    // if no host exists yet (e.g. webhook-created dashboards)
    if (parsed.data.participantId) {
      const hasHost = group.participants.some((p) => p.isHost);
      if (!hasHost) {
        await prisma.groupParticipantV2.update({
          where: { id: parsed.data.participantId },
          data: { isHost: true },
        });
      }
    }

    return NextResponse.json(
      { success: true, data: item },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ProductNotPurchasableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to add item';
    const status = msg.includes('locked') || msg.includes('deadline') ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

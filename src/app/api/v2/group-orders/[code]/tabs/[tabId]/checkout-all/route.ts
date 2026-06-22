/**
 * POST /api/v2/group-orders/[code]/tabs/[tabId]/checkout-all
 * Create Stripe checkout session for ALL remaining draft items in this tab.
 * Used by "Pay for Everything" / "Pay for Remaining" flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import {
  getGroupOrderByCode,
  getParticipantById,
} from '@/lib/group-orders-v2/service';
import { createGroupV2CheckoutSession } from '@/lib/stripe/group-v2-payments';
import { ProductNotPurchasableError } from '@/lib/products/availability';

interface RouteParams {
  params: Promise<{ code: string; tabId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, tabId } = await params;
    const body = await request.json();
    const { participantId, discountCode, tipAmount, email } = body;

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: 'participantId is required' },
        { status: 400 }
      );
    }

    // Verify group + tab
    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }
    const tab = group.tabs.find((t) => t.id === tabId);
    if (!tab) {
      return NextResponse.json({ success: false, error: 'Tab not found' }, { status: 404 });
    }

    // Get participant
    const participant = await getParticipantById(participantId);
    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Get ALL remaining draft items for this tab (from all participants)
    const draftItems = await prisma.draftCartItem.findMany({
      where: { subOrderId: tabId },
    });
    if (draftItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items to checkout' },
        { status: 400 }
      );
    }

    // Save email to participant if provided and they don't have one
    const effectiveEmail = email || participant.guestEmail || undefined;
    if (email && !participant.guestEmail) {
      try {
        await prisma.groupParticipantV2.update({
          where: { id: participantId },
          data: { guestEmail: email },
        });
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
          return NextResponse.json(
            { success: false, error: 'This email is already in use by another participant in this group' },
            { status: 409 }
          );
        }
        console.error('[Group V2] Failed to save participant email:', err);
      }
    }

    // Include delivery fee in checkout if not already paid/waived
    let shouldIncludeDeliveryFee = !tab.deliveryFeeWaived
      && Number(tab.deliveryFee) > 0
      && !(await prisma.groupDeliveryInvoice.findFirst({
        where: { subOrderId: tabId, status: 'PAID' },
      }));

    // Affiliate perk: waive delivery fee when the group is attributed to an affiliate.
    // Uses the affiliate's matching FREE_SHIPPING Discount row to find the minimum.
    // Premier has custom rules (marina address override + $300 house minimum).
    // draftItems here is already the whole tab's remaining drafts.
    let affiliatePerkWaives = false;
    if (shouldIncludeDeliveryFee && group.affiliate) {
      const tabSubtotal = draftItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      );

      const affiliateCode = group.affiliate.code;
      if (affiliateCode === 'PREMIER') {
        const address1 = (tab.deliveryAddress?.address1 || '').toLowerCase();
        if (address1.includes('13993') || tabSubtotal >= 300) {
          affiliatePerkWaives = true;
        }
      } else {
        const discount = await prisma.discount.findUnique({
          where: { code: affiliateCode.toUpperCase(), isActive: true },
        });
        if (discount && (discount.type === 'FREE_SHIPPING' || discount.freeShipping)) {
          const minOrder = Number(discount.minOrderAmount || 0);
          if (tabSubtotal >= minOrder) {
            affiliatePerkWaives = true;
          }
        }
      }
    }

    if (affiliatePerkWaives) {
      shouldIncludeDeliveryFee = false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const result = await createGroupV2CheckoutSession({
      groupOrderId: group.id,
      subOrderId: tabId,
      participantId,
      participantEmail: effectiveEmail,
      participantName: participant.guestName || 'Guest',
      draftItems,
      discountCode,
      tipAmount: tipAmount ? Number(tipAmount) : undefined,
      checkoutType: 'all',
      includeDeliveryFee: shouldIncludeDeliveryFee,
      deliveryFeeAmount: shouldIncludeDeliveryFee ? Number(tab.deliveryFee) : undefined,
      waiveDeliveryFee: affiliatePerkWaives,
      affiliateCode: group.affiliate?.code,
      successUrl: `${appUrl}/dashboard/${code}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/dashboard/${code}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        paymentId: result.paymentId,
      },
    });
  } catch (error) {
    console.error('[Group V2] Checkout-all error:', error);
    if (error instanceof ProductNotPurchasableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to create checkout';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

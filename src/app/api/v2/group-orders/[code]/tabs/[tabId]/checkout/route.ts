/**
 * POST /api/v2/group-orders/[code]/tabs/[tabId]/checkout
 * Create Stripe checkout session for participant's items in this tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import {
  getGroupOrderByCode,
  getParticipantDraftItems,
  getParticipantById,
} from '@/lib/group-orders-v2/service';
import { createGroupV2CheckoutSession, DiscountNotApplicableError } from '@/lib/stripe/group-v2-payments';
import { ProductNotPurchasableError } from '@/lib/products/availability';
import { CheckoutTabSchema } from '@/lib/group-orders-v2/validation';
import { todayCT } from '@/lib/ops/cooler-grouping';

interface RouteParams {
  params: Promise<{ code: string; tabId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, tabId } = await params;
    const body = await request.json();

    // Untrusted input on a charge path — validate before anything reaches
    // Stripe, the discount engine, or the participant record.
    const parsed = CheckoutTabSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { participantId, discountCode, tipAmount, email, phone, smsConsent } = parsed.data;

    // Verify group + tab
    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }
    const tab = group.tabs.find((t) => t.id === tabId);
    if (!tab) {
      return NextResponse.json({ success: false, error: 'Tab not found' }, { status: 404 });
    }

    // Terminal states never take money, and they must run BEFORE the date
    // gates — telling someone to pick a new date for a cancelled order sends
    // them round a loop. Cancellation is recorded on the GROUP row
    // (cancelGroupOrder / cancelGroupOrderByAffiliate); nothing writes
    // SubOrder.status = 'CANCELLED' today, so group.status is the check that
    // actually fires. Cancelling refuses once any payment is PAID, so a
    // CANCELLED order is by definition one where no money has moved.
    // LOCKED is deliberately absent: the lock stops new ITEMS, not payment for
    // items already in the cart, and orderDeadline lands ~3am CT on the
    // delivery day, so every same-day tab auto-locks within hours.
    if (group.status === 'CANCELLED' || tab.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: 'This order was cancelled and can no longer be paid for.',
          code: 'ORDER_CANCELLED',
        },
        { status: 409 }
      );
    }
    if (tab.status === 'FULFILLED') {
      return NextResponse.json(
        {
          success: false,
          error: 'This delivery has already been fulfilled.',
          code: 'TAB_FULFILLED',
        },
        { status: 409 }
      );
    }

    // Never charge against an unchosen date. Self-serve dashboards are born
    // dateless (and legacy ones carry an unconfirmed placeholder) — the
    // customer must pick a delivery date before any money moves.
    if (!tab.deliveryDate || !tab.deliveryDateConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please add your delivery date before checking out.',
          code: 'DELIVERY_DATE_REQUIRED',
        },
        { status: 400 }
      );
    }

    // A date that has already come and gone must not take money either.
    // Compare CALENDAR DAYS in Austin time: deliveryDate is stored at noon UTC
    // (= 7am CT), so an instant comparison would reject every legitimate
    // same-day order placed after 7am CT.
    if (tab.deliveryDate.slice(0, 10) < todayCT()) {
      return NextResponse.json(
        {
          success: false,
          error: 'This delivery date has already passed. Please choose a new date before checking out.',
          code: 'DELIVERY_DATE_PAST',
        },
        { status: 400 }
      );
    }


    // Get participant
    const participant = await getParticipantById(participantId);
    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Authorization: the participant must belong to THIS group. getParticipantById
    // looks up by id alone, so without this check a shareCode holder could pass
    // another group's participantId and forge that person's phone / SMS-consent
    // record (and clobber their delivery contact). Scope it to the URL's group.
    if (participant.groupOrderId !== group.id) {
      return NextResponse.json(
        { success: false, error: 'Participant does not belong to this group' },
        { status: 403 }
      );
    }

    // Get their draft items for this tab
    const draftItems = await getParticipantDraftItems(tabId, participantId);
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
        // Unique constraint violation -- another participant has this email in the same group
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
          return NextResponse.json(
            { success: false, error: 'This email is already in use by another participant in this group' },
            { status: 409 }
          );
        }
        console.error('[Group V2] Failed to save participant email:', err);
      }
    }

    // Bound + type-guard the optional phone from the (untrusted) request body.
    // We deliberately do NOT persist it to the participant here: Stripe collects
    // the authoritative order phone (phone_number_collection), and writing
    // guestPhone from this participantId-only path would let one group member set
    // another member's contact number. cleanPhone is used only to pair the opt-in
    // with a number and to gate the smsConsent record below.
    const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 40) : '';

    // Bundle delivery fee into this checkout if it hasn't already been paid/waived.
    // Mirrors checkout-all/route.ts so participant checkout doesn't drop the fee.
    const existingPaidInvoice = await prisma.groupDeliveryInvoice.findFirst({
      where: { subOrderId: tabId, status: 'PAID' },
    });
    let shouldIncludeDeliveryFee =
      !tab.deliveryFeeWaived &&
      Number(tab.deliveryFee) > 0 &&
      !existingPaidInvoice;

    // Affiliate perk: waive delivery fee when the group is attributed to an affiliate.
    // Uses the affiliate's matching FREE_SHIPPING Discount row to find the minimum.
    // Premier has custom rules (marina address override + $300 house minimum).
    let affiliatePerkWaives = false;
    if (shouldIncludeDeliveryFee && group.affiliate) {
      const allTabDrafts = await prisma.draftCartItem.findMany({
        where: { subOrderId: tabId },
      });
      const tabSubtotal = allTabDrafts.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      );

      const code = group.affiliate.code;
      if (code === 'PREMIER') {
        const address1 = (tab.deliveryAddress?.address1 || '').toLowerCase();
        if (address1.includes('13993') || tabSubtotal >= 300) {
          affiliatePerkWaives = true;
        }
      } else {
        const discount = await prisma.discount.findUnique({
          where: { code: code.toUpperCase(), isActive: true },
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

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const result = await createGroupV2CheckoutSession({
      groupOrderId: group.id,
      subOrderId: tabId,
      participantId,
      participantEmail: effectiveEmail,
      participantPhone: cleanPhone || participant.guestPhone || undefined,
      smsConsent: typeof smsConsent === 'boolean' ? smsConsent : undefined,
      participantName: participant.guestName || 'Guest',
      draftItems,
      discountCode,
      tipAmount: tipAmount ? Number(tipAmount) : undefined,
      affiliateCode: group.affiliate?.code,
      includeDeliveryFee: shouldIncludeDeliveryFee,
      deliveryFeeAmount: shouldIncludeDeliveryFee ? Number(tab.deliveryFee) : undefined,
      waiveDeliveryFee: affiliatePerkWaives,
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
    console.error('[Group V2] Checkout error:', error);
    if (error instanceof ProductNotPurchasableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error instanceof DiscountNotApplicableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to create checkout';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/v1/affiliate/apply
 * Public endpoint for partner program applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPartnerApplication } from '@/lib/affiliates/affiliate-service';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { AffiliateCategory } from '@prisma/client';

const VALID_CATEGORIES: AffiliateCategory[] = ['BARTENDER', 'BOAT', 'VENUE', 'PLANNER', 'OTHER'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { contactName, businessName, email, phone, category, websiteOrSocial, serviceArea, notes, consent } = body;

    // Validation
    if (!contactName || !businessName || !email || !category || consent !== true) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contactName, businessName, email, category, consent' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const application = await createPartnerApplication({
      contactName,
      businessName,
      email,
      phone,
      category,
      websiteOrSocial,
      serviceArea,
      notes,
      consent,
    });

    // Queue the affiliate-apply follow-up (ack next tick, +120h check-in
    // while still PENDING). Flag-gated; deduped on the application id, which
    // the journey's shouldCancel reads back from the dedupe key.
    try {
      await enqueueJourney('affiliate-apply', {
        email,
        entityId: application.id,
        phone: phone || null,
        payload: {
          firstName: String(contactName).split(/\s+/)[0] || null,
          businessName: businessName || null,
        },
      });
    } catch (err) {
      console.warn('[Affiliate Apply API] follow-up enqueue failed:', err);
    }

    return NextResponse.json({
      success: true,
      data: { id: application.id },
    });
  } catch (error) {
    console.error('[Affiliate Apply API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

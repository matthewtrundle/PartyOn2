/**
 * POST /api/v1/affiliate/apply
 * Public endpoint for partner program applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPartnerApplication } from '@/lib/affiliates/affiliate-service';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { markLeadStatus, upsertLead } from '@/lib/leads/leadCapture';
import { enrollLeadIfEligible } from '@/lib/leads/pipeline';
import { prisma } from '@/lib/database/client';
import { AffiliateCategory } from '@prisma/client';

const VALID_CATEGORIES: AffiliateCategory[] = [
  'BARTENDER',
  'BOAT',
  'VENUE',
  'LODGING',
  'PLANNER',
  'OTHER',
];

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

    // Lead Flow board: an affiliate application is a B2B lead — and
    // /affiliate/* is a form-watcher skip path, so without this mirror the
    // applicant is completely invisible to /admin/leads (2026-07-13 audit
    // gap). Guarded promote, NO trustedSubmit (route is hand-validated, not
    // zod — must not gain reopen power). Never throws.
    try {
      const [aFirst, ...aRest] = String(contactName).split(/\s+/);
      const lead = await upsertLead(
        {
          email,
          phone: phone || null,
          firstName: aFirst || null,
          lastName: aRest.join(' ') || null,
        },
        { sourcePage: '/affiliate/apply', sourceWidget: 'PARTNER_INQUIRY' }
      );
      if (lead) {
        const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            sourcePage: '/affiliate/apply',
            sourceWidget: 'PARTNER_INQUIRY',
            metadata: {
              ...prevMeta,
              affiliateApplication: {
                applicationId: application.id,
                businessName: businessName || null,
                category,
                submittedAt: new Date().toISOString(),
              },
            },
          },
        });
        if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
          await markLeadStatus(lead.id, 'SUBMITTED');
        } else {
          await enrollLeadIfEligible(lead.id);
        }
      }
    } catch (leadErr) {
      console.warn('[Affiliate Apply API] lead mirror failed:', leadErr);
    }

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

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/group-orders/database-vercel'
import { sendPartnerInquiryNotification, sendPartnerOnePagerEmail } from '@/lib/email/email-service'
import type { PartnerInquiryData } from '@/lib/email/email-service'
import { addContactToAudience } from '@/lib/email/resend-audiences'
import { kv, isKVConfigured, prisma } from '@/lib/database/client'
import { isHoneypotTripped } from '@/lib/forms/honeypot'
import { enqueueJourney } from '@/lib/followups/enqueue'
import { markLeadStatus, upsertLead } from '@/lib/leads/leadCapture'
import { enrollLeadIfEligible } from '@/lib/leads/pipeline'
import { attributionSchema, compactAttribution } from '@/lib/leads/attribution-schema'

// Sources that trigger an automated outbound email with the partner one-pager
// PDF + Calendly CTA (in addition to the existing ops notification).
const ONEPAGER_SOURCES = new Set(['vacation-rental-onepager'])
// Skip the outbound if we already sent it to this email in the last 24h.
const ONEPAGER_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000

// In-memory rate limit fallback when KV is not configured
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 3 // max 3 submissions per minute per IP
const MIN_FORM_TIME_MS = 3000 // minimum 3 seconds to fill out a form

/**
 * Detect gibberish text — long strings with no spaces, high consonant density,
 * or random mixed-case patterns typical of bot-generated content.
 */
function isGibberish(text: string): boolean {
  if (!text || text.length < 6) return false

  // Long single word with no spaces is suspicious (real names/businesses have spaces or are short)
  const words = text.trim().split(/\s+/)
  if (words.length === 1 && text.length > 12) return true

  // Check consonant-to-vowel ratio (gibberish tends to be consonant-heavy)
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (letters.length >= 8) {
    const vowels = letters.replace(/[^aeiouAEIOU]/g, '').length
    const ratio = vowels / letters.length
    if (ratio < 0.15) return true // less than 15% vowels = likely gibberish
  }

  // Random mixed-case mid-word (e.g. "GtZpMzGZOBAwUCuMQtdiJ")
  if (letters.length >= 8) {
    let caseChanges = 0
    for (let i = 1; i < letters.length; i++) {
      const prevUpper = letters[i - 1] === letters[i - 1].toUpperCase()
      const currUpper = letters[i] === letters[i].toUpperCase()
      if (prevUpper !== currUpper) caseChanges++
    }
    if (caseChanges / letters.length > 0.4) return true // 40%+ case changes = suspicious
  }

  return false
}

async function checkRateLimit(ip: string): Promise<boolean> {
  if (isKVConfigured()) {
    try {
      const key = `ratelimit:partner-inquiry:${ip}`
      const current = (await kv.get(key)) as number | null
      if (current !== null && current >= RATE_LIMIT_MAX) {
        return false // rate limited
      }
      // Increment. If key is new, set with expiry; otherwise just increment.
      if (current === null) {
        await kv.set(key, 1, { ex: 60 }) // expires in 60 seconds
      } else {
        await kv.set(key, current + 1, { ex: 60 })
      }
      return true
    } catch (error) {
      console.error('[Rate Limit] KV error, falling back to in-memory:', error)
    }
  }

  // In-memory fallback
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) return false
    entry.count++
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  }
  return true
}

/**
 * Normalize form data from all partner form types into a consistent shape.
 * Different forms send different field names - this maps them all.
 */
/**
 * Trim, coerce to string, and hard-cap length. This is a public, unauthenticated
 * form; caps bound abuse (multi-MB payloads, giant strings) as defense-in-depth —
 * the ops email escapes these values, this keeps them sane at the source.
 */
function capStr(v: unknown, max = 200): string {
  // Collapse CR/LF too: these values also land in the email subject line, where a
  // newline could break the header / silently drop the ops notification (CWE-93).
  return String(v ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeInquiry(body: Record<string, unknown>): PartnerInquiryData {
  // Contact name: may come as contactName, or firstName+lastName
  const firstName = capStr(body.firstName);
  const lastName = capStr(body.lastName);
  const contactName =
    capStr(body.contactName) || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';

  // Business name: may be businessName, hotelName, or company
  const businessName = capStr(body.hotelName || body.businessName || body.company);

  // Event types / interests: may be array or comma-separated string
  let eventTypes = '';
  if (Array.isArray(body.eventTypes)) {
    eventTypes = body.eventTypes.join(', ');
  } else if (typeof body.eventTypes === 'string') {
    eventTypes = body.eventTypes;
  }
  eventTypes = eventTypes.slice(0, 500);

  let interests = '';
  if (Array.isArray(body.interests)) {
    interests = body.interests.join(', ');
  } else if (typeof body.interests === 'string') {
    interests = body.interests;
  }
  interests = interests.slice(0, 500);

  return {
    contactName,
    email: capStr(body.email),
    phone: capStr(body.phone, 40) || undefined,
    businessName: businessName || undefined,
    businessType: capStr(body.businessType || body.eventType) || undefined,
    partnerType: capStr(body.partnerType) || undefined,
    website: capStr(body.website, 500) || undefined,
    message: capStr(body.message, 2000) || undefined,
    notes: capStr(body.notes, 2000) || undefined,
    eventTypes: eventTypes || undefined,
    serviceArea: capStr(body.serviceArea) || undefined,
    guestCount: capStr(body.guestCount, 40) || undefined,
    timeframe: capStr(body.timeframe) || undefined,
    eventDate: capStr(body.eventDate, 40) || undefined,
    venue: capStr(body.venue) || undefined,
    numberOfRooms: capStr(body.numberOfRooms, 40) || undefined,
    monthlyVolume: capStr(body.monthlyVolume, 40) || undefined,
    currentProvider: capStr(body.currentProvider) || undefined,
    interests: interests || undefined,
    source: capStr(body.source) || undefined,
    submittedAt: String(body.submittedAt || new Date().toISOString()),
  };
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const origin = request.headers.get('origin') || 'Unknown'
  const referer = request.headers.get('referer') || 'Unknown'
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'

  try {
    const body = await request.json()

    console.log('[Partner Inquiry] Request received:', {
      timestamp: new Date().toISOString(),
      ip,
      origin,
      referer,
      hasData: !!body && Object.keys(body).length > 0
    })

    // Honeypot check — a hidden, deliberately non-autofill-named field bots
    // tend to fill (see src/lib/forms/honeypot.ts for why the name matters).
    // We log every trip with the ip + which trap fired, so a real person caught
    // here is visible in logs instead of vanishing. We return success WITHOUT
    // an `inquiryId` — the client only celebrates on an `inquiryId`, so a drop
    // never shows a false "thank you", and a bot can't tell it was caught.
    const honeypot = isHoneypotTripped(body)
    if (honeypot.tripped) {
      console.warn('[Partner Inquiry] honeypot tripped — dropped', { field: honeypot.field, ip, userAgent })
      return NextResponse.json({
        success: true,
        message: 'Thank you for your interest! Our partnership team will contact you within 24 hours.',
      })
    }

    // Time-based check — reject submissions that happen too fast (bots fill forms instantly)
    if (body._formLoadedAt) {
      const elapsed = Date.now() - Number(body._formLoadedAt)
      if (elapsed < MIN_FORM_TIME_MS) {
        console.warn('[Partner Inquiry] REJECTED: Too fast', { elapsed, ip, userAgent })
        return NextResponse.json({
          success: true,
          message: 'Thank you for your interest! Our partnership team will contact you within 24 hours.',
        })
      }
    }

    // Gibberish detection — check free-text fields for bot-generated content
    const fieldsToCheck = [
      { name: 'businessName', value: body.businessName || body.hotelName || body.company },
      { name: 'notes', value: body.notes },
      { name: 'message', value: body.message },
      { name: 'contactName', value: body.contactName },
    ]
    for (const field of fieldsToCheck) {
      if (field.value && isGibberish(String(field.value))) {
        console.warn('[Partner Inquiry] REJECTED: Gibberish detected', { field: field.name, value: field.value, ip, userAgent })
        return NextResponse.json({
          success: true,
          message: 'Thank you for your interest! Our partnership team will contact you within 24 hours.',
        })
      }
    }

    // Rate limiting
    const allowed = await checkRateLimit(ip)
    if (!allowed) {
      console.warn('[Partner Inquiry] REJECTED: Rate limited', { ip, userAgent })
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please try again in a minute.' },
        { status: 429 }
      )
    }

    // Normalize all form variants into consistent shape
    const inquiry = normalizeInquiry(body);

    // Validate required fields
    if (!inquiry.email) {
      console.warn('[Partner Inquiry] REJECTED: Missing email', { ip, userAgent })
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!inquiry.contactName || inquiry.contactName === 'Unknown') {
      console.warn('[Partner Inquiry] REJECTED: Missing contact name', { ip, userAgent })
      return NextResponse.json(
        { success: false, error: 'Contact name is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inquiry.email)) {
      console.warn('[Partner Inquiry] REJECTED: Invalid email format', { email: inquiry.email, ip })
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Save to database
    const dbResult = await db.savePartnerInquiry({
      businessName: inquiry.businessName || inquiry.contactName,
      businessType: inquiry.businessType || inquiry.partnerType || 'general',
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
      numberOfRooms: inquiry.numberOfRooms,
      monthlyVolume: inquiry.monthlyVolume,
      currentProvider: inquiry.currentProvider,
      interests: inquiry.interests ? inquiry.interests.split(', ') : [],
      message: inquiry.message || inquiry.notes,
    })

    // Lead Flow board: a B2B inquiry is a sales lead (2026-07-13 audit gap).
    // Runs only after every bot gate + a successful save. Guarded promote —
    // never downgrades an existing SUBMITTED/CONVERTED lead — and NO
    // trustedSubmit (this route is not zod-validated, so it must not gain
    // the power to reopen closed cards). Never throws.
    if (dbResult?.id) {
      try {
        const [pFirst, ...pRest] = inquiry.contactName.split(/\s+/)
        // This route is not zod-validated end-to-end — parse just the
        // optional attribution blob defensively (bad shape → dropped).
        const attrParsed = attributionSchema.safeParse(body.attribution)
        const attribution = attrParsed.success ? attrParsed.data : null
        const lead = await upsertLead(
          {
            email: inquiry.email,
            phone: inquiry.phone || null,
            firstName: pFirst || null,
            lastName: pRest.join(' ') || null,
          },
          {
            sourcePage: '/partners',
            sourceWidget: 'PARTNER_INQUIRY',
            // UTM columns blank-fill + click ids merge into metadata.attribution.
            utmSource: attribution?.utmSource,
            utmMedium: attribution?.utmMedium,
            utmCampaign: attribution?.utmCampaign,
            utmContent: attribution?.utmContent,
            utmTerm: attribution?.utmTerm,
            gclid: attribution?.gclid,
            gbraid: attribution?.gbraid,
            wbraid: attribution?.wbraid,
            fbclid: attribution?.fbclid,
            msclkid: attribution?.msclkid,
          }
        )
        if (lead) {
          const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {}
          const prevAttribution: Record<string, string> =
            prevMeta.attribution &&
            typeof prevMeta.attribution === 'object' &&
            !Array.isArray(prevMeta.attribution)
              ? (prevMeta.attribution as Record<string, string>)
              : {}
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              // Last-touch stamp — this B2B submission is the active context.
              sourcePage: '/partners',
              sourceWidget: 'PARTNER_INQUIRY',
              metadata: {
                ...prevMeta,
                ...(attribution
                  ? {
                      attribution: {
                        ...prevAttribution,
                        ...compactAttribution(attribution),
                      },
                    }
                  : {}),
                partnerInquiry: {
                  inquiryId: dbResult.id,
                  businessName: inquiry.businessName || null,
                  businessType: inquiry.businessType || inquiry.partnerType || null,
                  source: inquiry.source || null,
                  submittedAt: new Date().toISOString(),
                },
              },
            },
          })
          if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
            await markLeadStatus(lead.id, 'SUBMITTED')
          } else {
            await enrollLeadIfEligible(lead.id)
          }
        }
      } catch (leadErr) {
        console.warn('[Partner Inquiry] lead mirror failed:', leadErr)
      }
    }

    // Send email notification via Resend
    try {
      await sendPartnerInquiryNotification(inquiry);
      console.log('[Partner Inquiry] Email notification sent for:', inquiry.email);
    } catch (emailError) {
      console.error('[Partner Inquiry] Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    // Add to Resend audience for vacation-rental partner sources (best-effort)
    if (inquiry.source === 'vacation-rental-event' || inquiry.source === 'vacation-rental-partners-page') {
      const [firstNamePart, ...lastNameParts] = inquiry.contactName.split(' ');
      await addContactToAudience({
        audienceId: process.env.RESEND_VACATION_RENTAL_AUDIENCE_ID,
        email: inquiry.email,
        firstName: firstNamePart,
        lastName: lastNameParts.join(' ') || undefined,
      });
    }

    // Outbound: send the partner one-pager email (PDF + Calendly CTA) for
    // QR-landing / signup variants. 24h dedupe by email so re-scans don't
    // spam the partner.
    if (inquiry.source && ONEPAGER_SOURCES.has(inquiry.source) && dbResult?.id) {
      try {
        const signupQrId = String(body.signupQrId || body.signup_qr_id || '').trim() || undefined;

        const recentSend = await prisma.partnerInquiry.findFirst({
          where: {
            email: inquiry.email,
            emailSentAt: { gte: new Date(Date.now() - ONEPAGER_DEDUPE_WINDOW_MS) },
          },
          select: { id: true, emailSentAt: true },
        });

        if (recentSend) {
          console.log('[Partner One-Pager] Skipping send — already emailed within 24h', {
            email: inquiry.email,
            lastSent: recentSend.emailSentAt,
          });
          // Still persist signupQrId on the new row if provided
          if (signupQrId) {
            await prisma.partnerInquiry.update({
              where: { id: dbResult.id },
              data: { signupQrId },
            });
          }
        } else {
          const sendResult = await sendPartnerOnePagerEmail({
            to: inquiry.email,
            companyName: inquiry.businessName,
            source: inquiry.source,
            signupQrId,
          });

          if (sendResult) {
            await prisma.partnerInquiry.update({
              where: { id: dbResult.id },
              data: {
                emailSentAt: new Date(),
                ...(signupQrId ? { signupQrId } : {}),
              },
            });
            console.log('[Partner One-Pager] Sent and timestamped', {
              email: inquiry.email,
              inquiryId: dbResult.id,
              resendId: sendResult,
            });
          } else {
            console.error('[Partner One-Pager] sendPartnerOnePagerEmail returned null — not stamping emailSentAt', {
              email: inquiry.email,
              inquiryId: dbResult.id,
            });
          }
        }
      } catch (oneErr) {
        console.error('[Partner One-Pager] Outbound send pipeline error:', oneErr);
        // Don't fail the request — the row is in the DB and can be re-fired manually.
      }
    }

    // Queue the partner-inquiry follow-up journey (flag-gated, deduped on
    // the inquiry id). One-pager placements already send a first touch, so
    // they start at step 2 (the +96h calendar nudge); everything else gets
    // the personal ack on the next engine tick.
    if (dbResult?.id) {
      try {
        const isOnePagerPlacement = Boolean(inquiry.source && ONEPAGER_SOURCES.has(inquiry.source));
        await enqueueJourney('partner-inquiry', {
          email: inquiry.email,
          entityId: dbResult.id,
          partnerInquiryId: dbResult.id,
          phone: inquiry.phone || null,
          startAtStep: isOnePagerPlacement ? 2 : 1,
          payload: {
            firstName: inquiry.contactName.split(/\s+/)[0] || null,
            businessName: inquiry.businessName || null,
          },
        });
      } catch (err) {
        console.warn('[Partner Inquiry] follow-up enqueue failed:', err);
      }
    }

    // Also send to Zapier webhook as backup
    const zapierWebhookUrl = process.env.ZAPIER_PARTNER_INQUIRY_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL;
    if (zapierWebhookUrl) {
      try {
        const zapierPayload = {
          ...inquiry,
          formType: 'partner_inquiry',
          submittedFrom: { ip, userAgent, referer },
        };

        const zapierResponse = await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zapierPayload),
        });

        if (!zapierResponse.ok) {
          console.error('[Partner Inquiry] Zapier webhook failed:', zapierResponse.status);
        }
      } catch (zapierError) {
        console.error('[Partner Inquiry] Zapier error:', zapierError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest! Our partnership team will contact you within 24 hours.',
      inquiryId: dbResult?.id,
    })
  } catch (error) {
    console.error('Partner inquiry error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit inquiry. Please try again.' },
      { status: 500 }
    )
  }
}

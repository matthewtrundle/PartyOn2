/**
 * POST /api/webhooks/create-dashboard
 *
 * Affiliate webhook endpoint that creates a customer dashboard from booking data.
 * Auth: X-API-Key header matched against affiliate.webhookApiKey.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMultiTabDashboardOrder } from '@/lib/group-orders-v2/service';
import { PREMIER_MARINA_ADDRESS } from '@/lib/affiliates/presets';
import {
  affiliateWebhookSchema,
  normalizeCruiseType,
  buildCruiseTabName,
  buildDashboardTitle,
  formatDeliveryWindow,
  sendDashboardCallback,
  LODGING_TAB_NAME,
} from '@/lib/webhooks/affiliate-dashboard';
import type { DashboardCallbackPayload } from '@/lib/webhooks/affiliate-dashboard';
import { notifyDashboardCreated } from '@/lib/webhooks/ghl';
import { sanitizeName } from '@/lib/leads/leadCapture';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── Auth ──────────────────────────────────────
  // Accept X-API-Key (canonical) or apikey (Zapier default)
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('apikey');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key header (X-API-Key or apikey)' }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { webhookApiKey: apiKey },
  });

  if (!affiliate || affiliate.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
  }

  // ── Parse + validate body ────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = affiliateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const payload = parsed.data;

  // Neutralize the affiliate-supplied name at the source of this route so it is
  // safe everywhere it flows: the dashboard title/tab, the stored hostName, and
  // the GHL dashboard webhook. This webhook is authenticated per-affiliate, so a
  // compromised affiliate integration is the injection vector this guards.
  // (The raw payload is still logged verbatim to affiliateWebhookLog for audit.)
  const customerName = sanitizeName(payload.customer_name) || 'Guest';

  // ── Build dashboard input ────────────────────
  const cruiseType = normalizeCruiseType(payload.items_name);
  const cruiseTabName = buildCruiseTabName(cruiseType, customerName);
  const dashboardTitle = buildDashboardTitle(customerName);
  const deliveryTime = formatDeliveryWindow(payload.cruise_start_time);
  const marinaAddress = `${PREMIER_MARINA_ADDRESS.address1}, ${PREMIER_MARINA_ADDRESS.city}, ${PREMIER_MARINA_ADDRESS.province} ${PREMIER_MARINA_ADDRESS.zip}`;

  try {
    const result = await createMultiTabDashboardOrder({
      hostName: customerName,
      hostEmail: payload.customer_email || undefined,
      hostPhone: payload.customer_phone || undefined,
      dashboardTitle,
      deliveryDate: payload.cruise_date,
      deliveryTime,
      partyType: 'BOAT',
      affiliateId: affiliate.id,
      source: 'WEBHOOK',
      tabs: [
        {
          name: cruiseTabName,
          deliveryAddress: marinaAddress,
          deliveryContextType: 'BOAT',
        },
        {
          name: LODGING_TAB_NAME,
          deliveryContextType: 'HOUSE',
        },
      ],
    });

    const processingMs = Date.now() - startTime;
    const dashboardUrl = `https://partyondelivery.com/dashboard/${result.shareCode}`;

    // Store external booking ID on the dashboard for cross-referencing
    if (payload.booking_id) {
      await prisma.groupOrderV2.update({
        where: { id: result.id },
        data: { externalBookingId: payload.booking_id },
      });
    }

    // Log success
    const log = await prisma.affiliateWebhookLog.create({
      data: {
        affiliateId: affiliate.id,
        payload: payload as unknown as Record<string, string | number>,
        status: 'SUCCESS',
        externalBookingId: payload.booking_id,
        dashboardId: result.id,
        dashboardUrl,
        processingMs,
      },
    });

    // Fire outbound callback (must await -- Vercel freezes after response)
    if (affiliate.callbackUrl) {
      const callbackPayload: DashboardCallbackPayload = {
        pod_dashboard_url: dashboardUrl,
        customer_email: payload.customer_email,
        booking_id: payload.booking_id,
      };

      const callbackStatus = await sendDashboardCallback(
        affiliate.callbackUrl,
        affiliate.callbackApiKey,
        callbackPayload
      );
      await prisma.affiliateWebhookLog.update({
        where: { id: log.id },
        data: { callbackStatus },
      });
    }

    // Notify GHL with customer info + dashboard links
    const hostClaimUrl = `${dashboardUrl}?claim=${result.hostClaimToken}`;
    const nameParts = customerName.split(/\s+/);
    try {
      await notifyDashboardCreated({
        event: 'dashboard.created',
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: payload.customer_email || '',
        phone: payload.customer_phone || '',
        dashboard_url: dashboardUrl,
        host_claim_url: hostClaimUrl,
        cruise_date: payload.cruise_date,
        cruise_type: cruiseType,
        booking_id: payload.booking_id || '',
      });
    } catch (ghlErr) {
      console.error('[Affiliate Webhook] GHL dashboard notify failed:', ghlErr);
    }

    return NextResponse.json({
      status: 'success',
      dashboard_url: dashboardUrl,
      share_code: result.shareCode,
      cruise_type: cruiseType,
      delivery_time: deliveryTime,
    });
  } catch (err) {
    const processingMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Log failure
    await prisma.affiliateWebhookLog.create({
      data: {
        affiliateId: affiliate.id,
        payload: payload as unknown as Record<string, string | number>,
        status: 'FAILED',
        externalBookingId: payload.booking_id,
        errorMessage,
        processingMs,
      },
    });

    console.error('[Affiliate Webhook] Error creating dashboard:', err);
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
  }
}

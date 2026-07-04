/**
 * POST /api/v2/group-orders/[code]/send-link
 * Save host contact info (email/phone) and send the dashboard link via email and SMS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { sendEmail } from '@/lib/email/resend-client';
import { dashboardLinkEmail } from '@/lib/email/templates/dashboard-link';
import { postToCoreLinq } from '@/lib/webhooks/ghl';

const SendLinkSchema = z.object({
  hostEmail: z.string().email('Valid email is required').optional().or(z.literal('')),
  hostPhone: z.string().max(20).optional().or(z.literal('')),
});

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const parsed = SendLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { hostEmail, hostPhone } = parsed.data;

    // Fetch group order for name and to update contact info
    const groupOrder = await prisma.groupOrderV2.findUnique({
      where: { shareCode: code },
      select: { id: true, name: true, hostName: true },
    });
    if (!groupOrder) {
      return NextResponse.json(
        { success: false, error: 'Group order not found' },
        { status: 404 }
      );
    }

    // Update group order with contact info
    const updateData: Record<string, unknown> = {};
    if (hostEmail) updateData.hostEmail = hostEmail;
    if (hostPhone) updateData.hostPhone = hostPhone;

    if (Object.keys(updateData).length > 0) {
      await prisma.groupOrderV2.update({
        where: { shareCode: code },
        data: updateData,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
    const dashboardUrl = `${appUrl}/dashboard/${code}`;
    const hostLabel = groupOrder.hostName === 'Party Host' ? 'Host' : groupOrder.hostName;
    const orderName = (!groupOrder.name || groupOrder.name === "Party Host's Order")
      ? `${hostLabel}'s Party`
      : groupOrder.name;

    // Send email if provided
    if (hostEmail) {
      try {
        const { html, text, subject } = dashboardLinkEmail(dashboardUrl, orderName);
        await sendEmail({
          to: hostEmail,
          subject,
          html,
          text,
          type: 'WELCOME',
        });
      } catch (emailErr) {
        console.error('[SendLink] Email send failed:', emailErr);
      }
    }

    // Trigger GHL SMS if phone provided (+ CoreLinq fan-out during migration)
    if (hostPhone) {
      const smsMessage = `Here's your Party On Delivery dashboard link: ${dashboardUrl}`;
      try {
        const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
        if (ghlWebhookUrl) {
          await fetch(ghlWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: hostPhone,
              message: smsMessage,
              source: 'dashboard-share',
            }),
          });
        }
      } catch (smsErr) {
        console.error('[SendLink] SMS webhook failed:', smsErr);
      }
      await postToCoreLinq({
        event: 'dashboard.share',
        phone: hostPhone,
        message: smsMessage,
        source: 'dashboard-share',
        dashboard_url: dashboardUrl,
        share_code: code,
      });
    }

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (error) {
    console.error('[SendLink] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send link' },
      { status: 500 }
    );
  }
}

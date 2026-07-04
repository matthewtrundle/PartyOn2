/**
 * GET /api/v1/crm/lookup — read-only customer/order lookup for the CoreLinq CRM.
 *
 * Consumed by the CRM's Retell voice-agent tool route (`partyon_order_lookup`),
 * which proxies on behalf of the AI receptionist — Retell never calls this
 * directly. Part of the GHL → CoreLinq migration (ADR-0007).
 *
 * Query params (at least one required):
 *   ?orderNumber=1234  — exact order number
 *   ?email=x@y.com     — case-insensitive match on the order's customer email
 *   ?phone=5125551234  — matched on the last 10 digits of customer/delivery phone
 *
 * Auth: `Authorization: Bearer ${CRM_API_KEY}` (same pattern as CRON_SECRET).
 * Returns 503 when CRM_API_KEY is not configured, so the route is inert until
 * the env var is set.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRM_API_KEY = process.env.CRM_API_KEY;

// KV-backed (global across instances) with in-memory fallback. The route is
// Bearer-key authenticated; this is the backstop against a leaked key being
// used to enumerate customers, so it must be a real cross-instance cap.
const RATE_LIMIT_MAX = 60; // per IP per minute
const RATE_LIMIT_WINDOW_SECONDS = 60;

/** Constant-time comparison of the presented bearer token against CRM_API_KEY. */
function isAuthorized(authHeader: string | null): boolean {
  if (!CRM_API_KEY || !authHeader?.startsWith('Bearer ')) return false;
  const presented = createHash('sha256').update(authHeader.slice(7)).digest();
  const expected = createHash('sha256').update(CRM_API_KEY).digest();
  return timingSafeEqual(presented, expected);
}

const QuerySchema = z
  .object({
    orderNumber: z.coerce.number().int().positive().optional(),
    email: z.string().email().max(254).optional(),
    phone: z
      .string()
      .max(24)
      .transform((v) => v.replace(/\D/g, ''))
      .pipe(z.string().min(10, 'Phone must contain at least 10 digits'))
      .optional(),
  })
  .refine((q) => q.orderNumber || q.email || q.phone, {
    message: 'Provide orderNumber, email, or phone',
  });

function formatAddress(addr: unknown): string {
  if (!addr || typeof addr !== 'object') return '';
  const a = addr as Record<string, string>;
  const parts: string[] = [];
  if (a.address1) parts.push(a.address1);
  if (a.address2) parts.push(a.address2);
  if (a.city) parts.push(a.city);
  const stateZip = [a.province, a.zip].filter(Boolean).join(' ');
  if (stateZip) parts.push(stateZip);
  return parts.join(', ');
}

const orderInclude = {
  items: { select: { title: true, variantTitle: true, quantity: true } },
  groupOrderV2: { select: { shareCode: true } },
} satisfies Prisma.OrderInclude;

type OrderForLookup = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function serializeOrder(order: OrderForLookup) {
  const shareCode = order.groupOrderV2?.shareCode ?? null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    createdAt: order.createdAt.toISOString(),
    deliveryDate: order.deliveryDate.toISOString().split('T')[0],
    deliveryTime: order.deliveryTime,
    deliveryAddress: formatAddress(order.deliveryAddress),
    deliveryType: order.deliveryType,
    total: Number(order.total),
    items: order.items.map((i) => ({
      title: i.title,
      variantTitle: i.variantTitle,
      quantity: i.quantity,
    })),
    dashboardUrl: shareCode ? `https://partyondelivery.com/dashboard/${shareCode}` : null,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!CRM_API_KEY) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 });
  }
  if (!isAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const allowed = await checkRateLimit('crm-lookup', ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'rate limited' }, { status: 429 });
  }

  const parsed = QuerySchema.safeParse({
    orderNumber: req.nextUrl.searchParams.get('orderNumber') ?? undefined,
    email: req.nextUrl.searchParams.get('email') ?? undefined,
    phone: req.nextUrl.searchParams.get('phone') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { orderNumber, email, phone } = parsed.data;

  try {
    let orders: OrderForLookup[] = [];

    if (orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: orderInclude,
      });
      orders = order ? [order] : [];
    } else if (email) {
      orders = await prisma.order.findMany({
        where: { customerEmail: { equals: email, mode: 'insensitive' } },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    } else if (phone) {
      // Phone formats vary across eras ("(512) 555-1234", "+15125551234", …) —
      // compare the last 10 digits of the stored values in SQL, then hydrate
      // the matches through Prisma.
      const last10 = phone.slice(-10);
      const rows = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM orders
          WHERE RIGHT(REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g'), 10) = ${last10}
             OR RIGHT(REGEXP_REPLACE(COALESCE(delivery_phone, ''), '\\D', '', 'g'), 10) = ${last10}
          ORDER BY created_at DESC
          LIMIT 5
        `
      );
      if (rows.length > 0) {
        orders = await prisma.order.findMany({
          where: { id: { in: rows.map((r) => r.id) } },
          include: orderInclude,
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (orders.length === 0) {
      return NextResponse.json({ ok: true, found: false, customer: null, orders: [] });
    }

    // Customer info from the most recent order's snapshot — every order carries
    // one, so this works even for guests with no Customer row.
    const latest = orders[0];
    return NextResponse.json({
      ok: true,
      found: true,
      customer: {
        name: latest.customerName,
        email: latest.customerEmail,
        phone: latest.customerPhone,
      },
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error('[CRM Lookup] Error:', error);
    return NextResponse.json({ ok: false, error: 'lookup failed' }, { status: 500 });
  }
}

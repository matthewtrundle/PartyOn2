/**
 * GET /api/v1/full-moon/guests
 *
 * Public social-proof guest list for the Full Moon Party: the first name +
 * last initial of everyone who has PAID for a ticket, most-recent first.
 * Deliberately PII-minimized — no email, phone, last name, order value, or
 * quantity — so friends can recognize each other without exposing buyer data.
 * Returns an empty list if the product doesn't exist yet or on any error.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { isGuestNameAllowed } from '@/lib/full-moon/guest-moderation';
import { TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';

export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** "Allan Marquez" -> "Allan M." ; single word -> just the word. */
function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Guest';
  // Cap the first token so a mononym / pasted string can't expose a full name.
  const first = parts[0].slice(0, 20);
  if (parts.length === 1) return first;
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Throttle to blunt scraping/harvesting of the attendee names.
  const allowed = await checkRateLimit('full-moon-guests', clientIp(request), 30, 60);
  if (!allowed) {
    return NextResponse.json({ guests: [] }, { status: 429 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { handle: TICKET_PRODUCT_HANDLE },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ guests: [] }, { headers: { 'Cache-Control': 'public, max-age=20, s-maxage=20' } });
    }

    const rows = await prisma.orderItem.findMany({
      where: { productId: product.id, order: { financialStatus: 'PAID' } },
      select: { order: { select: { customerName: true, createdAt: true } } },
      orderBy: { order: { createdAt: 'desc' } },
      take: 300,
    });

    // Dedupe by the full buyer name (one buyer = one entry), newest first.
    const seen = new Set<string>();
    const guests: string[] = [];
    for (const row of rows) {
      const name = row.order?.customerName?.trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      // Drop profane / operator-hidden names before they hit the public list.
      if (!isGuestNameAllowed(name)) continue;
      guests.push(toDisplayName(name));
      if (guests.length >= 100) break;
    }

    return NextResponse.json({ guests }, { headers: { 'Cache-Control': 'public, max-age=20, s-maxage=20' } });
  } catch (error) {
    console.error('[FullMoon Guests] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ guests: [] });
  }
}

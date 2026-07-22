/**
 * Premiere Credit automation — redeem URL resolver.
 *
 * The credit email + SMS point the customer at where to spend their credit.
 * If we can find their existing group-order dashboard (matched by host email),
 * we link straight to it — group dashboards accept discount codes at checkout.
 * Otherwise we fall back to the store's order page, so the link the customer
 * receives is ALWAYS valid and non-empty (never a broken/blank URL).
 */

import { prisma } from '@/lib/database/client';

/** Fallback when the customer has no dashboard on file. */
export const STORE_FALLBACK_URL = 'https://partyondelivery.com/order';

/**
 * Resolve where a credit email/SMS should send the customer to redeem.
 * Prefers the customer's most-recent group-order dashboard (by host email);
 * falls back to the order page. Never throws — a lookup failure returns the
 * fallback so it can't break a send.
 */
export async function resolveRedeemUrl(email: string | null | undefined): Promise<string> {
  const normalized = email?.trim();
  if (!normalized) return STORE_FALLBACK_URL;

  try {
    const dashboard = await prisma.groupOrderV2.findFirst({
      where: { hostEmail: { equals: normalized, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: { shareCode: true },
    });
    if (dashboard?.shareCode) {
      return `https://partyondelivery.com/dashboard/${dashboard.shareCode}`;
    }
  } catch (err) {
    console.error(
      '[premiere-credits] redeem-url lookup failed:',
      err instanceof Error ? err.message : String(err),
    );
  }

  return STORE_FALLBACK_URL;
}

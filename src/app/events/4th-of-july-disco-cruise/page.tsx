/**
 * /events/4th-of-july-disco-cruise
 *
 * Per-person drink-order invite for the 4th of July Disco Cruise event.
 *
 * Differs from the regular landing-page flow:
 *   - NOT a GroupOrderV2 dashboard — each guest places an individual
 *     order and gets their own /invoice/<token>. No shared cart, no
 *     "add a delivery location" tab, no other guests visible.
 *   - Delivery address is PRE-LOADED (13993 FM 2769, Leander, TX 78641).
 *     Customer cannot change it.
 *   - Delivery time is a hard pick of three slots, each scheduled one
 *     hour before its event window:
 *       July 3 · 1–5 PM event → delivery at 12 PM
 *       July 3 · 6–10 PM event → delivery at 5 PM
 *       July 4 · 11 AM–3 PM event → delivery at 10 AM
 *
 * Uses the existing last-minute catalog (deep-stock items we know we
 * can fulfill) so guests can only pick from products ops has on hand.
 *
 * Backend: re-uses POST /api/v1/landing/quote with mode='pay-now' which
 * creates a DraftOrder + redirects to /invoice/<token>/checkout for
 * Stripe payment. Same post-checkout convergence as every other
 * invoice path (confirmation email, GHL SMS, inventory commit, ops
 * dashboard visibility).
 */
import type { Metadata } from 'next';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import DiscoCruiseInvite from '@/components/events/DiscoCruiseInvite';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '4th of July Disco Cruise Drink Delivery',
  description:
    "Pre-order drinks for the 4th of July Disco Cruise — delivered to 13993 FM 2769, Leander, TX. Pick your time, pick your drinks, we'll handle the rest.",
  alternates: { canonical: '/events/4th-of-july-disco-cruise' },
  // Private event invite — not for the public search index.
  robots: { index: false, follow: false },
};

export default async function Page() {
  const catalog = await getLastMinuteCatalog();
  return <DiscoCruiseInvite catalog={catalog} />;
}

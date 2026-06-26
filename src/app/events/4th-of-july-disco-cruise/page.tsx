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
 * Pulls the FULL catalog of active products + their first available
 * variant and groups them by productType, ordered like a boat party
 * (cocktails first → seltzers → beer → spirits → wine → mixers).
 * That matches what guests would see on a regular dashboard browsing
 * by category — same menu items, same data shape.
 *
 * Backend: re-uses POST /api/v1/landing/quote with mode='pay-now' which
 * creates a DraftOrder + redirects to /invoice/<token>/checkout for
 * Stripe payment. Same post-checkout convergence as every other
 * invoice path (confirmation email, GHL SMS, inventory commit, ops
 * dashboard visibility).
 */
import type { Metadata } from 'next';
import { prisma } from '@/lib/database/client';
import DiscoCruiseInvite, {
  type DiscoCruiseSection,
} from '@/components/events/DiscoCruiseInvite';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '4th of July Disco Cruise Drink Delivery',
  description:
    "Pre-order drinks for the 4th of July Disco Cruise — delivered to 13993 FM 2769, Leander, TX. Pick your time, pick your drinks, we'll handle the rest.",
  alternates: { canonical: '/events/4th-of-july-disco-cruise' },
  // Private event invite — not for the public search index.
  robots: { index: false, follow: false },
};

// Boat-party order — cocktails first per founder spec, then crushables,
// then beer, then spirits, then wine, then supporting items. Any
// productType not listed here gets appended in alphabetical order so
// nothing silently disappears when ops adds a new type.
const PREFERRED_TYPE_ORDER = [
  'Batched Cocktail',
  'Cocktail Kit',
  'Seltzer',
  'Light Beer',
  'Craft Beer',
  'Tequila',
  'Whiskey',
  'Vodka',
  'Rum',
  'Gin',
  'Sparkling Wine',
  'White Wine',
  'Red Wine',
  'Mixer',
  'Weekend Supply',
];

const TYPE_EMOJI: Record<string, string> = {
  'Batched Cocktail': '🍹',
  'Cocktail Kit': '🍸',
  Seltzer: '🌊',
  'Light Beer': '🍺',
  'Craft Beer': '🍻',
  Tequila: '🌵',
  Whiskey: '🥃',
  Vodka: '🧊',
  Rum: '🏝️',
  Gin: '🌿',
  'Sparkling Wine': '🥂',
  'White Wine': '🍾',
  'Red Wine': '🍷',
  Mixer: '🥤',
  'Weekend Supply': '🛍️',
};

async function getDiscoCruiseSections(): Promise<DiscoCruiseSection[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      variants: {
        where: { availableForSale: true },
        orderBy: { price: 'asc' },
        take: 1,
      },
      images: { take: 1, orderBy: { position: 'asc' } },
    },
    orderBy: { title: 'asc' },
  });

  // Build the section map.
  const grouped: Record<
    string,
    { id: string; variantId: string; title: string; price: number; imageUrl?: string; handle: string }[]
  > = {};

  for (const p of products) {
    const variant = p.variants[0];
    if (!variant) continue;
    const type = p.productType?.trim() || 'Other';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({
      id: p.id,
      variantId: variant.id,
      title: p.title,
      price: Number(variant.price),
      imageUrl: p.images[0]?.url,
      handle: p.handle,
    });
  }

  // Order sections per the preference list, then append everything else.
  const sections: DiscoCruiseSection[] = [];
  for (const type of PREFERRED_TYPE_ORDER) {
    if (grouped[type]?.length) {
      sections.push({
        type,
        emoji: TYPE_EMOJI[type] || '🥃',
        products: grouped[type],
      });
    }
  }
  const leftover = Object.keys(grouped)
    .filter((t) => !PREFERRED_TYPE_ORDER.includes(t))
    .sort();
  for (const type of leftover) {
    sections.push({
      type,
      emoji: TYPE_EMOJI[type] || '🥂',
      products: grouped[type],
    });
  }

  return sections;
}

export default async function Page() {
  const sections = await getDiscoCruiseSections();
  return <DiscoCruiseInvite sections={sections} />;
}

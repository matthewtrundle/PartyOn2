/**
 * Drink-order recommendation engine.
 *
 * Given a party type + headcount + (optionally) the delivery date, pick
 * the best matching package recipe from getOccasionPackages and return
 * its alcohol line-items resolved to live POD products (with images,
 * prices, names) so the chat / quote-results view can render the
 * recommendation directly.
 *
 * Selection rules:
 *   - If the party type maps to a landing-page occasion (bachelor,
 *     bachelorette, corporate, wedding), pick the package whose
 *     `defaultPeople` is closest to the customer's headcount
 *   - Otherwise (boat / house / hotel / just-deliver) fall back to the
 *     bachelor package list
 *   - When the delivery date is today or tomorrow, this recommendation
 *     should be CROSS-CHECKED against the last-minute catalog before
 *     being shown — caller is responsible for the cross-check (the
 *     recommendation engine itself doesn't filter)
 */
import { prisma } from '@/lib/database/client';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import type { Occasion } from '@/lib/landing/getOccasionPackages';
import type { PartyType } from '@/lib/eventQuiz/routing';

const PARTY_TO_OCCASION: Record<PartyType, Occasion> = {
  bachelor: 'bachelor',
  bachelorette: 'bachelorette',
  corporate: 'corporate',
  wedding: 'wedding',
  // Fall through to bachelor for the lesser-defined types.
  boat: 'bachelor',
  house: 'bachelor',
  hotel: 'bachelor',
  'just-deliver': 'bachelor',
};

export type RecommendedItem = {
  handle: string;
  name: string;
  detail?: string;
  image?: string;
  price: number;
  qty: number;
};

export type Recommendation = {
  occasion: Occasion;
  packageName: string;
  packageBlurb: string;
  packageServes: string;
  packageImage: string;
  items: RecommendedItem[];
  /** Sum of unit_price × qty over `items`. Excludes freebies. */
  estimatedTotal: number;
  /** Did we have to substitute or drop any items because they were
   *  missing from the live product table? */
  missingHandles: string[];
};

export async function recommendForChat(opts: {
  partyType: PartyType;
  headcount: number;
}): Promise<Recommendation | null> {
  const occasion = PARTY_TO_OCCASION[opts.partyType];
  const packages = await getOccasionPackages(occasion);
  if (packages.length === 0) return null;

  // Pick the package whose defaultPeople is closest to the headcount.
  const sorted = [...packages].sort((a, b) => {
    const ap = a.defaultPeople ?? 8;
    const bp = b.defaultPeople ?? 8;
    return Math.abs(ap - opts.headcount) - Math.abs(bp - opts.headcount);
  });
  const pick = sorted[0];

  // Pull live product rows for every alcohol handle in the package.
  // lineItems (the public shape) carry handles inside their objects.
  const lineItems = pick.lineItems ?? [];
  const handles = lineItems
    .filter((li) => !li.freebie)
    .map((li) => li.handle)
    .filter((h): h is string => typeof h === 'string' && h.length > 0);

  if (handles.length === 0) return null;

  const products = await prisma.product.findMany({
    where: { handle: { in: handles }, status: 'ACTIVE' },
    include: {
      images: { take: 1, orderBy: { position: 'asc' } },
    },
  });
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const items: RecommendedItem[] = [];
  const missingHandles: string[] = [];
  for (const li of lineItems) {
    if (li.freebie) continue;
    const handle = li.handle;
    if (!handle) continue;
    const product = byHandle.get(handle);
    if (!product) {
      missingHandles.push(handle);
      continue;
    }
    items.push({
      handle: product.handle,
      name: product.title,
      image: product.images[0]?.url,
      price: Number(product.basePrice),
      qty: li.qty ?? 1,
    });
  }

  const estimatedTotal = items.reduce(
    (sum, it) => sum + it.price * it.qty,
    0,
  );

  return {
    occasion,
    packageName: pick.name,
    packageBlurb: pick.blurb,
    packageServes: pick.serves,
    packageImage: pick.image,
    items,
    estimatedTotal,
    missingHandles,
  };
}

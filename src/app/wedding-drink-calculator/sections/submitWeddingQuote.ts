import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { fireLeadConversion } from '@/lib/leads/fireLeadConversion';

/**
 * Where on the page a wedding-bar quote was submitted. Sent as the
 * `placement` parameter on the generate_lead event so GA4 can split
 * conversion rate by placement:
 *   - results  — soft capture attached to the calculator output (peak intent)
 *   - inline   — full form directly below the calculator
 *   - bottom   — end-of-page hard CTA
 */
export type QuotePlacement = 'results' | 'inline' | 'bottom';

const PLACEMENT_LABEL: Record<QuotePlacement, string> = {
  results: 'calculator results capture',
  inline: 'calculator inline form',
  bottom: 'bottom-of-page form',
};

/**
 * Maps a calculator output item name to the underlying product handle in
 * Postgres. Items not in this map fall through — admin reviews the draft
 * order and adds them manually. We always send `bag-of-ice-7-lbs` as the
 * fallback so the API's `items.min(1)` validation always passes.
 */
const ITEM_NAME_TO_HANDLE: Record<string, string> = {
  'Miller Lite (24-pack)': 'miller-lite-24-pack-12oz-can',
  'Modelo Especial (24-pack)': 'modelo-especial-24pack-12oz-cans',
  'Austin Beerworks Variety (12-pack)': 'austin-beerworks-variety-pack-12-pack-12oz-can',
  'High Noon Variety (12-pack)':
    'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack',
  'White Claw Variety (24-pack)': 'white-claw-variety-24-pack-12oz-can',
  'Dark Horse Pinot Grigio (750ml)': 'dark-horse-pinot-grigio-750ml-bottle',
  '14 Hands Cabernet Sauvignon (750ml)': '14-hands-cabernet-sauvignon',
  'Espolon Tequila Blanco (750ml)': 'espolon-tequila-blanco-80-1l',
  "Tito's Handmade Vodka (1L)": 'titos-handmade-vodka-80-1lt',
  'Still Austin Bourbon (750ml)': 'jameson-irish-whiskey-1',
  'Champagne / Prosecco (750ml)': 'chandon-california-brut-750ml',
  'Ice Bags': 'bag-of-ice-7-lbs',
};

export type SubmitWeddingQuoteArgs = {
  /** Latest computed plan from the calculator; null if the visitor never
      touched the inputs (defaults applied server-side). */
  plan: WeddingPlan | null;
  /** Customer name. May be empty for the email-first results capture —
      callers should fall back to the email local-part before calling. */
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  placement: QuotePlacement;
};

/**
 * Posts a wedding-bar quote to /api/v1/landing/quote and, on success,
 * fires the conversion events (Meta Lead + GA4 generate_lead + optional
 * Google Ads direct-fire conversion). Shared by every quote entry point
 * on /wedding-drink-calculator so item mapping + tracking stay identical.
 *
 * Throws on a failed/!ok response so callers can render an error state.
 */
export async function submitWeddingQuote({
  plan,
  customerName,
  customerEmail,
  customerPhone,
  placement,
}: SubmitWeddingQuoteArgs): Promise<{ invoiceUrl: string | null }> {
  const items: { handle: string; qty: number }[] = [];
  const unmappedNames: string[] = [];
  if (plan) {
    for (const item of plan.items) {
      const handle = ITEM_NAME_TO_HANDLE[item.name];
      if (handle) items.push({ handle, qty: item.quantity });
      else unmappedNames.push(`${item.quantity}× ${item.name}`);
    }
  }
  if (items.length === 0) {
    items.push({ handle: 'bag-of-ice-7-lbs', qty: 4 });
  }

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 30);

  const placementLabel = PLACEMENT_LABEL[placement];
  const summary = plan
    ? [
        `Calculator state: ${plan.summary.guests} guests × ${plan.summary.hours} hours = ${plan.totalDrinks} drinks.`,
        `Categories: ${plan.summary.categories.join(', ')}.`,
        `Submitted from: ${placementLabel}.`,
        unmappedNames.length > 0
          ? `Unmapped items (operator to add): ${unmappedNames.join('; ')}.`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
    : `No calculator state captured. Submitted from ${placementLabel}.`;

  const res = await fetch('/api/v1/landing/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'quote',
      occasion: 'wedding',
      customerName,
      customerEmail,
      customerPhone: customerPhone ?? '',
      groupSize: plan?.summary.guests ?? 100,
      deliveryDate: deliveryDate.toISOString().slice(0, 10),
      items,
      deliveryNotes: summary,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Submit failed');
  }

  // Centralized lead-conversion firing (Meta + GA4 generate_lead + Ads).
  // occasion="wedding" + placement let GA4 split conversion by occasion
  // and by entry point within the page.
  fireLeadConversion({
    occasion: 'wedding',
    placement,
    value: plan?.totalDrinks ?? 0,
  });
  return { invoiceUrl: body.invoiceUrl ?? null };
}

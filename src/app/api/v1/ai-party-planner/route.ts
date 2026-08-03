/**
 * POST /api/v1/ai-party-planner
 *
 * Two-stage free-form planner.
 *
 * STAGE 1 — extract.
 *   Body: { prompt: string }
 *   Pipeline:
 *     - Claude reads the natural-language prompt and extracts
 *       { partyType, headcount, eventDays, drinkCategories[] }.
 *     - We compute 5 budget tiers ($20/$40/$60/$80/$100 per person ×
 *       headcount) so the customer can pick total spend without us
 *       making an assumption.
 *   Returns: { ok: true, stage: 'needs-budget', extracted, budgetOptions }
 *
 * STAGE 2 — build.
 *   Body: { prompt, extracted: {partyType, headcount, eventDays,
 *           drinkCategories}, budgetCents }
 *   Pipeline:
 *     - Pass the extracted params to recommendForChat (which forwards
 *       categories to the drink-planner engine — fixes the
 *       "I said tequila and got margaritas" bug).
 *     - Scale the engine's qty output to fit the chosen budget.
 *     - Create a fresh GroupOrderV2 + seed the host's tab with the
 *       budget-scaled items.
 *   Returns: { ok: true, stage: 'done', shareCode, dashboardUrl,
 *             summary, recommendation }
 *
 * NO email gate. NO lead row. NO welcome email. This backs the AI-test
 * bachelor page only.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { callOpenRouter, extractJSON, AI_MODELS } from '@/lib/ai/inventory-client';
import { recommendForChat, type Recommendation, type RecommendedItem } from '@/lib/chat/recommendation';
import { createDashboardOrder, addDraftItem } from '@/lib/group-orders-v2/service';
import { prisma } from '@/lib/database/client';
import type { PartyType as ChatPartyType } from '@/lib/eventQuiz/routing';
import type { PartyType as DashboardPartyType, DeliveryContextType } from '@/lib/group-orders-v2/types';
import type { DrinkCategory } from '@/lib/drinkPlannerTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-person budget tiers offered to the customer (in dollars).
const PER_PERSON_TIERS = [20, 40, 60, 80, 100];

const CHAT_PARTY_TYPES = [
  'just-deliver',
  'bachelor',
  'bachelorette',
  'corporate',
  'wedding',
  'boat',
  'house',
  'hotel',
] as const;

const DRINK_CATEGORIES = ['beer', 'wine', 'spirits', 'seltzers', 'cocktail-kits'] as const;

const extractedSchema = z.object({
  partyType: z.enum(CHAT_PARTY_TYPES),
  headcount: z.number().int().min(1).max(500),
  eventDays: z.number().int().min(1).max(14).default(1),
  drinkCategories: z.array(z.enum(DRINK_CATEGORIES)).min(1).max(5),
  reasoning: z.string().max(240).optional(),
});

const bodySchema = z.union([
  // Stage 1 — just the prompt.
  z.object({
    prompt: z.string().min(3).max(800),
    stage: z.literal('extract').optional(),
  }),
  // Stage 2 — extracted params + chosen budget.
  z.object({
    prompt: z.string().min(3).max(800),
    stage: z.literal('build'),
    extracted: extractedSchema,
    budgetCents: z.number().int().min(5_000).max(5_000_000),
  }),
]);

const PARTY_TO_DASHBOARD: Record<ChatPartyType, DashboardPartyType> = {
  bachelor: 'BACHELOR',
  bachelorette: 'BACHELORETTE',
  corporate: 'CORPORATE',
  wedding: 'WEDDING',
  boat: 'BOAT',
  house: 'HOUSE_PARTY',
  hotel: 'OTHER',
  'just-deliver': 'OTHER',
};

const PARTY_TO_DELIVERY: Record<ChatPartyType, DeliveryContextType> = {
  boat: 'BOAT',
  hotel: 'HOTEL',
  corporate: 'VENUE',
  wedding: 'VENUE',
  bachelor: 'HOUSE',
  bachelorette: 'HOUSE',
  house: 'HOUSE',
  'just-deliver': 'HOUSE',
};

const SYSTEM_PROMPT = `You are a party-planning assistant for Party On Delivery in Austin, TX. Given a free-form description of a party, extract structured fields.

partyType — pick the closest match:
  bachelor       — bachelor party (groom's side)
  bachelorette   — bachelorette party (bride's side)
  wedding        — wedding / wedding weekend / rehearsal dinner
  corporate      — company event, office party, team offsite
  boat           — boat day, lake day, dock party (e.g. Lake Travis)
  house          — house party, Airbnb gathering, friends hangout
  hotel          — hotel suite party, hotel block
  just-deliver   — generic "just drop off some drinks", no real event

drinkCategories — return ONLY the categories the user actually mentions or implies. Pick from this exact set:
  beer           — beer, IPA, lager, light beer, craft beer, brews
  wine           — wine, red wine, white wine, champagne, prosecco, bubbly
  spirits        — tequila, vodka, whiskey, bourbon, rum, gin, shots, liquor, hard alcohol, mezcal
  seltzers       — seltzers, White Claw, High Noon, Truly, spiked seltzers, hard seltzers, ranch water
  cocktail-kits  — pre-made cocktails, margaritas, mojitos, batched drinks, ready-to-drink cocktails

CRITICAL — drinkCategories rules:
- If the prompt says "mostly beer and tequila" → return ["beer","spirits"]. NOT spirits + seltzers, NOT plus cocktail-kits.
- If the prompt says "ranch waters and beer" → return ["beer","seltzers"]. (Ranch water = seltzer-style.)
- If the user is vague ("just drinks", "whatever's good") → return defaults by party type:
    bachelor/bachelorette/boat → ["beer","seltzers","spirits"]
    wedding/corporate          → ["beer","wine","spirits"]
    everything else            → ["beer","spirits"]
- NEVER include cocktail-kits unless the user explicitly mentions cocktails, margaritas, mojitos, or pre-made drinks.

Other rules:
- If no headcount → default 10.
- If no duration in days → default 1. "Weekend" = 2 days. "Multi-day" / "3-day" = 3. "Tonight" / "single night" = 1.

Respond ONLY with a JSON object matching the schema below. No prose, no markdown fences.

{
  "partyType": "<one of the values above>",
  "headcount": <integer 1-500>,
  "eventDays": <integer 1-14>,
  "drinkCategories": ["<one or more of: beer | wine | spirits | seltzers | cocktail-kits>"],
  "reasoning": "<one short sentence on your choices, max 30 words>"
}`;

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', detail: String(err) },
      { status: 400 },
    );
  }

  // ─── STAGE 1 — Extract + return budget options ───────────────────
  if (!('stage' in body) || body.stage !== 'build') {
    let extracted: z.infer<typeof extractedSchema>;
    try {
      const llmRes = await callOpenRouter(
        AI_MODELS.query,
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: body.prompt },
        ],
        { temperature: 0.2, maxTokens: 400 },
      );
      const text = llmRes.choices[0]?.message?.content ?? '';
      const parsed = extractJSON<unknown>(text);
      if (!parsed) {
        console.error('[ai-party-planner] LLM returned non-JSON', text);
        return NextResponse.json(
          { ok: false, error: "Couldn't read that — try rephrasing?" },
          { status: 422 },
        );
      }
      extracted = extractedSchema.parse(parsed);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('[ai-party-planner] LLM step failed', detail);
      return NextResponse.json(
        {
          ok: false,
          error: 'AI planner is offline. Try the package builder above instead.',
          detail,
        },
        { status: 502 },
      );
    }

    const budgetOptions = PER_PERSON_TIERS.map((perPerson) => ({
      cents: perPerson * 100 * extracted.headcount,
      perPersonDollars: perPerson,
      totalDollars: perPerson * extracted.headcount,
      label: `$${perPerson}/person`,
      sublabel: `$${perPerson * extracted.headcount} total`,
    }));

    return NextResponse.json({
      ok: true,
      stage: 'needs-budget',
      extracted,
      budgetOptions,
    });
  }

  // ─── STAGE 2 — Build the order ───────────────────────────────────
  const { extracted, budgetCents, prompt } = body;
  const budgetDollars = budgetCents / 100;

  // Run the engine with the customer's chosen categories.
  const baseRecommendation = await recommendForChat({
    partyType: extracted.partyType,
    headcount: extracted.headcount,
    duration: extracted.eventDays >= 2 ? 'multi-day' : '4h',
    categories: extracted.drinkCategories as DrinkCategory[],
  });

  if (!baseRecommendation || baseRecommendation.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Couldn't build a package — try a different mix." },
      { status: 422 },
    );
  }

  // Budget-scale: stretch or trim quantities so the cart total lands
  // near the customer's chosen tier.
  const recommendation = scaleToBudget(baseRecommendation, budgetDollars);

  if (recommendation.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Budget too low for this party size — bump it up?' },
      { status: 422 },
    );
  }

  // Create the dashboard.
  let shareCode: string;
  let dashboardId: string;
  let firstTabId: string;
  let hostParticipantId: string;
  try {
    const group = await createDashboardOrder({
      hostName: 'AI Test Party',
      partyType: PARTY_TO_DASHBOARD[extracted.partyType],
      deliveryContextType: PARTY_TO_DELIVERY[extracted.partyType],
      source: 'DIRECT',
      name: `${extracted.headcount}-person ${extracted.partyType} party`,
    });
    shareCode = group.shareCode;
    dashboardId = group.id;
    const host = group.participants.find((p) => p.isHost);
    if (!host) throw new Error('host participant missing');
    hostParticipantId = host.id;
    const firstTab = group.tabs[0];
    if (!firstTab) throw new Error('first tab missing');
    firstTabId = firstTab.id;
  } catch (err) {
    console.error('[ai-party-planner] dashboard create failed', err);
    return NextResponse.json(
      { ok: false, error: 'Order creation failed. Try again.' },
      { status: 500 },
    );
  }

  // Seed the cart.
  const handles = recommendation.items.map((it) => it.handle);
  const products = await prisma.product.findMany({
    where: { handle: { in: handles }, status: 'ACTIVE' },
    include: {
      variants: {
        where: { availableForSale: true },
        orderBy: { price: 'asc' },
        take: 1,
      },
      images: { take: 1, orderBy: { position: 'asc' } },
    },
  });
  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const seededHandles: string[] = [];
  for (const item of recommendation.items) {
    const product = byHandle.get(item.handle);
    const variant = product?.variants[0];
    if (!product || !variant) continue;
    try {
      await addDraftItem(firstTabId, {
        participantId: hostParticipantId,
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title === 'Default' ? undefined : variant.title,
        price: Number(variant.price),
        imageUrl: product.images[0]?.url,
        quantity: item.qty,
      });
      seededHandles.push(item.handle);
    } catch (err) {
      console.warn(`[ai-party-planner] addDraftItem failed for ${item.handle}`, err);
    }
  }

  const summary = composeSummary({
    partyType: extracted.partyType,
    headcount: extracted.headcount,
    eventDays: extracted.eventDays,
    drinkCategories: extracted.drinkCategories,
    itemCount: seededHandles.length,
    totalDrinks: recommendation.totalDrinks,
    estimatedTotal: recommendation.estimatedTotal,
    budgetDollars,
    prompt,
  });

  return NextResponse.json({
    ok: true,
    stage: 'done',
    shareCode,
    dashboardId,
    dashboardUrl: `/dashboard/${shareCode}`,
    summary,
    extracted,
    budgetCents,
    recommendation: {
      packageName: recommendation.packageName,
      totalDrinks: recommendation.totalDrinks,
      estimatedTotal: recommendation.estimatedTotal,
      items: recommendation.items,
    },
  });
}

/**
 * Scale a recommendation's quantities so the cart total lands near
 * `budgetDollars`. Single-pass proportional scale, then if still over
 * budget drop the costliest items one at a time until we're under.
 *
 * Guarantees: every kept item has qty >= 1; total <= budget (we round
 * down per-item, then trim if rounding overshot).
 */
function scaleToBudget(rec: Recommendation, budgetDollars: number): Recommendation {
  if (rec.estimatedTotal <= 0) return rec;
  const ratio = budgetDollars / rec.estimatedTotal;

  // Scale qty per item. Round to nearest int, floor at 1 so we keep
  // representation across the mix.
  const scaled: RecommendedItem[] = rec.items.map((it) => {
    const rawQty = it.qty * ratio;
    const newQty = Math.max(1, Math.round(rawQty));
    return { ...it, qty: newQty };
  });

  // Sort by line-item cost descending so we trim the biggest spenders
  // first if we overshot. Use a copy so iteration order is stable.
  const ordered = [...scaled].sort((a, b) => b.price * b.qty - a.price * a.qty);

  let total = ordered.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Trim until under budget. Decrement qty on the costliest line; drop
  // the item entirely if it hits 0.
  while (total > budgetDollars && ordered.length > 0) {
    const top = ordered[0];
    top.qty -= 1;
    if (top.qty <= 0) {
      ordered.shift();
    } else {
      // Re-sort so the (possibly now-cheaper) item finds its spot.
      ordered.sort((a, b) => b.price * b.qty - a.price * a.qty);
    }
    total = ordered.reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  const newTotalDrinks = ordered.reduce(
    (sum, it) => sum + it.qty * estimateServingsPer(it),
    0,
  );

  return {
    ...rec,
    items: ordered,
    estimatedTotal: total,
    totalDrinks: Math.round(newTotalDrinks),
  };
}

/**
 * Rough servings-per-unit by category — used to update the displayed
 * total-drinks count after budget scaling.
 *
 * These are category-level averages of the per-product SERVINGS_PER_UNIT table
 * in src/lib/drinkPlannerLogic.ts. They must stay consistent with it: spirits
 * previously said 25 here (1.25oz pours) against the engine's 17 (1.5oz pours),
 * which inflated the drink count this endpoint reported by ~47% for any
 * spirits-heavy plan.
 */
function estimateServingsPer(item: RecommendedItem): number {
  switch (item.category) {
    case 'beer':
    case 'seltzers':
      return 24; // pack-of-24 cans/bottles
    case 'wine':
      return 5; // 5oz pours per 750ml
    case 'spirits':
      return 17; // 1.5oz pours per 750ml — matches SERVINGS_PER_UNIT
    case 'cocktail-kits':
      return 16; // batched cocktail serves ~16
    default:
      return 12;
  }
}

function composeSummary(opts: {
  partyType: ChatPartyType;
  headcount: number;
  eventDays: number;
  drinkCategories: string[];
  itemCount: number;
  totalDrinks: number;
  estimatedTotal: number;
  budgetDollars: number;
  prompt: string;
}): string {
  const dayPhrase = opts.eventDays >= 2 ? `over ${opts.eventDays} days` : 'for the night';
  const partyPhrase =
    opts.partyType === 'just-deliver'
      ? 'just-drop-off order'
      : `${opts.partyType.replace('-', ' ')} party`;
  const catPhrase = humanCategories(opts.drinkCategories);
  return (
    `Built you a ${partyPhrase} for ${opts.headcount} people ${dayPhrase}, ` +
    `heavy on ${catPhrase}: ${opts.itemCount} items, about ${opts.totalDrinks} drinks total ` +
    `(~$${opts.estimatedTotal.toFixed(0)}, under your $${opts.budgetDollars.toFixed(0)} budget). ` +
    `Open the dashboard to tweak, add, or share with your group.`
  );
}

function humanCategories(cats: string[]): string {
  const labels = cats.map((c) =>
    c === 'cocktail-kits' ? 'cocktail kits' : c,
  );
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

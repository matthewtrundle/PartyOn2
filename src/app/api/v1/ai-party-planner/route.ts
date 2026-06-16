/**
 * POST /api/v1/ai-party-planner
 *
 * Free-form prompt → pre-loaded dashboard, one round-trip.
 *
 * Pipeline:
 *   1. LLM (Claude via OpenRouter) extracts { partyType, headcount,
 *      eventDays, drinkCategories } from the user's natural-language
 *      prompt. JSON-mode response.
 *   2. recommendForChat({ partyType, headcount }) runs the existing
 *      drink-planner engine.
 *   3. createDashboardOrder() spins up a fresh GroupOrderV2.
 *   4. addDraftItem() seeds the host's tab with the recommended items.
 *   5. Returns { shareCode, dashboardUrl, summary, recommendation }.
 *
 * NO email capture. NO lead row. NO welcome email. This is a "test it
 * out" endpoint backing the AI-test bachelor page — the goal is the
 * fastest possible prompt-to-dashboard loop so Brian can validate the
 * UX. Capture + email come in a follow-up if the flow proves out.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { callOpenRouter, extractJSON } from '@/lib/ai/inventory-client';
import { recommendForChat } from '@/lib/chat/recommendation';
import { createDashboardOrder, addDraftItem } from '@/lib/group-orders-v2/service';
import { prisma } from '@/lib/database/client';
import type { PartyType as ChatPartyType } from '@/lib/eventQuiz/routing';
import type { PartyType as DashboardPartyType, DeliveryContextType } from '@/lib/group-orders-v2/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  prompt: z.string().min(3).max(800),
});

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

const llmOutSchema = z.object({
  partyType: z.enum(CHAT_PARTY_TYPES),
  headcount: z.number().int().min(1).max(500),
  eventDays: z.number().int().min(1).max(14).default(1),
  reasoning: z.string().max(200).optional(),
});

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

Valid partyType values (pick the closest match):
  bachelor       — bachelor party (groom's side)
  bachelorette   — bachelorette party (bride's side)
  wedding        — wedding / wedding weekend / rehearsal dinner
  corporate      — company event, office party, team offsite
  boat           — boat day, lake day, dock party (e.g. Lake Travis)
  house          — house party, Airbnb gathering, friends hangout
  hotel          — hotel suite party, hotel block
  just-deliver   — generic "just drop off some drinks" request, no real event

Rules:
- If the user doesn't say a number of people, default to 10.
- If they don't say duration in days, default to 1.
- "Weekend" = 2 days. "Multi-day" = 3. "Single night" / "tonight" = 1.
- Respond ONLY with a JSON object matching the schema below. No prose, no markdown fences.

JSON schema:
{
  "partyType": "<one of the values above>",
  "headcount": <integer 1-500>,
  "eventDays": <integer 1-14>,
  "reasoning": "<one short sentence explaining your choices, max 30 words>"
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

  // ─── 1. LLM extraction ───────────────────────────────────────────
  let extracted: z.infer<typeof llmOutSchema>;
  try {
    const llmRes = await callOpenRouter(
      'anthropic/claude-3.5-sonnet',
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: body.prompt },
      ],
      { temperature: 0.2, maxTokens: 300 },
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
    extracted = llmOutSchema.parse(parsed);
  } catch (err) {
    console.error('[ai-party-planner] LLM step failed', err);
    return NextResponse.json(
      { ok: false, error: 'AI planner is offline. Try the package builder above instead.' },
      { status: 502 },
    );
  }

  // ─── 2. Drink-planner recommendation ─────────────────────────────
  const recommendation = await recommendForChat({
    partyType: extracted.partyType,
    headcount: extracted.headcount,
    // Duration mapping: 1 day → 4h, 2-3 → multi-day, 4+ → multi-day.
    // The engine only takes the enum, not raw days.
    duration: extracted.eventDays >= 2 ? 'multi-day' : '4h',
  });

  if (!recommendation || recommendation.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Couldn't build a package — try adding more detail about drinks." },
      { status: 422 },
    );
  }

  // ─── 3. Create the dashboard ─────────────────────────────────────
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

  // ─── 4. Seed the cart with recommended items ─────────────────────
  // The recommendation already includes handles + qty + price. Look up
  // the live products to grab IDs + variant IDs.
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

  // ─── 5. Compose the human summary ────────────────────────────────
  const summary = composeSummary({
    partyType: extracted.partyType,
    headcount: extracted.headcount,
    eventDays: extracted.eventDays,
    itemCount: seededHandles.length,
    totalDrinks: recommendation.totalDrinks,
    estimatedTotal: recommendation.estimatedTotal,
    reasoning: extracted.reasoning,
  });

  return NextResponse.json({
    ok: true,
    shareCode,
    dashboardId,
    dashboardUrl: `/dashboard/${shareCode}`,
    summary,
    extracted: {
      partyType: extracted.partyType,
      headcount: extracted.headcount,
      eventDays: extracted.eventDays,
    },
    recommendation: {
      packageName: recommendation.packageName,
      totalDrinks: recommendation.totalDrinks,
      estimatedTotal: recommendation.estimatedTotal,
      items: recommendation.items,
    },
  });
}

function composeSummary(opts: {
  partyType: ChatPartyType;
  headcount: number;
  eventDays: number;
  itemCount: number;
  totalDrinks: number;
  estimatedTotal: number;
  reasoning?: string;
}): string {
  const dayPhrase =
    opts.eventDays >= 2 ? `over ${opts.eventDays} days` : 'for the night';
  const partyPhrase =
    opts.partyType === 'just-deliver'
      ? 'just-drop-off order'
      : `${opts.partyType.replace('-', ' ')} party`;
  return (
    `Built you a ${partyPhrase} for ${opts.headcount} people ${dayPhrase}: ` +
    `${opts.itemCount} items adding up to about ${opts.totalDrinks} drinks ` +
    `(~$${opts.estimatedTotal.toFixed(0)} subtotal). ` +
    `Open the dashboard to tweak, add, or share with your group.`
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseConfigured } from '@/lib/database/client';
import { z } from 'zod';

/**
 * Zod schema for drink calculator lead validation.
 *
 * Wedding scale (5-300 guests, 2-12 hours) was added 2026-05 for the
 * public /wedding-drink-calculator page. The existing bachelor/bachelorette
 * paths still validate against the tighter 5-50 / 2-6 range — we range-check
 * by partyType after the base parse.
 */
const drinkCalculatorLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email('Valid email is required'),
  guestCount: z.number().int().min(5).max(300),
  hours: z.number().int().min(2).max(12),
  drinkingLevel: z.enum(['light', 'average', 'heavy']),
  partyType: z.enum(['bachelor', 'bachelorette', 'wedding']),
  drinkPreference: z.enum([
    'mostly_beer',
    'mostly_seltzers',
    'good_mix',
    'seltzers_only',
    'seltzers_wine',
  ]),
  addChampagne: z.boolean().default(false),
  addCocktailKits: z.boolean().default(false),
  totalDrinks: z.number().int().min(0),
}).superRefine((data, ctx) => {
  // Bachelor / bachelorette retain the original tighter range.
  if (data.partyType === 'bachelor' || data.partyType === 'bachelorette') {
    if (data.guestCount > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guestCount'],
        message: 'Bachelor/bachelorette guestCount must be 5-50',
      });
    }
    if (data.hours > 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hours'],
        message: 'Bachelor/bachelorette hours must be 2-6',
      });
    }
  }
});

export type DrinkCalculatorLeadInput = z.infer<typeof drinkCalculatorLeadSchema>;

/**
 * POST /api/leads/drink-calculator
 * Saves a drink calculator lead to the database
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'Unknown';

  try {
    const body = await request.json();

    // Validate input
    const result = drinkCalculatorLeadSchema.safeParse(body);
    if (!result.success) {
      console.warn('[Drink Calculator Lead] Validation failed:', {
        errors: result.error.issues,
        ip,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // Save to database if configured
    if (isDatabaseConfigured()) {
      try {
        const lead = await prisma.drinkCalculatorLead.create({
          data: {
            firstName: data.firstName,
            email: data.email,
            guestCount: data.guestCount,
            hours: data.hours,
            drinkingLevel: data.drinkingLevel,
            partyType: data.partyType,
            drinkPreference: data.drinkPreference,
            addChampagne: data.addChampagne,
            addCocktailKits: data.addCocktailKits,
            totalDrinks: data.totalDrinks,
          },
        });

        console.log('[Drink Calculator Lead] Saved:', {
          id: lead.id,
          email: data.email,
          partyType: data.partyType,
        });

        return NextResponse.json({
          success: true,
          leadId: lead.id,
        });
      } catch (dbError) {
        console.error('[Drink Calculator Lead] Database error:', dbError);
        // Fall through to return success anyway - we don't want to block
        // the user experience if the database fails
      }
    } else {
      console.log('[Drink Calculator Lead] No database configured, lead:', {
        email: data.email,
        partyType: data.partyType,
        guestCount: data.guestCount,
      });
    }

    // Return success even if DB is not configured (development mode)
    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
    });
  } catch (error) {
    console.error('[Drink Calculator Lead] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save lead. Please try again.',
      },
      { status: 500 }
    );
  }
}

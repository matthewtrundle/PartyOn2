/**
 * Inventory Locations API
 *
 * GET /api/v1/inventory/locations - List all locations
 * POST /api/v1/inventory/locations - Create a new location
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLocations, createLocation } from '@/lib/inventory/services/inventory-service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

/**
 * GET /api/v1/inventory/locations
 * List all inventory locations
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const locations = await getLocations();

    return NextResponse.json({
      success: true,
      data: locations,
      meta: { count: locations.length },
    });
  } catch (error) {
    console.error('[Locations API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch locations',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/inventory/locations
 * Create a new inventory location
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      );
    }

    const location = await createLocation(body.name, body.address);

    return NextResponse.json(
      { success: true, data: location },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Locations API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create location',
      },
      { status: 500 }
    );
  }
}

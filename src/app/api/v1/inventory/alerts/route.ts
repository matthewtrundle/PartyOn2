/**
 * Low Stock Alerts API
 *
 * GET /api/v1/inventory/alerts - Get active low stock alerts
 * PUT /api/v1/inventory/alerts/:id - Acknowledge or resolve alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  getLowStockAlerts,
  acknowledgeAlert,
  resolveAlert,
} from '@/lib/inventory/services/inventory-service';

/**
 * GET /api/v1/inventory/alerts
 * Get all active low stock alerts
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const alerts = await getLowStockAlerts();

    return NextResponse.json({
      success: true,
      data: alerts,
      meta: {
        count: alerts.length,
        hasAlerts: alerts.length > 0,
      },
    });
  } catch (error) {
    console.error('[Alerts API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch alerts',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/inventory/alerts
 * Handle alert actions: acknowledge, resolve
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { alertId, action, acknowledgedBy } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: alertId, action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'acknowledge': {
        if (!acknowledgedBy) {
          return NextResponse.json(
            { success: false, error: 'acknowledgedBy is required for acknowledge action' },
            { status: 400 }
          );
        }
        const alert = await acknowledgeAlert(alertId, acknowledgedBy);
        return NextResponse.json({ success: true, data: alert });
      }

      case 'resolve': {
        const alert = await resolveAlert(alertId);
        return NextResponse.json({ success: true, data: alert });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: acknowledge or resolve' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Alerts API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Alert action failed',
      },
      { status: 500 }
    );
  }
}

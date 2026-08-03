/**
 * PATCH /api/v2/group-orders/[code]/tabs/[tabId] - Update tab
 *   - status changes (lock/unlock): host only
 *   - all other fields: any active participant
 * DELETE /api/v2/group-orders/[code]/tabs/[tabId] - Delete tab (host only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { UpdateTabSchema } from '@/lib/group-orders-v2/validation';
import {
  getGroupOrderByCode,
  updateTab,
  deleteTab,
  isParticipantHost,
  isActiveParticipant,
  TabHasMoneyError,
} from '@/lib/group-orders-v2/service';

interface RouteParams {
  params: Promise<{ code: string; tabId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, tabId } = await params;
    const body = await request.json();

    // Accept participantId (preferred) or hostParticipantId (backward compat)
    const participantId = body.participantId || body.hostParticipantId;
    if (!participantId) {
      return NextResponse.json(
        { success: false, error: 'participantId is required' },
        { status: 400 }
      );
    }

    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // The tab must belong to THIS group. Without this, participation in any
    // one group (a share code is all it takes to join) would authorize
    // editing any tab in any other group by id — including its delivery date.
    const existingTab = group.tabs.find((t) => t.id === tabId);
    if (!existingTab) {
      return NextResponse.json({ success: false, error: 'Tab not found' }, { status: 404 });
    }

    // Status changes (lock/unlock) are host-only
    if (body.status) {
      const isHost = await isParticipantHost(participantId, group.id);
      if (!isHost) {
        return NextResponse.json(
          { success: false, error: 'Only the host can lock/unlock tabs' },
          { status: 403 }
        );
      }
    } else {
      // All other updates: any active participant
      const isActive = await isActiveParticipant(participantId, group.id);
      if (!isActive) {
        return NextResponse.json(
          { success: false, error: 'You must be an active participant to update tabs' },
          { status: 403 }
        );
      }
    }

    const parsed = UpdateTabSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tab = await updateTab(tabId, parsed.data);
    return NextResponse.json({ success: true, data: tab });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update tab';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, tabId } = await params;
    const hostParticipantId = request.nextUrl.searchParams.get('hostParticipantId');
    if (!hostParticipantId) {
      return NextResponse.json(
        { success: false, error: 'hostParticipantId is required' },
        { status: 400 }
      );
    }

    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // Scope the tab to THIS group before the host check — otherwise being host
    // of your own group authorizes deleting any other group's tab by id, and
    // the delete cascades that tab's items and payment records.
    const existingTab = group.tabs.find((t) => t.id === tabId);
    if (!existingTab) {
      return NextResponse.json({ success: false, error: 'Tab not found' }, { status: 404 });
    }

    const isHost = await isParticipantHost(hostParticipantId, group.id);
    if (!isHost) {
      return NextResponse.json(
        { success: false, error: 'Only the host can delete tabs' },
        { status: 403 }
      );
    }

    // Host actions are destructive and are authorized only by a participant id
    // that the public GET exposes — log them so abuse is visible.
    console.warn(
      `[Group V2] tab delete: code=${code} tab=${tabId} by=${hostParticipantId}`
    );
    await deleteTab(tabId);
    return NextResponse.json({ success: true, message: 'Tab deleted' });
  } catch (error) {
    if (error instanceof TabHasMoneyError) {
      return NextResponse.json(
        {
          success: false,
          error: 'This delivery has payments on it and can no longer be deleted.',
          code: 'TAB_HAS_MONEY',
        },
        { status: 409 }
      );
    }
    console.error('[Group V2] Delete tab error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tab' },
      { status: 500 }
    );
  }
}

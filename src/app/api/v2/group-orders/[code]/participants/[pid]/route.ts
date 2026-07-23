/**
 * PATCH /api/v2/group-orders/[code]/participants/[pid] - Update participant (e.g. add email)
 * DELETE /api/v2/group-orders/[code]/participants/[pid] - Remove participant (host only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getGroupOrderByCode,
  removeParticipant,
  isParticipantHost,
} from '@/lib/group-orders-v2/service';
import { sanitizeName } from '@/lib/leads/leadCapture';

interface RouteParams {
  params: Promise<{ code: string; pid: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, pid } = await params;
    const body = await request.json();
    const { email, name } = body;

    if (!email && !name) {
      return NextResponse.json(
        { success: false, error: 'Email or name is required' },
        { status: 400 }
      );
    }

    if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (name && (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)) {
      return NextResponse.json(
        { success: false, error: 'Name must be 1-100 characters' },
        { status: 400 }
      );
    }

    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group order not found' },
        { status: 404 }
      );
    }

    // Verify the participant exists and belongs to this group
    const participant = group.participants.find((p) => p.id === pid);
    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    // AUTHORIZATION GAP (tracked follow-up): this route has NO real caller-identity
    // check. The group-order-v2 model has no server-established participant identity
    // — participant ids are public in the dashboard payload (ParticipantSummary.id)
    // and every id in a mutation is client-supplied, so any body-field "acting id"
    // check is trivially bypassable (set it equal to the target pid). DELETE and
    // transfer-host share the same weakness. The real fix is a per-participant
    // SECRET token issued at join and verified on every mutation (see the spawned
    // follow-up) — deliberately NOT a fake gate here. What we CAN do at this layer
    // is neutralize the name content below so a rename can't inject a spoofing
    // payload into the dashboard/emails.

    // Check if another participant already has this email in this group
    if (email) {
      const existingWithEmail = await prisma.groupParticipantV2.findUnique({
        where: {
          groupOrderId_guestEmail: {
            groupOrderId: group.id,
            guestEmail: email,
          },
        },
      });
      if (existingWithEmail && existingWithEmail.id !== pid) {
        return NextResponse.json(
          { success: false, error: 'This email is already associated with another participant' },
          { status: 409 }
        );
      }
    }

    // Neutralize control/format-char spoofing (bidi, zero-width, newline) in the
    // display name before it is stored + rendered on the dashboard — JSX escapes
    // HTML but not these chars, and this guestName is read back verbatim.
    let cleanName: string | undefined;
    if (name) {
      const s = sanitizeName(name);
      if (!s) {
        return NextResponse.json(
          { success: false, error: 'Name must contain at least one visible character' },
          { status: 400 }
        );
      }
      cleanName = s;
    }

    const updateData: Record<string, string> = {};
    if (email) updateData.guestEmail = email;
    if (cleanName) updateData.guestName = cleanName;

    await prisma.groupParticipantV2.update({
      where: { id: pid },
      data: updateData,
    });

    // If this participant is the host, also update hostName on the group order
    if (cleanName && participant.isHost) {
      await prisma.groupOrderV2.update({
        where: { id: group.id },
        data: { hostName: cleanName },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Group V2] Update participant error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update participant' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { code, pid } = await params;
    const hostParticipantId = request.nextUrl.searchParams.get('hostParticipantId');
    if (!hostParticipantId) {
      return NextResponse.json(
        { success: false, error: 'hostParticipantId is required' },
        { status: 400 }
      );
    }

    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group order not found' },
        { status: 404 }
      );
    }

    const isHost = await isParticipantHost(hostParticipantId, group.id);
    if (!isHost) {
      return NextResponse.json(
        { success: false, error: 'Only the host can remove participants' },
        { status: 403 }
      );
    }

    await removeParticipant(group.id, pid);

    return NextResponse.json({ success: true, message: 'Participant removed' });
  } catch (error) {
    console.error('[Group V2] Remove participant error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove participant' },
      { status: 500 }
    );
  }
}

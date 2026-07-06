/**
 * GET  /api/ops/followups/queue — next 50 scheduled jobs (masked emails).
 * POST /api/ops/followups/queue — cancel one scheduled job { jobId }.
 *
 * Ops-auth only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { maskEmail } from '@/lib/followups/attribution';

const cancelSchema = z.object({
  jobId: z.string().min(1).max(64),
});

export async function GET() {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const jobs = await prisma.followUpJob.findMany({
      where: { status: { in: ['scheduled', 'processing'] } },
      orderBy: { scheduledFor: 'asc' },
      take: 50,
      select: {
        id: true,
        journeyKey: true,
        step: true,
        email: true,
        status: true,
        scheduledFor: true,
        attempts: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      success: true,
      jobs: jobs.map((job) => ({ ...job, email: maskEmail(job.email) })),
    });
  } catch (error) {
    console.error('[ops/followups/queue GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = cancelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }
    // Only scheduled jobs are cancelable — a processing job is mid-send.
    const result = await prisma.followUpJob.updateMany({
      where: { id: parsed.data.jobId, status: 'scheduled' },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancelReason: 'admin-cancel',
      },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found or not cancelable' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ops/followups/queue POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel job' }, { status: 500 });
  }
}

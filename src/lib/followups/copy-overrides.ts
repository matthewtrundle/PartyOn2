/**
 * Follow-up email system — DB-backed copy overrides.
 *
 * Same storage the invoice-template editor uses (EmailTemplateContent, one
 * JSON row per templateType). The engine reads this once per tick, so a save
 * in /admin/emails/followups affects the very next send — no deploy.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import type { FollowUpCopyOverrides, JourneyKey, StepCopyOverride } from './types';

const TEMPLATE_TYPE = 'followups';

/** All saved overrides ({} when none). Never throws — copy must not block sends. */
export async function getFollowUpCopyOverrides(): Promise<FollowUpCopyOverrides> {
  try {
    const record = await prisma.emailTemplateContent.findUnique({
      where: { templateType: TEMPLATE_TYPE },
    });
    if (!record) return {};
    return (record.content as FollowUpCopyOverrides) ?? {};
  } catch (error) {
    console.error('[followups] failed to load copy overrides — using defaults:', error);
    return {};
  }
}

/**
 * Save one step's override. Empty subject AND body clears the override
 * (falls back to the code default).
 */
export async function saveFollowUpCopyOverride(
  journeyKey: JourneyKey,
  step: number,
  override: StepCopyOverride,
  updatedBy?: string
): Promise<FollowUpCopyOverrides> {
  const current = await getFollowUpCopyOverrides();
  const journey = { ...(current[journeyKey] ?? {}) };

  const subject = override.subject?.trim() || undefined;
  const body = override.body?.trim() || undefined;
  if (!subject && !body) {
    delete journey[step];
  } else {
    journey[step] = { ...(subject ? { subject } : {}), ...(body ? { body } : {}) };
  }

  const next: FollowUpCopyOverrides = { ...current, [journeyKey]: journey };
  if (Object.keys(journey).length === 0) {
    delete next[journeyKey];
  }

  await prisma.emailTemplateContent.upsert({
    where: { templateType: TEMPLATE_TYPE },
    create: {
      templateType: TEMPLATE_TYPE,
      content: next as unknown as Prisma.InputJsonValue,
      updatedBy,
    },
    update: {
      content: next as unknown as Prisma.InputJsonValue,
      updatedBy,
    },
  });
  return next;
}

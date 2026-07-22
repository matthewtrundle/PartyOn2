/**
 * Pre-flag-flip audit (read-only): list scheduled partner-outreach jobs whose
 * prospect is NOT currently APPROVED (or has no sendable draft / verified
 * email). Run before Brian flips followups_partner_outreach — anything listed
 * would be skipped at send time by shouldCancel, but a clean audit is the
 * point: enrollments should match approvals exactly.
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/audit-outreach-jobs.ts
 */

import { prisma } from '../src/lib/database/client';

async function main(): Promise<void> {
  const jobs = await prisma.followUpJob.findMany({
    where: { journeyKey: 'partner-outreach', status: 'scheduled' },
    select: { id: true, step: true, email: true, leadId: true, scheduledFor: true },
    orderBy: { scheduledFor: 'asc' },
  });
  console.log(`${jobs.length} scheduled partner-outreach job(s).`);
  if (jobs.length === 0) return;

  const leads = await prisma.lead.findMany({
    where: { id: { in: jobs.map((j) => j.leadId).filter((id): id is string => id !== null) } },
    select: { id: true, metadata: true },
  });
  const keyByLead = new Map(
    leads.map((l) => [
      l.id,
      typeof l.metadata === 'object' && l.metadata !== null
        ? String((l.metadata as Record<string, unknown>).websiteKey ?? '')
        : '',
    ])
  );
  const prospects = await prisma.partnerProspect.findMany({
    where: { websiteKey: { in: [...new Set([...keyByLead.values()].filter(Boolean))] } },
    select: {
      websiteKey: true,
      name: true,
      draftStatus: true,
      emailVerifyStatus: true,
      emailVerifyOverride: true,
    },
  });
  const prospectByKey = new Map(prospects.map((p) => [p.websiteKey, p]));

  let clean = 0;
  for (const job of jobs) {
    const key = job.leadId ? keyByLead.get(job.leadId) : undefined;
    const prospect = key ? prospectByKey.get(key) : undefined;
    const problems: string[] = [];
    if (!prospect) problems.push('no-prospect-row');
    else {
      if (prospect.draftStatus !== 'APPROVED') problems.push(`draft-${prospect.draftStatus}`);
      const verified =
        prospect.emailVerifyStatus === 'VALID' ||
        (prospect.emailVerifyStatus === 'CATCH_ALL' && prospect.emailVerifyOverride);
      if (!verified) problems.push(`verify-${prospect.emailVerifyStatus}`);
    }
    if (problems.length === 0) {
      clean++;
      continue;
    }
    console.log(
      `PROBLEM job ${job.id} step ${job.step} → ${job.email} (${prospect?.name ?? key ?? 'unknown'}): ${problems.join(', ')}`
    );
  }
  console.log(`${clean} clean, ${jobs.length - clean} with problems.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

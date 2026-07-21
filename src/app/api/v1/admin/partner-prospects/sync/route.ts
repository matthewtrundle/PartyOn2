/**
 * POST /api/v1/admin/partner-prospects/sync
 *
 * Sync both prospect databases (STR + bartending) into the Lead board /
 * CRM as tagged contacts:
 *   - one Lead per company (match by email, else by metadata.website),
 *     sourceWidget PARTNER_OUTREACH, tags ['partner-prospect', <vertical>]
 *   - companies whose affiliate is ACTIVE additionally get
 *     'partner-active' — re-running sync keeps that current, which is how
 *     a prospect flips to "active partner" after signing up
 *   - each upsert is mirrored to the external CRM (CoreLinq) with tags
 *
 * GET returns the current website → {leadId, tags} mapping so the
 * prospect tables can show synced/campaign state.
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { mirrorLeadToCrm } from '@/lib/leads/crm-mirror';
import {
  TAG_PARTNER_PROSPECT,
  TAG_PARTNER_ACTIVE,
  PARTNER_VERTICAL_TAGS,
} from '@/lib/leads/partner-tags';
import { getAllProspects, websiteKey } from '@/lib/partners/prospect-datasets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function splitName(contactName: string | null): { first: string | null; last: string | null } {
  if (!contactName) return { first: null, last: null };
  // Strip role parentheticals like "Millie (owner)"
  const clean = contactName.replace(/\(.*?\)/g, '').trim();
  const [first, ...rest] = clean.split(/\s+/);
  return { first: first || null, last: rest.join(' ') || null };
}

export async function POST(): Promise<NextResponse> {
  try {
    const prospects = getAllProspects();

    // ACTIVE affiliates by slug + email for partner-active tagging
    const activeAffiliates = await prisma.affiliate.findMany({
      where: { status: 'ACTIVE' },
      select: { partnerSlug: true, email: true },
    });
    const activeSlugs = new Set(activeAffiliates.map((a) => a.partnerSlug).filter(Boolean));
    const activeEmails = new Set(activeAffiliates.map((a) => a.email.toLowerCase()));

    let created = 0;
    let updated = 0;
    let taggedActive = 0;
    const results: { website: string; leadId: string; tags: string[] }[] = [];

    for (const p of prospects) {
      const email = p.email?.toLowerCase().trim() || null;
      const wKey = websiteKey(p.website);

      const isActive =
        (p.partnerSlug && activeSlugs.has(p.partnerSlug)) ||
        (email !== null && activeEmails.has(email));

      const tags = [
        TAG_PARTNER_PROSPECT,
        PARTNER_VERTICAL_TAGS[p.vertical],
        ...(isActive ? [TAG_PARTNER_ACTIVE] : []),
      ];
      if (isActive) taggedActive++;

      // Match an existing synced lead: by email first, else by websiteKey
      const existing =
        (email &&
          (await prisma.lead.findFirst({
            where: { email, tags: { has: TAG_PARTNER_PROSPECT } },
            orderBy: { createdAt: 'desc' },
          }))) ||
        (await prisma.lead.findFirst({
          where: {
            tags: { has: TAG_PARTNER_PROSPECT },
            metadata: { path: ['websiteKey'], equals: wKey },
          },
          orderBy: { createdAt: 'desc' },
        }));

      const { first, last } = splitName(p.contactName);
      const metadata = {
        company: p.name,
        website: p.website,
        websiteKey: wKey,
        vertical: p.vertical,
        partnerSlug: p.partnerSlug ?? null,
        partnerProspect: true,
      };

      let leadId: string;
      if (existing) {
        const merged = await prisma.lead.update({
          where: { id: existing.id },
          data: {
            tags,
            email: existing.email ?? email,
            phone: existing.phone ?? p.phone,
            firstName: existing.firstName ?? first,
            lastName: existing.lastName ?? last,
            metadata: {
              ...(typeof existing.metadata === 'object' && existing.metadata !== null
                ? (existing.metadata as Record<string, unknown>)
                : {}),
              ...metadata,
            },
          },
        });
        leadId = merged.id;
        updated++;
      } else {
        const lead = await prisma.lead.create({
          data: {
            email,
            phone: p.phone,
            firstName: first,
            lastName: last,
            status: 'SUBMITTED',
            sourceWidget: 'PARTNER_OUTREACH',
            sourcePage: `/admin/affiliates/prospects/${p.vertical === 'str' ? 'str' : 'bartending'}`,
            pipelineStage: 'NEW',
            stageChangedAt: new Date(),
            tags,
            metadata,
          },
        });
        leadId = lead.id;
        created++;
      }

      // CRM mirror (never throws; inert until CORELINQ_INGEST_URL set)
      await mirrorLeadToCrm({ leadId }, `partner-outreach:${p.vertical}`);

      results.push({ website: p.website, leadId, tags });
    }

    return NextResponse.json({
      success: true,
      data: { total: prospects.length, created, updated, taggedActive, results },
    });
  } catch (error) {
    console.error('[Partner Prospect Sync] Error:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}

/**
 * Current website → lead + campaign state for the prospect tables:
 * { leadId, tags, campaign: 'none'|'enrolled'|'sent'|'replied' }.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const leads = await prisma.lead.findMany({
      where: { tags: { has: TAG_PARTNER_PROSPECT } },
      select: {
        id: true,
        tags: true,
        metadata: true,
        inboundEmails: { select: { id: true }, take: 1 },
      },
    });
    const jobs = await prisma.followUpJob.findMany({
      where: { journeyKey: 'partner-outreach', leadId: { in: leads.map((l) => l.id) } },
      select: { leadId: true, status: true },
    });
    const jobsByLead = new Map<string, string[]>();
    for (const j of jobs) {
      if (!j.leadId) continue;
      jobsByLead.set(j.leadId, [...(jobsByLead.get(j.leadId) ?? []), j.status]);
    }

    const map: Record<string, { leadId: string; tags: string[]; campaign: string }> = {};
    for (const l of leads) {
      const wKey =
        typeof l.metadata === 'object' && l.metadata !== null
          ? (l.metadata as Record<string, unknown>).websiteKey
          : null;
      if (typeof wKey !== 'string') continue;
      const statuses = jobsByLead.get(l.id) ?? [];
      const campaign = l.inboundEmails.length
        ? 'replied'
        : statuses.includes('sent')
          ? 'sent'
          : statuses.length
            ? 'enrolled'
            : 'none';
      map[wKey] = { leadId: l.id, tags: l.tags, campaign };
    }
    return NextResponse.json({ success: true, data: { leads: map } });
  } catch (error) {
    console.error('[Partner Prospect Sync] GET error:', error);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

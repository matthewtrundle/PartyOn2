/**
 * Weekly Marketing Director briefing cron — runs Monday 13:00 UTC (8am Central).
 *
 * Stage A (deterministic, always runs): pulls latest AnalyticsSnapshot + open recommendations,
 *   renders docs/marketing/weekly/YYYY-Www.md with WoW deltas, threshold flags, top movers.
 * Stage B (LLM, runs if OPENROUTER_API_KEY set): single Anthropic call (via OpenRouter) that
 *   reads Stage A's brief + business context and writes a richer narrative analysis to
 *   docs/marketing/weekly/YYYY-Www-director.md. Mirrors the generate-blog cron pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/database/client';
import { listRecommendations } from '@/lib/analytics/recommendation-store';
import { deliverBriefing } from '@/lib/analytics/briefing-delivery';
import { buildBriefingPayloadFromSnapshot } from '@/lib/analytics/briefing-payload';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isoWeek(date: Date): { year: number; week: number; label: string } {
  // ISO 8601 week number — Monday-based, week 1 contains the year's first Thursday.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const label = `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  return { year: d.getUTCFullYear(), week, label };
}

interface SegmentRow {
  segment: string;
  orders: number;
  revenue: number;
  margin: number | null;
  averageOrderValue: number;
  averageMarginPct: number | null;
}

interface AffiliateRoiRow {
  code: string;
  businessName: string;
  orders: number;
  revenue: number;
  margin: number | null;
  commissionPaid: number;
  netMargin: number | null;
  roiPct: number | null;
}

function pickTopMovers(
  current: SegmentRow[],
  prior: SegmentRow[]
): Array<{ segment: string; deltaPct: number; revenue: number; priorRevenue: number }> {
  const movers: Array<{ segment: string; deltaPct: number; revenue: number; priorRevenue: number }> = [];
  for (const c of current) {
    const p = prior.find((x) => x.segment === c.segment);
    if (!p || p.revenue === 0) continue;
    const deltaPct = ((c.revenue - p.revenue) / p.revenue) * 100;
    movers.push({ segment: c.segment, deltaPct, revenue: c.revenue, priorRevenue: p.revenue });
  }
  return movers.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)).slice(0, 5);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const week = isoWeek(now);

  const snapshot = await prisma.analyticsSnapshot.findFirst({ orderBy: { date: 'desc' } });
  if (!snapshot) {
    return NextResponse.json({ error: 'no snapshot exists yet — run /api/cron/analytics-snapshot first' }, { status: 503 });
  }

  const segmentData = (snapshot.segmentData ?? {}) as {
    segments?: SegmentRow[];
    repeatRate?: Array<{ segment: string; orders: number; repeatRatePct: number }>;
  };
  const comparisonData = (snapshot.comparisonData ?? {}) as { segments?: SegmentRow[] };
  const marginData = (snapshot.marginData ?? {}) as { affiliateRoi?: AffiliateRoiRow[] };

  const segments = segmentData.segments ?? [];
  const segmentsPrior = comparisonData.segments ?? [];
  const repeatRate = segmentData.repeatRate ?? [];
  const affiliateRoi = marginData.affiliateRoi ?? [];

  const openRecs = await listRecommendations({ status: ['open', 'approved'], limit: 25 });
  const movers = pickTopMovers(segments, segmentsPrior);
  const negativeRoi = affiliateRoi.filter((a) => a.netMargin != null && a.netMargin < 0);

  // Stage A — deterministic markdown
  const lines: string[] = [];
  lines.push(`# Marketing weekly briefing — ${week.label}`);
  lines.push('');
  lines.push(`_Generated ${now.toISOString()} from snapshot dated ${snapshot.date.toISOString().split('T')[0]}._`);
  lines.push('');

  lines.push('## What changed this week');
  if (movers.length) {
    for (const m of movers) {
      const arrow = m.deltaPct >= 0 ? '▲' : '▼';
      lines.push(`- **${m.segment}**: ${arrow} ${Math.abs(m.deltaPct).toFixed(0)}% revenue WoW — $${m.revenue.toLocaleString()} (was $${m.priorRevenue.toLocaleString()})`);
    }
  } else {
    lines.push('_no comparable prior-period data yet — comes online next week_');
  }
  lines.push('');

  lines.push('## Open recommendations');
  if (openRecs.length) {
    lines.push('| Status | Risk | Effort | Impact $/mo | Segment | Title |');
    lines.push('|---|---|---|---:|---|---|');
    for (const r of openRecs) {
      const impact = r.impactDollarsMonthly != null ? `$${r.impactDollarsMonthly.toLocaleString()}` : '—';
      lines.push(`| ${r.status} | ${r.riskTier} | ${r.effortTier ?? '—'} | ${impact} | ${r.segment ?? '—'} | ${r.title} |`);
    }
  } else {
    lines.push('_no open recommendations_');
  }
  lines.push('');

  lines.push('## Flags');
  const flags: string[] = [];
  if (negativeRoi.length) {
    for (const a of negativeRoi) {
      flags.push(`- ⚠️ Affiliate **${a.businessName} (${a.code})** ROI is negative — paid $${a.commissionPaid.toLocaleString()}, margin only $${a.margin?.toLocaleString() ?? '—'}.`);
    }
  }
  for (const m of movers.filter((x) => x.deltaPct <= -20)) {
    flags.push(`- ⚠️ **${m.segment}** revenue down ${Math.abs(m.deltaPct).toFixed(0)}% WoW.`);
  }
  if (!flags.length) flags.push('_no threshold breaches_');
  for (const f of flags) lines.push(f);
  lines.push('');

  lines.push('## Repeat purchase rate by segment (30d)');
  if (repeatRate.length) {
    lines.push('| Segment | Orders | Repeat rate |');
    lines.push('|---|---:|---:|');
    for (const r of repeatRate) {
      lines.push(`| ${r.segment} | ${r.orders} | ${r.repeatRatePct}% |`);
    }
  } else {
    lines.push('_no data_');
  }
  lines.push('');

  lines.push('## Top affiliate net margin (30d)');
  if (affiliateRoi.length) {
    lines.push('| Affiliate | Orders | Net margin | ROI |');
    lines.push('|---|---:|---:|---:|');
    for (const a of affiliateRoi.slice(0, 5)) {
      const net = a.netMargin == null ? '—' : `$${a.netMargin.toLocaleString()}`;
      const roi = a.roiPct == null ? '—' : `${a.roiPct}%`;
      lines.push(`| ${a.businessName} (${a.code}) | ${a.orders} | ${net} | ${roi} |`);
    }
  }
  lines.push('');

  const stageA = lines.join('\n');
  const outDir = path.join(process.cwd(), 'docs', 'marketing', 'weekly');
  const stageAFsPath = path.join(outDir, `${week.label}.md`);
  let stageAFsWritten = false;
  let stageAFsError: string | null = null;
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(stageAFsPath, stageA);
    stageAFsWritten = true;
  } catch (err) {
    stageAFsError = err instanceof Error ? err.message : String(err);
    // Vercel functions have a read-only filesystem — that's expected. The markdown is
    // returned in the response body so callers can render or commit it locally.
  }

  // Stage B — LLM narrative analysis
  let stageBContent: string | null = null;
  let stageBFsPath: string | null = null;
  let stageBFsWritten = false;
  let stageBError: string | null = null;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const businessContext = `You are the Marketing Director for Party On Delivery, a premium alcohol delivery + party coordination service in Austin, TX.
Three customer segments: bach/bachelorette (party-focused), weddings (premium), corporate (professional/TABC-compliant).
Demand is the bottleneck, not capacity. Direct orders are higher margin than affiliate. Boat season is ~30 weekends.
Hard stop: never recommend changes that touch TABC compliance or legal messaging.`;

      const userPrompt = `Below is this week's deterministic marketing briefing for Party On Delivery. Read it and produce a SHORT (under 600 words) narrative analysis covering:
1. The single most important thing for the operator to act on this week, and why.
2. One non-obvious pattern across the data that the deterministic briefing missed.
3. Two-to-three specific, prioritized actions with reasoning. Each: title, why now, expected impact, effort tier (s/m/l), risk tier (autonomous | recommend | hard_stop).

Don't restate tables verbatim. Don't invent numbers. If a metric is missing, say so. If something is hard_stop (TABC, legal), call it out and refuse to recommend.

DETERMINISTIC BRIEFING:
${stageA}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://partyondelivery.com',
          'X-Title': 'Party On Delivery Marketing Director',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4.5',
          messages: [
            { role: 'system', content: businessContext },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
      }
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const narrative = json.choices?.[0]?.message?.content?.trim();
      if (!narrative) throw new Error('empty response from OpenRouter');

      stageBContent = `# Marketing Director — narrative briefing — ${week.label}\n\n_Generated ${now.toISOString()}. Layered on top of the deterministic briefing at \`${week.label}.md\`._\n\n${narrative}\n`;
      stageBFsPath = path.join(outDir, `${week.label}-director.md`);
      try {
        fs.writeFileSync(stageBFsPath, stageBContent);
        stageBFsWritten = true;
      } catch (err) {
        stageBError = `fs: ${err instanceof Error ? err.message : String(err)}`;
      }
    } catch (err) {
      stageBError = err instanceof Error ? err.message : String(err);
      console.error('[weekly-briefing] Stage B failed:', err);
    }
  }

  // Deliver: email + commit to repo. Fails soft (errors logged, response stays green).
  const deliverTo = process.env.MARKETING_BRIEFING_TO || 'allan@partyondelivery.com';

  // Build structured payload for the chart-driven email render. Failure here downgrades
  // gracefully — delivery still happens with the legacy <pre> render.
  let emailData: Awaited<ReturnType<typeof buildBriefingPayloadFromSnapshot>> | undefined;
  try {
    emailData = await buildBriefingPayloadFromSnapshot({
      snapshot,
      weekLabel: week.label,
      issueNumber: week.week,
      year: week.year,
      generatedAt: now,
      openRecs,
      archiveUrl: `https://github.com/${process.env.GITHUB_REPO_OWNER ?? 'allan-cmyk'}/${process.env.GITHUB_REPO_NAME ?? 'PartyOn2'}/blob/${process.env.GITHUB_REPO_BRANCH ?? 'main'}/docs/marketing/weekly/${week.label}-director.md`,
      queueUrl: 'https://partyondelivery.com/admin/recommendations?domain=marketing',
    });
  } catch (err) {
    console.warn('[weekly-briefing] structured payload build failed; falling back to plain HTML:', err);
  }

  const delivery = await deliverBriefing({
    weekLabel: week.label,
    stageA,
    stageB: stageBContent,
    to: deliverTo,
    emailData,
  });

  return NextResponse.json({
    ok: true,
    week: week.label,
    counts: {
      openRecs: openRecs.length,
      movers: movers.length,
      flags: flags.filter((f) => !f.startsWith('_')).length,
    },
    delivery,
    stageA: {
      content: stageA,
      fsPath: path.relative(process.cwd(), stageAFsPath),
      fsWritten: stageAFsWritten,
      fsError: stageAFsError,
    },
    stageB: stageBContent
      ? {
          content: stageBContent,
          fsPath: stageBFsPath ? path.relative(process.cwd(), stageBFsPath) : null,
          fsWritten: stageBFsWritten,
          fsError: stageBError,
        }
      : { content: null, fsError: stageBError },
  });
}

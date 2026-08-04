'use client';

import { ReactElement, ReactNode } from 'react';
import { extractLeadFacts } from '@/lib/leads/scoring';
import { SOURCE_LABELS } from '@/lib/leads/board-types';
import {
  asRecord,
  CHANNEL_LABELS,
  classifyLeadSource,
  labelFor,
  type LeadChannel,
} from '@/lib/leads/source-taxonomy';
import HqBadge, { type HqBadgeVariant } from '@/components/backend/kit/Badge';
import type { LeadDetail } from './drawer-types';

/** The first strong widget that owned this lead, when one was recorded. */
function readOriginWidget(metadata: unknown): string | null {
  const v = asRecord(metadata)?.originWidget;
  return typeof v === 'string' && v ? v : null;
}
import {
  describeDaysAway,
  eventIsPast,
  extractSubmission,
  formatEventDate,
  formatScoreBreakdown,
  formatShortDate,
  humanizeOccasion,
} from './drawer-derive';

/**
 * Drawer facts: the event details (date/occasion/headcount/budget) lead, then
 * the source/campaign/score grid and the linked orders & quotes list
 * (group-participant orders carry their "confirm before celebrating" caveat).
 *
 * The event-detail facts are HIDDEN when a "What they submitted" section will
 * render (the lead has a captured form surface) — those same fields live there,
 * so showing them here too was redundant (operator feedback 2026-07-24). Leads
 * with no submission surface (dashboard/ops-invoice/pixel) still show them here,
 * so nothing is lost. Source / affiliate / score / attribution / created always
 * stay — they aren't part of what the customer submitted.
 */
export default function DrawerFacts({ detail }: { detail: LeadDetail }): ReactElement {
  const { lead, orders, drafts } = detail;
  const facts = extractLeadFacts(lead.metadata);
  const source = classifyLeadSource({
    sourceWidget: lead.sourceWidget,
    utmMedium: lead.utmMedium,
    metadata: lead.metadata,
    hasAffiliate: detail.affiliate != null,
  });
  const originWidget = readOriginWidget(lead.metadata);
  const hasSubmission = extractSubmission(lead.metadata) !== null;
  const now = new Date();
  const daysAway = facts.eventDate ? describeDaysAway(facts.eventDate, now) : null;
  const past = facts.eventDate ? eventIsPast(facts.eventDate, now) : false;

  return (
    <>
      <section className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {!hasSubmission && facts.eventDate && (
          <Fact
            label="Event date"
            wide
            value={<EventDateValue dateStr={facts.eventDate} daysAway={daysAway} past={past} />}
          />
        )}
        {!hasSubmission && facts.occasion && (
          <Fact label="Occasion" value={humanizeOccasion(facts.occasion)} />
        )}
        {!hasSubmission && facts.headcount != null && (
          <Fact label="Headcount" value={`${facts.headcount} guests`} />
        )}
        {!hasSubmission && facts.budgetPerPerson != null && (
          <Fact label="Budget / person" value={`$${facts.budgetPerPerson}`} />
        )}
        {/* Same refined label the card shows — both call the shared taxonomy,
            so the board and the drawer cannot describe a lead differently.
            The raw enum stays available on hover for debugging. */}
        <Fact
          label="Source"
          value={
            <span title={lead.sourceWidget ?? undefined}>
              {source.label}
              {lead.sourcePage ? ` · ${lead.sourcePage}` : ''}
            </span>
          }
        />
        {source.formLabel && <Fact label="Form" value={source.formLabel} />}
        {originWidget && originWidget !== lead.sourceWidget && (
          <Fact label="Started as" value={labelFor(SOURCE_LABELS, originWidget) ?? originWidget} />
        )}
        {detail.affiliate && (
          <Fact label="Affiliate" value={`${detail.affiliate.name} (${detail.affiliate.code})`} />
        )}
        <Fact label="Score breakdown" value={formatScoreBreakdown(lead.scoreBreakdown)} />
        <Fact label="Created" value={formatShortDate(lead.createdAt)} />
      </section>

      <Attribution lead={lead} channel={source.channel} />

      <OrdersAndQuotes orders={orders} drafts={drafts} />
    </>
  );
}

/** Ad-platform click ids we surface, in display order. */
const CLICK_ID_LABELS: ReadonlyArray<[key: string, platform: string]> = [
  ['gclid', 'Google Ads'],
  ['gbraid', 'Google Ads (iOS)'],
  ['wbraid', 'Google Ads (web-to-app)'],
  ['fbclid', 'Meta'],
  ['msclkid', 'Bing'],
];

/**
 * Marketing attribution grid: UTM columns + the click-id/landing/referrer
 * detail stored in metadata.attribution. Campaign keeps its affirmative
 * "direct / unknown" fallback; everything else renders only when present —
 * with Google Ads ValueTrack tagging on, Keyword = the search term bought.
 */
/** Channel → badge colour. Semantic, not decorative: red flags our own spend. */
const CHANNEL_VARIANTS: Record<LeadChannel, HqBadgeVariant> = {
  paid: 'blue',
  partner: 'brand',
  outbound: 'amber',
  ops: 'gray',
  inbound: 'green',
  referral: 'green',
  organic: 'green',
  direct: 'gray',
};

function Attribution({
  lead,
  channel,
}: {
  lead: LeadDetail['lead'];
  channel: LeadChannel;
}): ReactElement {
  const meta = lead.metadata;
  const attribution =
    meta && typeof meta.attribution === 'object' && meta.attribution && !Array.isArray(meta.attribution)
      ? (meta.attribution as Record<string, unknown>)
      : null;
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

  const clickId = CLICK_ID_LABELS.flatMap(([key, platform]) => {
    const value = str(attribution?.[key]);
    return value ? [{ platform, value }] : [];
  })[0];
  const landing = str(attribution?.landingPage) ?? lead.sourcePage;
  const referrer = str(attribution?.referrer);

  return (
    <section className="mt-4">
      <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
        Attribution
      </h3>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Fact
          label="Channel"
          value={
            <HqBadge variant={CHANNEL_VARIANTS[channel]}>{CHANNEL_LABELS[channel]}</HqBadge>
          }
        />
        <Fact label="Campaign" value={lead.utmCampaign ?? lead.utmSource ?? 'direct / unknown'} />
        {(lead.utmSource || lead.utmMedium) && (
          <Fact label="Source / medium" value={`${lead.utmSource ?? '—'} / ${lead.utmMedium ?? '—'}`} />
        )}
        {lead.utmTerm && <Fact label="Keyword" value={lead.utmTerm} />}
        {lead.utmContent && <Fact label="Creative" value={lead.utmContent} />}
        {clickId && (
          <Fact
            label="Ad click"
            value={`${clickId.platform} · ${clickId.value.slice(0, 14)}…`}
          />
        )}
        {landing && <Fact label="Landing page" value={landing} wide />}
        {referrer && <Fact label="Referrer" value={referrer} wide />}
      </div>
    </section>
  );
}

/** Event date + a colored "days away" suffix (muted once the event has passed). */
function EventDateValue({
  dateStr,
  daysAway,
  past,
}: {
  dateStr: string;
  daysAway: string | null;
  past: boolean;
}): ReactElement {
  return (
    <>
      {formatEventDate(dateStr)}
      {daysAway && (
        <span className={past ? 'text-gray-400' : 'text-brand-blue font-medium'}>
          {` · ${daysAway}`}
        </span>
      )}
    </>
  );
}

/** Matched paid orders + draft invoices, if any. */
function OrdersAndQuotes({
  orders,
  drafts,
}: {
  orders: LeadDetail['orders'];
  drafts: LeadDetail['drafts'];
}): ReactElement | null {
  if (orders.length === 0 && drafts.length === 0) return null;
  return (
    <section className="mt-4">
      <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
        Orders & quotes
      </h3>
      <ul className="mt-1 space-y-1 text-sm">
        {orders.map((o) => (
          <li key={o.id}>
            <a href={`/ops/orders/${o.id}`} className="text-brand-blue underline">
              Order #{o.orderNumber}
            </a>{' '}
            · ${o.total.toFixed(0)}
            {o.isGroupParticipant && (
              <span className="text-gray-500"> · group payment (possible win — confirm)</span>
            )}
          </li>
        ))}
        {drafts.map((d) => (
          <li key={d.id} className="text-gray-700">
            Invoice {d.status.toLowerCase()} · ${Number(d.total).toFixed(0)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}): ReactElement {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</div>
      <div className="text-gray-800 break-words">{value}</div>
    </div>
  );
}

'use client';

import { ReactElement, ReactNode } from 'react';
import { extractLeadFacts } from '@/lib/leads/scoring';
import type { LeadDetail } from './drawer-types';
import {
  describeDaysAway,
  eventIsPast,
  formatEventDate,
  formatScoreBreakdown,
  formatShortDate,
  humanizeOccasion,
} from './drawer-derive';

/**
 * Drawer facts: the event details (date/occasion/headcount/budget — shown only
 * when captured) lead, then the source/campaign/score grid and the linked
 * orders & quotes list (group-participant orders carry their "confirm before
 * celebrating" caveat).
 */
export default function DrawerFacts({ detail }: { detail: LeadDetail }): ReactElement {
  const { lead, orders, drafts } = detail;
  const facts = extractLeadFacts(lead.metadata);
  const now = new Date();
  const daysAway = facts.eventDate ? describeDaysAway(facts.eventDate, now) : null;
  const past = facts.eventDate ? eventIsPast(facts.eventDate, now) : false;

  return (
    <>
      <section className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {facts.eventDate && (
          <Fact
            label="Event date"
            wide
            value={<EventDateValue dateStr={facts.eventDate} daysAway={daysAway} past={past} />}
          />
        )}
        {facts.occasion && <Fact label="Occasion" value={humanizeOccasion(facts.occasion)} />}
        {facts.headcount != null && <Fact label="Headcount" value={`${facts.headcount} guests`} />}
        {facts.budgetPerPerson != null && (
          <Fact label="Budget / person" value={`$${facts.budgetPerPerson}`} />
        )}
        <Fact
          label="Source"
          value={`${lead.sourceWidget ?? '—'}${lead.sourcePage ? ` · ${lead.sourcePage}` : ''}`}
        />
        <Fact label="Campaign" value={lead.utmCampaign ?? lead.utmSource ?? 'direct / unknown'} />
        <Fact label="Score breakdown" value={formatScoreBreakdown(lead.scoreBreakdown)} />
        <Fact label="Created" value={formatShortDate(lead.createdAt)} />
      </section>

      <OrdersAndQuotes orders={orders} drafts={drafts} />
    </>
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

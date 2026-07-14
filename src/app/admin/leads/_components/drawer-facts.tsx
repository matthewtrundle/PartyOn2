'use client';

import { ReactElement } from 'react';
import type { LeadDetail } from './drawer-types';

/**
 * Drawer facts: the source/campaign/score grid plus the linked orders &
 * quotes list (group-participant orders carry their "confirm before
 * celebrating" caveat).
 */
export default function DrawerFacts({ detail }: { detail: LeadDetail }): ReactElement {
  const { lead, orders, drafts } = detail;
  return (
    <>
      <section className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Fact label="Source" value={`${lead.sourceWidget ?? '—'}${lead.sourcePage ? ` · ${lead.sourcePage}` : ''}`} />
        <Fact label="Campaign" value={lead.utmCampaign ?? lead.utmSource ?? 'direct / unknown'} />
        <Fact
          label="Score breakdown"
          value={
            lead.scoreBreakdown
              ? Object.entries(lead.scoreBreakdown)
                  .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()} ${v}`)
                  .join(' · ')
              : '—'
          }
        />
        <Fact label="Created" value={new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
      </section>

      {(orders.length > 0 || drafts.length > 0) && (
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
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</div>
      <div className="text-gray-800 break-words">{value}</div>
    </div>
  );
}

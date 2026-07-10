'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { HqIcon } from '@/components/backend/shell/icons';

/**
 * /ops/today — the HQ home. Phase-1 stub so the Today tab has a real
 * destination; the full "Shift Board" (KPIs, triage, today's runs) ships in
 * the next phase against a new /api/today aggregate.
 */
export default function TodayPage(): ReactElement {
  const now = new Date();
  const eyebrow = now
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Chicago',
    })
    .toUpperCase();

  const links = [
    { href: '/ops/orders', label: 'Orders', desc: "Today's deliveries, invoices, carts", icon: 'orders' as const },
    { href: '/ops/products', label: 'Catalog', desc: 'Products, stock, collections', icon: 'catalog' as const },
    { href: '/ops/events', label: 'Events', desc: 'Rosters and headcounts', icon: 'events' as const },
  ];

  return (
    <div>
      <div className="bg-navy text-white px-4 pt-2 pb-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="font-heading font-semibold text-xs tracking-[0.18em] text-gold">
            {eyebrow.replace(',', ' ·')}
          </div>
          <h1 className="font-heading font-bold text-2xl tracking-[0.08em] uppercase mt-0.5">
            Command Center
          </h1>
        </div>
      </div>
      <div className="px-4 py-4 md:px-8 max-w-5xl mx-auto space-y-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow min-h-[64px]"
          >
            <span className="text-brand-blue">
              <HqIcon name={l.icon} size={24} />
            </span>
            <span className="flex-1">
              <span className="block font-heading font-bold text-lg tracking-[0.05em] uppercase text-gray-900">
                {l.label}
              </span>
              <span className="block text-sm text-gray-500">{l.desc}</span>
            </span>
          </Link>
        ))}
        <p className="text-sm text-gray-400 pt-2">
          The full Shift Board (KPIs, alerts, today&apos;s runs) lands here next.
        </p>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import type { ReactElement } from 'react';
import type { GroupOrderV2Full } from '@/lib/group-orders-v2/types';
import type { CustomDashboardTheme } from '@/lib/dashboard/custom-themes';
import { parseTitleMarkup } from '@/lib/dashboard/parse-title-markup';

interface Props {
  groupOrder: GroupOrderV2Full;
  theme: CustomDashboardTheme;
}

function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

export default function DashboardCustomHero({ groupOrder, theme }: Props): ReactElement {
  const firstTab = groupOrder.tabs[0];
  const deliveryDate = firstTab ? formatDeliveryDate(new Date(firstTab.deliveryDate)) : null;
  const deliveryTime = firstTab?.deliveryTime ?? null;
  const cityState = firstTab
    ? `${firstTab.deliveryAddress.city}, ${firstTab.deliveryAddress.province}`
    : null;

  const titleNodes = parseTitleMarkup(groupOrder.name);

  return (
    <section className="relative h-[50vh] md:h-[55vh] overflow-hidden">
      <Image
        src={theme.heroImageUrl}
        alt={theme.heroAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/20 to-gray-900/80" />

      <div className="relative h-full flex flex-col items-center justify-end text-center text-white px-4 pb-10 md:pb-14 z-10">
        {theme.eyebrow && (
          <p className="text-sm md:text-base font-semibold tracking-[0.18em] uppercase text-white/90 mb-3 drop-shadow">
            {theme.eyebrow}
          </p>
        )}

        <h1 className="font-heading font-bold tracking-[0.04em] text-3xl sm:text-4xl md:text-6xl lg:text-7xl leading-tight max-w-5xl drop-shadow-lg">
          {titleNodes}
        </h1>

        {(deliveryDate || deliveryTime || cityState) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm md:text-base text-white/95 font-medium drop-shadow">
            {deliveryDate && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {deliveryDate}
              </span>
            )}
            {deliveryTime && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {deliveryTime}
              </span>
            )}
            {cityState && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0L6.343 16.657A8 8 0 1117.657 16.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {cityState}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { LANDING_PAGES, type LandingPageKey } from '@/lib/analytics/landing-pages';

interface LandingPageTabsProps {
  active: LandingPageKey;
}

/**
 * Top tab bar of landing pages for the analytics hub. Each tab deep-links via
 * `?page=<key>`; reads the registry so tabs, queries, and A/B scoping agree.
 */
export default function LandingPageTabs({ active }: LandingPageTabsProps): ReactElement {
  const pages = [...LANDING_PAGES].sort((a, b) => a.navOrder - b.navOrder);

  return (
    <nav className="flex flex-wrap gap-2">
      {pages.map((p) => {
        const isActive = p.key === active;
        return (
          <Link
            key={p.key}
            href={`/admin/analytics?page=${p.key}`}
            scroll={false}
            className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-[0.04em] transition-colors ${
              isActive
                ? 'bg-brand-blue text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {p.displayName}
          </Link>
        );
      })}
    </nav>
  );
}

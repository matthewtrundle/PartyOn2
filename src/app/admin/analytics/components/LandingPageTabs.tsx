'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  primaryLandingPages,
  secondaryLandingPageGroups,
  type LandingPageKey,
} from '@/lib/analytics/landing-pages';

interface LandingPageTabsProps {
  active: LandingPageKey;
}

/**
 * Top tab bar of landing pages for the analytics hub. Each tab deep-links via
 * `?page=<key>`; reads the registry so tabs, queries, and A/B scoping agree.
 *
 * Only the core funnels get tabs — every other marketing lander lives in the
 * trailing "More pages" picker, so the band stays one row (the 13" wrapping
 * problem documented in BriansStuffTabs) while all pages stay reachable.
 */
export default function LandingPageTabs({ active }: LandingPageTabsProps): ReactElement {
  const router = useRouter();
  const tabs = primaryLandingPages();
  const groups = secondaryLandingPageGroups();
  const activeIsSecondary = !tabs.some((p) => p.key === active);

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {tabs.map((p) => {
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

      {groups.length > 0 && (
        <select
          aria-label="More landing pages"
          value={activeIsSecondary ? active : ''}
          onChange={(e) => {
            const key = e.target.value;
            if (key) router.push(`/admin/analytics?page=${key}`, { scroll: false });
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-[0.04em] border transition-colors ${
            activeIsSecondary
              ? 'bg-brand-blue text-white border-brand-blue'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <option value="">More pages…</option>
          {groups.map((g) => (
            <optgroup key={g.group} label={g.label}>
              {g.pages.map((p) => (
                <option key={p.key} value={p.key} className="text-gray-900">
                  {p.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </nav>
  );
}

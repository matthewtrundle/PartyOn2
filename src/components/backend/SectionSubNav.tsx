'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SectionSubNavItem {
  /** Destination route */
  href: string;
  label: string;
  /** Pathname prefixes that mark this item active (defaults to [href]) */
  match?: string[];
}

/**
 * Route-based sub-navigation pills shared by consolidated backend sections
 * (Catalog: Products/Inventory/Collections, Email: Templates/Follow-Ups/Signups,
 * Partners: Affiliates/Promotions). Renders a horizontally scrollable pill row
 * with 44px touch targets; active state derives from the current pathname.
 */
export default function SectionSubNav({
  items,
}: {
  items: SectionSubNavItem[];
}): ReactElement {
  const pathname = usePathname() || '';

  // Longest-prefix wins so nested routes (/admin/emails/followups) light up
  // their own pill instead of also matching the parent (/admin/emails).
  const bestMatch = (item: SectionSubNavItem): number =>
    Math.max(
      -1,
      ...(item.match ?? [item.href])
        .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
        .map((p) => p.length),
    );
  const winner = items.reduce(
    (best, item) => (bestMatch(item) > bestMatch(best) ? item : best),
    items[0],
  );
  const isActive = (item: SectionSubNavItem): boolean =>
    bestMatch(item) >= 0 && item === winner;

  return (
    <nav
      aria-label="Section"
      className="print:hidden flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`min-h-[44px] px-4 inline-flex items-center text-sm font-semibold rounded-lg whitespace-nowrap transition-colors touch-manipulation ${
            isActive(item)
              ? 'bg-brand-blue text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

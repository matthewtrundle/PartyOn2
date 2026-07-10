'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { HqIcon } from './icons';
import { MOBILE_TABS, isDestActive } from './nav-config';
import type { NavBadges } from './useNavBadges';

function TabBadge({ count }: { count: number }): ReactElement | null {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4 text-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Mobile bottom tab bar (<768px): the 4 route tabs + More. 64px + safe-area,
 * fixed z-40 per the shell z-scale. Active = brand-blue icon (stroke-2) +
 * bold label.
 */
export default function BottomTabBar({
  pathname,
  badges,
  moreActive,
  onMore,
}: {
  pathname: string;
  badges: NavBadges;
  moreActive: boolean;
  onMore: () => void;
}): ReactElement {
  const anyTabActive = MOBILE_TABS.some((t) => isDestActive(t, pathname));

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] print:hidden"
    >
      <div className="grid grid-cols-5 h-16">
        {MOBILE_TABS.map((tab) => {
          const active = isDestActive(tab, pathname);
          const count = tab.badge === 'orders' ? badges.ordersToday : tab.badge === 'recs' ? badges.recsOpen : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 touch-manipulation ${
                active ? 'text-brand-blue' : 'text-gray-500'
              }`}
            >
              <span className="relative">
                <HqIcon name={tab.icon} active={active} />
                <TabBadge count={count} />
              </span>
              <span className={`text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-expanded={moreActive}
          className={`flex flex-col items-center justify-center gap-0.5 touch-manipulation ${
            moreActive || (!anyTabActive && pathname.startsWith('/admin'))
              ? 'text-brand-blue'
              : 'text-gray-500'
          }`}
        >
          <span className="relative">
            <HqIcon name="more" active={moreActive} />
            <TabBadge count={badges.recsOpen} />
          </span>
          <span className={`text-[11px] leading-none ${moreActive ? 'font-bold' : 'font-medium'}`}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { HqIcon } from './icons';
import {
  SIDEBAR_OPERATE,
  BUSINESS_DESTS,
  APP_DESTS,
  isDestActive,
  visibleTo,
  type NavDest,
  type StaffRole,
} from './nav-config';
import type { NavBadges } from './useNavBadges';

function SidebarItem({
  dest,
  pathname,
  badges,
}: {
  dest: NavDest;
  pathname: string;
  badges: NavBadges;
}): ReactElement {
  const active = isDestActive(dest, pathname);
  const count = dest.badge === 'orders' ? badges.ordersToday : dest.badge === 'recs' ? badges.recsOpen : 0;
  return (
    <Link
      href={dest.href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 min-h-[40px] text-sm font-medium border-l-[3px] transition-colors ${
        active
          ? 'bg-brand-blue/35 border-brand-yellow text-white'
          : 'border-transparent text-[#B7C4D0] hover:text-white hover:bg-white/5'
      }`}
    >
      <HqIcon name={dest.icon} size={18} active={active} />
      <span className="flex-1">{dest.label}</span>
      {count > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

/**
 * Desktop sidebar (≥768px): 232px navy rail. Operate group (tabs + Agent),
 * then the BUSINESS eyebrow group (admin only), logout pinned at the bottom.
 */
export default function SidebarNav({
  pathname,
  role,
  badges,
  onLogout,
}: {
  pathname: string;
  role: StaffRole | null;
  badges: NavBadges;
  onLogout: () => void;
}): ReactElement {
  const business = [...BUSINESS_DESTS, ...APP_DESTS].filter((d) => visibleTo(d, role));

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[232px] z-40 bg-navy flex-col print:hidden">
      <Link href="/ops/today" className="px-4 h-14 flex items-center font-heading font-bold text-base tracking-[0.12em] text-white shrink-0">
        PARTY ON <span className="text-gold ml-1.5">HQ</span>
      </Link>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {SIDEBAR_OPERATE.filter((d) => visibleTo(d, role)).map((dest) => (
          <SidebarItem key={dest.href} dest={dest} pathname={pathname} badges={badges} />
        ))}
        {business.length > 0 && (
          <>
            <div className="px-4 pt-5 pb-1.5 text-[11px] font-semibold tracking-[0.18em] text-gold">
              BUSINESS
            </div>
            {business.map((dest) => (
              <SidebarItem key={dest.href} dest={dest} pathname={pathname} badges={badges} />
            ))}
          </>
        )}
      </nav>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 px-4 min-h-[48px] text-sm font-medium text-[#B7C4D0] hover:text-white hover:bg-white/5 border-t border-white/10 shrink-0"
      >
        <HqIcon name="logout" size={18} />
        Logout
      </button>
    </aside>
  );
}

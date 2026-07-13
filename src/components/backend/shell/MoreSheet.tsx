'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import { HqIcon } from './icons';
import {
  BUSINESS_DESTS,
  APP_DESTS,
  visibleTo,
  type NavDest,
  type StaffRole,
} from './nav-config';
import type { NavBadges } from './useNavBadges';

function Tile({
  dest,
  badges,
  onNavigate,
}: {
  dest: NavDest;
  badges: NavBadges;
  onNavigate: () => void;
}): ReactElement {
  const count =
    dest.badge === 'recs' ? badges.recsOpen : dest.badge === 'leads' ? badges.leadsHot : 0;
  return (
    <Link
      href={dest.href}
      onClick={onNavigate}
      className="relative flex flex-col items-center justify-center gap-1.5 min-h-[74px] rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors touch-manipulation"
    >
      <HqIcon name={dest.icon} size={22} />
      <span className="text-xs font-semibold text-center leading-tight px-1">{dest.label}</span>
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

/**
 * The 5th tab: bottom sheet with the admin destination grid (Business / App
 * groups) + Logout. Employees get Logout only (Settings lives under /admin,
 * which redirects them — see nav-config roles).
 */
export default function MoreSheet({
  open,
  onClose,
  role,
  badges,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  role: StaffRole | null;
  badges: NavBadges;
  onLogout: () => void;
}): ReactElement | null {
  const business = BUSINESS_DESTS.filter((d) => visibleTo(d, role));
  const app = APP_DESTS.filter((d) => visibleTo(d, role));

  return (
    <BottomSheet open={open} onClose={onClose} title="More">
      {business.length > 0 && (
        <>
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-gray-500 mt-2 mb-2">
            Business
          </div>
          <div className="grid grid-cols-3 gap-2">
            {business.map((d) => (
              <Tile key={d.href} dest={d} badges={badges} onNavigate={onClose} />
            ))}
          </div>
        </>
      )}
      {app.length > 0 && (
        <>
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-gray-500 mt-4 mb-2">
            App
          </div>
          <div className="grid grid-cols-3 gap-2">
            {app.map((d) => (
              <Tile key={d.href} dest={d} badges={badges} onNavigate={onClose} />
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="mt-4 mb-2 w-full min-h-[48px] flex items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <HqIcon name="logout" size={18} />
        Logout
      </button>
    </BottomSheet>
  );
}

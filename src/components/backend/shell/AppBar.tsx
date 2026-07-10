'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { HqIcon } from './icons';
import type { StaffRole } from './nav-config';

/**
 * Mobile app bar (hidden ≥768px where the sidebar owns nav): navy, wordmark,
 * current screen title, Agent sparkle (admin). Sticky under the OS status bar
 * with safe-area padding for standalone PWA mode.
 */
export default function AppBar({
  title,
  role,
}: {
  title: string;
  role: StaffRole | null;
}): ReactElement {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-navy text-white pt-[env(safe-area-inset-top)] print:hidden">
      <div className="h-[56px] px-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <Link href="/ops/today" className="font-heading font-bold text-sm tracking-[0.12em] shrink-0">
            PARTY ON <span className="text-gold">HQ</span>
          </Link>
          <span className="font-heading font-bold text-2xl tracking-[0.08em] uppercase truncate">
            {title}
          </span>
        </div>
        {role === 'admin' && (
          <Link
            href="/ops/agent"
            aria-label="Ops agent"
            className="w-10 h-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <HqIcon name="agent" size={20} />
          </Link>
        )}
      </div>
    </header>
  );
}

'use client';

import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useBackendAuth } from './useBackendAuth';
import { screenTitleFor } from './nav-config';
import { useNavBadges } from './useNavBadges';
import LoginScreen from './LoginScreen';
import AppBar from './AppBar';
import BottomTabBar from './BottomTabBar';
import SidebarNav from './SidebarNav';
import MoreSheet from './MoreSheet';

/**
 * Party On HQ app shell — the one chrome for both staff portals (/ops/* and
 * /admin/*): mobile app bar + bottom tab bar, desktop navy sidebar, More
 * sheet, shared login gate. All chrome is print:hidden and the .pod-shell
 * CSS vars (globals.css) let page-level fixed/sticky elements offset the
 * chrome without knowing its size.
 */
export default function AppShell({ children }: { children: ReactNode }): ReactElement {
  const { isAuthenticated, role, login, logout } = useBackendAuth();
  const pathname = usePathname() || '';
  const [moreOpen, setMoreOpen] = useState(false);
  const badges = useNavBadges(isAuthenticated === true);

  // Close the More sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Still checking auth status
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="pod-shell min-h-screen bg-gray-100 print:bg-white">
      <AppBar title={screenTitleFor(pathname)} role={role} />
      <SidebarNav pathname={pathname} role={role} badges={badges} onLogout={logout} />
      <main className="pb-[var(--pod-tab-h)] md:pl-[232px] print:p-0 print:m-0">
        {children}
      </main>
      <BottomTabBar
        pathname={pathname}
        badges={badges}
        moreActive={moreOpen}
        onMore={() => setMoreOpen((v) => !v)}
      />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        role={role}
        badges={badges}
        onLogout={logout}
      />
    </div>
  );
}

import { ReactElement, ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/backend/shell/AppShell';

/**
 * Ops portal layout — thin server wrapper around the shared HQ shell.
 * Server component so viewport (safe-area/notch support + navy theme color)
 * and the HQ PWA manifest scope to the backend without touching the
 * customer site (which keeps its own manifest.json).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0A1F33',
};

export const metadata: Metadata = {
  manifest: '/hq.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Party On',
    statusBarStyle: 'black-translucent',
  },
};

export default function OpsLayout({ children }: { children: ReactNode }): ReactElement {
  return <AppShell>{children}</AppShell>;
}

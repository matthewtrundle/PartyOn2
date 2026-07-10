import { ReactElement, ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/backend/shell/AppShell';

/**
 * Admin portal layout — thin server wrapper around the shared HQ shell.
 * Role rules (employees redirect to ops) live in the shell's auth hook.
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

export default function AdminLayout({ children }: { children: ReactNode }): ReactElement {
  return <AppShell>{children}</AppShell>;
}

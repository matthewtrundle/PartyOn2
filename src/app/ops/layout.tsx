import { ReactElement, ReactNode } from 'react';
import type { Viewport } from 'next';
import AppShell from '@/components/backend/shell/AppShell';

/**
 * Ops portal layout — thin server wrapper around the shared HQ shell.
 * Server component so viewport (safe-area/notch support + navy theme color)
 * scopes to the backend without touching the customer site.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0A1F33',
};

export default function OpsLayout({ children }: { children: ReactNode }): ReactElement {
  return <AppShell>{children}</AppShell>;
}

/**
 * /austin-bachelorette-concierge
 *
 * Premier Concierge · Austin Bachelorette Party Planning landing page.
 *
 * Twin of /austin-bachelor-concierge — shares the same ConciergeLandingClient
 * component driven by a `variant` prop. Bachelor gets navy/gold; this one
 * gets deep raspberry + rose. Copy, service list, and imagery all swap
 * per-variant inside the shared component so both pages stay in sync
 * whenever we edit shared structure.
 */
import type { Metadata } from 'next';
import ConciergeLandingClient from '@/components/concierge/ConciergeLandingClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Premier Concierge · Austin Bachelorette Party Planning | Party On Delivery',
  description:
    "Full-service Austin bachelorette planning — private boats on Lake Travis, rosé + champagne delivery, brunch bars, winery tours, spa recovery, and rides. One form. Whole weekend planned before the bride's flight lands.",
  alternates: { canonical: '/austin-bachelorette-concierge' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Premier Concierge · Austin Bachelorette Party Planning',
    description:
      'One form. Boats, bubbly, brunch, wineries, spa. We plan the whole weekend.',
    type: 'website',
  },
};

export default function AustinBacheloretteConciergePage() {
  return <ConciergeLandingClient variant="bachelorette" />;
}

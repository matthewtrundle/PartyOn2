/**
 * /austin-concierge
 *
 * Party-type routing gate. Blurred hero image behind an immediate
 * modal that asks "What kind of party are you planning?" with two
 * buttons — Bachelor / Bachelorette — that hard-navigate to the
 * respective planning pages.
 *
 * Server component: just metadata + the client shell. The gate itself
 * is a pure client component (no data fetches, no analytics side
 * effects beyond the standard PageViewTracker in the root layout).
 */
import type { Metadata } from 'next';
import PartyTypeGateClient from '@/components/concierge/PartyTypeGateClient';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Premier Concierge · Austin Party Planning | Party On Delivery',
  description:
    'Full-service Austin party planning — bachelor and bachelorette weekends. Pick your flavor and start planning.',
  alternates: { canonical: '/austin-concierge' },
  // NoIndex: this is a routing/gate page; the actual product pages
  // (/austin-bachelor-concierge and /austin-bachelorette-concierge) are
  // where SEO effort concentrates.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Premier Concierge · Austin Party Planning',
    description:
      'Bachelor or bachelorette? Pick one and we plan the whole weekend.',
    type: 'website',
  },
};

export default function AustinConciergeGatePage() {
  return <PartyTypeGateClient />;
}

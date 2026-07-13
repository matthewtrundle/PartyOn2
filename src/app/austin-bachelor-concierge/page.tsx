/**
 * /austin-bachelor-concierge
 *
 * Premier Concierge · Austin Bachelor Party Planning landing page.
 *
 * Built ON the POD infrastructure per founder spec (leads land in POD's
 * Brian's Stuff → Leads; product catalog references POD; GHL webhook
 * fires from POD; Google Sheet mirror writes from POD). This page is
 * intentionally not indexed yet — canonical URL flips to
 * premierconcierge.co once that repo mirrors this component.
 *
 * The interactive pieces (services grid + 6-step questionnaire modal)
 * live in ConciergeLandingClient. This file is a thin server wrapper
 * for SEO metadata + first-paint HTML.
 */
import type { Metadata } from 'next';
import ConciergeLandingClient from '@/components/concierge/ConciergeLandingClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Premier Concierge · Austin Bachelor Party Planning | Party On Delivery',
  description:
    'Full-service Austin bachelor-party planning — party boat rentals on Lake Travis, drink delivery to the dock, golf & brewery tours, ATV rides, gun range, and transportation. One questionnaire, one concierge, one weekend planned.',
  alternates: { canonical: '/austin-bachelor-concierge' },
  // NoIndex during Phase 1 while the component is co-hosted on POD.
  // Flip to indexed after we migrate the canonical URL to
  // premierconcierge.co.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Premier Concierge · Austin Bachelor Party Planning',
    description:
      'One form. Boats, drinks, golf, ATVs, gun range, transportation. We plan the whole weekend.',
    type: 'website',
  },
};

export default function AustinBachelorConciergePage() {
  return <ConciergeLandingClient variant="bachelor" />;
}

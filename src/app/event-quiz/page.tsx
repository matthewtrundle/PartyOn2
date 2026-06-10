import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import { bachelorConfig } from '@/components/landing/configs/bachelor';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';
import EventQuizModal from '@/components/quiz/EventQuizModal';

/**
 * /event-quiz — paid-ad funnel router.
 *
 * Renders the bachelor landing page as a visual backdrop, with a
 * 4-step modal questionnaire on top that can't be dismissed. The
 * quiz collects:
 *   1. Party type (bachelor / bachelorette / corporate / wedding / etc.)
 *   2. Delivery timing (today / tomorrow / future)
 *   3. Needs (multi-select — drinks, transport, boat, tour, rentals)
 *   4. Contact info (name, email, phone)
 *
 * On submit: API creates a Lead, sends the welcome email, redirects
 * the visitor to their personalized landing page with ?welcome=1 so
 * that page renders the "Step one: Let's get started with your
 * drinks" hero copy.
 *
 * Not indexed — this is an ad destination, not a discoverable page.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Plan Your Austin Party · Party On Delivery',
  description:
    'Tell us about your party in 30 seconds. We route you to the right team — drinks, rentals, boats, bartenders, concierge.',
  robots: { index: false, follow: false },
};

export default async function EventQuizPage() {
  const [catalog, lastMinuteCatalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog(),
    getLastMinuteCatalog(),
    getOccasionPackages('bachelor'),
    getUpsellProducts(),
  ]);
  const config = { ...bachelorConfig, packages };
  return (
    <>
      <LandingPageTemplate
        config={config}
        catalog={catalog}
        lastMinuteCatalog={lastMinuteCatalog}
        upsellProducts={upsellProducts}
      />
      <EventQuizModal />
    </>
  );
}

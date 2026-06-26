/**
 * TEST DUPLICATE of /austin-bachelor-party-delivery.
 *
 * Identical data fetch + LandingPageTemplate as the live bachelor page —
 * the only differences are:
 *
 *   1. Slug + canonical URL point at /austin-bachelor-party-delivery-ai-test
 *      so it doesn't compete with the live page on search.
 *   2. `robots: noindex` so Google never picks it up.
 *   3. Drops an <AIPartyChatBar /> into the template's `aiChatSlot`,
 *      which renders just below the trust bar.
 *
 * Once Brian validates the AI flow here, we can either fold the chat bar
 * into the real bachelor page (or all 4 landing pages) or kill it.
 */
import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import AIPartyChatBar from '@/components/landing/AIPartyChatBar';
import { bachelorConfig } from '@/components/landing/configs/bachelor';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${bachelorConfig.metaTitle} · AI Test`,
  description: bachelorConfig.metaDescription,
  alternates: { canonical: '/austin-bachelor-party-delivery-ai-test' },
  // Test page only — keep it out of the index.
  robots: { index: false, follow: false },
};

export default async function AustinBachelorPartyDeliveryAITestPage() {
  const [catalog, lastMinuteCatalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog(),
    getLastMinuteCatalog(),
    getOccasionPackages('bachelor'),
    getUpsellProducts(),
  ]);
  const config = { ...bachelorConfig, packages };
  return (
    <LandingPageTemplate
      config={config}
      catalog={catalog}
      lastMinuteCatalog={lastMinuteCatalog}
      upsellProducts={upsellProducts}
      aiChatSlot={<AIPartyChatBar />}
    />
  );
}

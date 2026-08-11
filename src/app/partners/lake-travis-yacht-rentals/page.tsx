import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { BoatTemplate } from '@/components/partners/templates/BoatTemplate';

/**
 * Static partner page for Lake Travis Yacht Rentals.
 *
 * This static route intentionally takes precedence over the dynamic
 * /partners/[slug] page so the CTA can deep-link to a seeded Premier-style
 * dashboard (Boat Order tab pre-filled with the marina address + a House Order
 * tab) instead of the generic /order entry the shared BoatTemplate defaults to.
 *
 * The dashboard tabs + boat address come from the LTYACHTRENTALS entry in
 * src/lib/affiliates/presets.ts (AFFILIATE_ORDER_DEFAULTS). Commission
 * attribution only fires once the LTYACHTRENTALS affiliate row is ACTIVE.
 */

const CTA_HREF = '/order?ref=LTYACHTRENTALS&p=boat&d=boat';

/**
 * The marina walk-down spot — a 0:45 vertical cut shot at Hurst Harbor.
 *
 * Hosted UNLISTED on YouTube, which is deliberate: it embeds and plays fine
 * while staying out of search, the channel's public list, and the Shorts feed.
 * It has no search job (see docs/marketing/ltyr-marina-video-script-2026-07.md)
 * — do not make it public expecting views to mean anything.
 *
 * Vertical because it was shot on a phone. At 0:45 YouTube classifies it as a
 * Short, which changes nothing about embedding: Shorts serve through the same
 * /embed/<id> path as long-form.
 */
const LTYR_VIDEO_ID = 'R9vhASE29xc';

export const metadata: Metadata = {
  title: 'Lake Travis Yacht Rental Delivery | Party On Delivery',
  description:
    'Book Lake Travis Yacht Rentals and get your drinks delivered iced and ready at the dock. Spirits, mixers, seltzers, ice, and cups delivered free to the marina by Party On Delivery — plus stock the house before you set sail.',
  openGraph: {
    title: 'Lake Travis Yacht Rental Delivery | Party On Delivery',
    description:
      'Drinks delivered iced to your boat at the dock — free marina delivery. Plus stock the house before you set sail.',
    images: [{ url: '/images/boat-heroes/boat-party-epic-sunset.webp' }],
  },
};

export default function LakeTravisYachtRentalsPage(): ReactElement {
  return (
    <BoatTemplate
      affiliate={{
        businessName: 'Lake Travis Yacht Rentals',
        code: 'LTYACHTRENTALS',
        category: 'BOAT',
        customerPerk: 'Free Delivery',
        contactName: 'Lake Travis Yacht Rentals',
        phone: '(512) 981-6409',
        email: '',
        partnerSlug: 'lake-travis-yacht-rentals',
      }}
      partnerLogo="/images/partners/lake-travis-yacht-rentals-logo.png"
      partnerHeroImage="/images/partners/lake-travis-yacht-rentals-hero.jpg"
      heroBackgroundImage="/images/partners/lake-travis-yacht-rentals-hero-bg.webp"
      logoLightChip
      headline={
        <>
          <span className="text-brand-yellow">Lake Travis Yacht Rental</span> Delivery
        </>
      }
      subhead={
        <>
          Drinks delivered iced to your boat at the dock — plus stock the house before you set sail. Free marina delivery.
        </>
      }
      video={{
        videoId: LTYR_VIDEO_ID,
        orientation: 'vertical',
        title: 'PartyOn Delivery at Lake Travis Yacht Rentals — drinks delivered to the dock',
        heading: 'A Real Delivery at the Dock, Start to Finish',
        blurb:
          'Forty-five seconds at Hurst Harbor: what actually shows up, and where it lands.',
      }}
      ctaHref={CTA_HREF}
    />
  );
}

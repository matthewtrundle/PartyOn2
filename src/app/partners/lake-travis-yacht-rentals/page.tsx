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
      partnerHeroImage={null}
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
      ctaHref={CTA_HREF}
    />
  );
}

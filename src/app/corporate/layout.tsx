import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Corporate Event Alcohol Delivery – Party On Delivery Austin',
  description: 'Simplify your next Austin company event. Party On Delivery delivers alcohol, mixers, and ice for offices, venues, and offsites — cold and on time.',
  keywords: 'corporate event alcohol delivery austin, company party bar service, office event catering austin, corporate alcohol delivery',
  openGraph: {
    title: 'Corporate Event Alcohol Delivery – Party On Delivery Austin',
    description: 'Simplify your next Austin company event. Party On Delivery delivers alcohol, mixers, and ice for offices, venues, and offsites — cold and on time.',
    type: 'website',
  },
  // No canonical here: /corporate itself 301s to /austin-corporate-event-delivery
  // (next.config.ts); a layout-level canonical would be inherited by the live
  // /corporate/holiday-party and /corporate/products subpages and point them
  // at a redirecting URL. Subpages set their own canonicals where needed.
  robots: {
    index: true,
    follow: true,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Party On Delivery',
      url: 'https://partyondelivery.com',
      logo: 'https://partyondelivery.com/images/POD%20Logo%202025.svg',
      description: 'Premium alcohol delivery service for corporate events in Austin, Texas',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Austin',
        addressRegion: 'TX',
        addressCountry: 'US',
      },
      telephone: '(737) 371-9700',
    },
    {
      '@type': 'Service',
      name: 'Corporate Event Alcohol Delivery',
      description:
        'Professional alcohol delivery service for company events, office parties, and corporate gatherings in Austin, TX. Includes beer, wine, spirits, mixers, ice, and disposables.',
      provider: {
        '@type': 'Organization',
        name: 'Party On Delivery',
      },
      areaServed: {
        '@type': 'City',
        name: 'Austin',
        addressRegion: 'TX',
      },
      serviceType: 'Alcohol Delivery for Corporate Events',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What areas do you serve for corporate events?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We deliver throughout Austin and surrounding areas including downtown offices, venues, and offsite locations. Contact us to confirm your specific address.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much advance notice do you need?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We require 72 hours advance notice for standard delivery. For rush orders, call us at (737) 371-9700 to check availability.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do you provide mixers, ice, and disposables?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! We provide mixers, ice, cups, napkins, and other bar essentials. Everything arrives cold and ready to serve.',
          },
        },
      ],
    },
  ],
};

export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        id="corporate-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  );
}

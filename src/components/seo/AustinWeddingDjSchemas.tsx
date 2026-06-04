import type { ReactElement } from 'react';
import { generateFAQSchema } from '@/lib/seo/schemas';
import { austinWeddingDj } from '@/lib/partners/landing-pages';

/**
 * Server-side JSON-LD schemas for /partners/austin-wedding-dj (WS3).
 * Emits Person + LocalBusiness + Service + FAQPage as static JSON-LD so
 * search engines see them in initial HTML.
 *
 * Placeholders ([DJ_NAME] etc.) intentionally remain in the schema so they
 * surface in Rich Results Test as obvious "fill me in" markers until the
 * operator swaps the real data.
 */
export default function AustinWeddingDjSchemas(): ReactElement {
  const faqSchema = generateFAQSchema(
    austinWeddingDj.faqs.map((f) => ({ question: f.question, answer: f.answer }))
  );

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '[DJ_NAME]',
    jobTitle: 'Wedding DJ',
    description:
      'Austin-based wedding DJ specializing in ceremony music, cocktail hour, and reception sets.',
    url: 'https://partyondelivery.com/partners/austin-wedding-dj',
    image: `https://partyondelivery.com${austinWeddingDj.heroImageUrl ?? '/images/partners/austin-wedding-dj-hero.webp'}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Austin',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    areaServed: 'Austin, TX',
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://partyondelivery.com/partners/austin-wedding-dj#business',
    name: '[DJ_NAME] — Austin Wedding DJ',
    description:
      'Austin wedding DJ paired with TABC-licensed alcohol delivery from Party On Delivery.',
    url: 'https://partyondelivery.com/partners/austin-wedding-dj',
    telephone: '+1-737-371-9700',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Austin',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    areaServed: [
      { '@type': 'Place', name: 'Austin' },
      { '@type': 'Place', name: 'Lake Travis' },
      { '@type': 'Place', name: 'Texas Hill Country' },
    ],
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Wedding DJ + Bar Service',
    name: 'Austin Wedding DJ + Bar Service Bundle',
    provider: {
      '@type': 'LocalBusiness',
      name: '[DJ_NAME] × Party On Delivery',
    },
    areaServed: 'Austin, TX',
    description:
      'Wedding DJ for ceremony, cocktail hour, and reception, paired with TABC-licensed alcohol delivery.',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'USD',
      url: 'https://partyondelivery.com/partners/austin-wedding-dj#inquiry',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

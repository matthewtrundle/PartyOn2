import { generateFAQSchema } from '@/lib/seo/schemas';

/**
 * Server-side schemas for /austin-wedding-venue-boats.
 * EventVenue + LocalBusiness + FAQPage emitted as static JSON-LD so search
 * engines see them in initial HTML.
 */
export default function WeddingVenueBoatsSchemas() {
  const faqs = [
    {
      question: 'How small can a wedding on a Premier boat be?',
      answer:
        'As small as 2. Most micro-weddings on the lake run 20-40 guests; vow renewals and elopements run 8-15. Premier has boats sized for each.',
    },
    {
      question: 'How big can a wedding on a Premier boat be?',
      answer:
        'Up to roughly 80 guests on a single charter. Beyond that, we sometimes book two boats (one for the ceremony, one for the reception) docked side-by-side.',
    },
    {
      question: 'Are weddings on a Premier boat legal in Texas?',
      answer:
        'Yes. The captain can be ordained to officiate, or your own officiant can ride along. Marriage licenses are issued by the county, not the venue.',
    },
    {
      question: 'Who handles the bar?',
      answer:
        'Party On Delivery handles all alcohol. TABC-licensed, $1M insured. Premier doesn\'t sell alcohol on the boat — we deliver it to the marina and stock the boat before guests arrive.',
    },
    {
      question: 'How affordable is a Lake Travis wedding?',
      answer:
        'Ceremony-only charters start around $1,500 for the boat. Multi-event weekend packages (rehearsal + ceremony + brunch) start around $5,999. Smaller and less expensive than the typical Austin land venue.',
    },
  ];

  const faqSchema = generateFAQSchema(faqs);

  const venueSchema = {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    name: 'Austin Wedding Venue Boats (Premier Party Cruises × Party On Delivery)',
    description:
      'Lake Travis boats as wedding venue. Small, intimate, affordable ceremonies, rehearsal dinners, and brunch cruises paired with TABC-licensed alcohol delivery.',
    url: 'https://partyondelivery.com/austin-wedding-venue-boats',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Austin',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.3893,
      longitude: -97.9131,
    },
    maximumAttendeeCapacity: 80,
    suitableForEvent: ['Wedding', 'WeddingCeremony', 'WeddingReception', 'RehearsalDinner'],
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Party On Delivery',
    description:
      'TABC-licensed alcohol delivery for weddings, including coordinated bar service for Premier Party Cruises wedding charters on Lake Travis.',
    telephone: '+1-737-371-9700',
    url: 'https://partyondelivery.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Austin',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    areaServed: {
      '@type': 'Place',
      name: 'Austin metro area + Lake Travis',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
    </>
  );
}

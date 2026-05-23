import { generateFAQSchema, generateEventSchema } from '@/lib/seo/schemas';

/**
 * Server-side schemas for weddings page
 * Uses regular script tags (not Next.js Script component) to ensure schemas
 * are in initial HTML for search engine crawlers
 */
export default function WeddingsSchemas() {
  // FAQ Data for Schema — these Q&A pairs match the visible content
  // in the "Frequently Asked Questions" section of src/app/weddings/page.tsx.
  // Google requires FAQ schema to mirror visible page content; otherwise
  // the entire page can be disqualified from rich results.
  const faqs = [
    {
      question: "Do you provide bartenders?",
      answer: "Yes, via vetted TABC-certified partners for full-service packages."
    },
    {
      question: "How far in advance should we book?",
      answer: "72 hours minimum recommended; peak wedding dates fill fast."
    },
    {
      question: "Do you deliver to Lake Travis/Hill Country venues?",
      answer: "Yes, we specialize in Austin, Hill Country, and Lake Travis locations."
    },
    {
      question: "What about glassware & equipment?",
      answer: "Included with full-service packages; disposable upgrades available for delivery-only."
    },
    {
      question: "Are you licensed & insured?",
      answer: "Yes, fully licensed and insured for events."
    },
    {
      question: "Already have a bartender?",
      answer: "Perfect! Use our Delivery-Only option for curated alcohol delivery."
    }
  ];

  const faqSchema = generateFAQSchema(faqs);
  const eventSchema = generateEventSchema('wedding');

  return (
    <>
      {/* FAQ Schema - static HTML for crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Event Schema - static HTML for crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
    </>
  );
}

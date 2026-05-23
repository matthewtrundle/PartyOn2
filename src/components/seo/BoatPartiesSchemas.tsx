import { generateFAQSchema, generateEventSchema } from '@/lib/seo/schemas';

/**
 * Server-side schemas for boat-parties page
 * Uses regular script tags (not Next.js Script component) to ensure schemas
 * are in initial HTML for search engine crawlers
 */
export default function BoatPartiesSchemas() {
  // FAQ Data for Schema — these Q&A pairs match the visible content
  // in the "Frequently Asked Questions" section of src/app/boat-parties/page.tsx.
  // Google requires FAQ schema to mirror visible page content; otherwise
  // the entire page can be disqualified from rich results.
  const faqs = [
    {
      question: "Dock vs. boat delivery?",
      answer: "Both—we do slip handoffs or boat delivery to your anchored location."
    },
    {
      question: "How far ahead to book?",
      answer: "72 hours recommended; peak lake weekends fill fast."
    },
    {
      question: "Can you provide a bartender?",
      answer: "Yes for premium/yacht events via TABC-certified partners."
    },
    {
      question: "Glassware on the lake?",
      answer: "Boat-safe options available; disposables recommended for safety."
    },
    {
      question: "Only need ice & cans?",
      answer: "Use Order Now → Lake Day Essentials for quick delivery."
    },
    {
      question: "Are you insured/licensed?",
      answer: "Yes, fully insured and licensed for marine delivery."
    }
  ];

  const faqSchema = generateFAQSchema(faqs);
  const eventSchema = generateEventSchema('boat');

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

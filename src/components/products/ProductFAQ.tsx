import type { ReactElement } from 'react';
import { generateFAQSchema } from '@/lib/seo/schemas';

export interface ProductFAQItem {
  question: string;
  answer: string;
}

interface ProductFAQProps {
  faqs: ProductFAQItem[];
  /** Section heading. Defaults to a generic FAQ title. */
  heading?: string;
  /**
   * DOM id for the JSON-LD <script>. Keep unique per page so multiple
   * schema blocks never collide. Defaults to a stable product-faq id.
   */
  schemaId?: string;
}

/**
 * Reusable product FAQ section — the product-page counterpart to the blog
 * `BlogFAQ` (PR #117). Renders the visible Q&A **and** the matching
 * Schema.org `FAQPage` JSON-LD from a single `faqs` array, so the two can
 * never drift out of sync (Google rejects mismatched FAQ schema).
 *
 * Server component: the JSON-LD is a plain server-rendered <script>, so it
 * lands in the initial HTML that crawlers read — no client hydration needed.
 * Generalizes the per-product bespoke FAQ components (e.g. the old
 * PinthouseElectricJellyfishFAQ) into one component driven by data.
 */
export default function ProductFAQ({
  faqs,
  heading = 'Frequently Asked Questions',
  schemaId = 'product-faq-schema',
}: ProductFAQProps): ReactElement | null {
  if (!faqs?.length) return null;

  const faqSchema = generateFAQSchema(faqs);

  return (
    <>
      <script
        id={schemaId}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="py-16 px-4 md:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-8 tracking-[0.08em] text-center">
            {heading}
          </h2>

          <dl className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
              >
                <dt className="font-heading text-lg font-bold text-gray-900 mb-2 tracking-[0.05em]">
                  {faq.question}
                </dt>
                <dd className="text-base text-gray-700 leading-relaxed">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

import type { ReactElement } from 'react';
import type { MDXBlogFAQ } from '@/lib/blog-mdx';

interface BlogFAQProps {
  items: MDXBlogFAQ[];
}

/**
 * Visible FAQ section rendered below the blog article body.
 *
 * The same Q/A pairs are emitted as FAQPage JSON-LD at the page route.
 * Google rejects mismatched schema, so keep this component in sync with
 * the JSON-LD generator at the route.
 */
export default function BlogFAQ({ items }: BlogFAQProps): ReactElement | null {
  if (!items?.length) return null;

  return (
    <section
      aria-labelledby="blog-faq-heading"
      className="mt-12 pt-8 border-t border-gray-200"
    >
      <h2
        id="blog-faq-heading"
        className="font-heading text-2xl md:text-3xl text-gray-900 mb-6 tracking-[0.05em]"
      >
        Frequently Asked Questions
      </h2>
      <dl className="space-y-6">
        {items.map((item) => (
          <div key={item.q}>
            <dt className="font-heading text-lg font-bold text-gray-900 mb-2 tracking-[0.05em]">
              {item.q}
            </dt>
            <dd className="text-base text-gray-700 leading-relaxed">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

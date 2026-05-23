import type { ReactElement } from 'react';
import { getBlogCta } from '@/data/blog-topic-routing';
import BlogTopicCTAButton from './BlogTopicCTAButton';

interface BlogTopicCTAProps {
  slug: string;
}

/**
 * Renders a topic-aware CTA card at the end of a blog post body.
 *
 * Looks up the post's slug in src/data/blog-topic-routing.ts to pick
 * the right heading, body, button text, and destination href.
 * Falls back to the GENERIC CTA pointing at /order for unmapped slugs.
 *
 * The button is rendered via a separate client component so this
 * card stays server-rendered while still being able to fire a GA4
 * blog_cta_click event on click (see ga4-events.ts:trackBlogCtaClick).
 */
export default function BlogTopicCTA({ slug }: BlogTopicCTAProps): ReactElement {
  const cta = getBlogCta(slug);
  return (
    <section className="my-12 rounded-xl bg-gray-50 p-8 md:p-10">
      <h3 className="font-heading text-2xl tracking-[0.1em] text-gray-900 mb-3">
        {cta.heading}
      </h3>
      <p className="text-base text-gray-700 mb-6 leading-relaxed">
        {cta.body}
      </p>
      <BlogTopicCTAButton
        href={cta.href}
        slug={slug}
        topic={cta.topic}
        label={`${cta.buttonText} →`}
      />
    </section>
  );
}

'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { trackBlogCtaClick } from '@/lib/analytics/ga4-events';

interface BlogTopicCTAButtonProps {
  href: string;
  slug: string;
  topic: string;
  label: string;
}

/**
 * Client-component button used inside the server-rendered BlogTopicCTA.
 * Wraps a next/link with an onClick handler that fires a GA4 `blog_cta_click`
 * event so we can measure CTR per topic.
 */
export default function BlogTopicCTAButton({
  href,
  slug,
  topic,
  label,
}: BlogTopicCTAButtonProps): ReactElement {
  return (
    <Link
      href={href}
      onClick={() => trackBlogCtaClick(topic, slug, href)}
      className="btn-primary inline-block"
    >
      {label}
    </Link>
  );
}

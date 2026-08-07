/**
 * Link component with built-in GA4 CTA tracking
 * @module components/analytics/TrackedLink
 */

'use client';

import Link from 'next/link';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { trackCTAClick, type CtaSection } from '@/lib/analytics/ga4-events';

interface TrackedLinkProps {
  href: string;
  children: ReactNode;
  section: CtaSection;
  buttonText: string;
  className?: string;
  /** Inline styles for values Tailwind arbitrary classes can't express
      (e.g. rgba() with commas). */
  style?: CSSProperties;
}

/**
 * Link component that tracks clicks to GA4
 */
export default function TrackedLink({
  href,
  children,
  section,
  buttonText,
  className,
  style,
}: TrackedLinkProps): ReactElement {
  const handleClick = () => {
    trackCTAClick(buttonText, href, section);
  };

  return (
    <Link href={href} onClick={handleClick} className={className} style={style}>
      {children}
    </Link>
  );
}

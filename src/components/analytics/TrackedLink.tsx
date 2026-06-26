/**
 * Link component with built-in GA4 CTA tracking
 * @module components/analytics/TrackedLink
 */

'use client';

import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import { trackCTAClick, type CtaSection } from '@/lib/analytics/ga4-events';

interface TrackedLinkProps {
  href: string;
  children: ReactNode;
  section: CtaSection;
  buttonText: string;
  className?: string;
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
}: TrackedLinkProps): ReactElement {
  const handleClick = () => {
    trackCTAClick(buttonText, href, section);
  };

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}

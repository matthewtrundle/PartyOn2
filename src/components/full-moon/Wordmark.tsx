import Image from 'next/image';
import type { CSSProperties, ReactElement } from 'react';

interface WordmarkProps {
  /** Kept for call-site compatibility; both render the master logo. */
  variant?: 'horizontal' | 'stacked';
  /** Rendered height in px (width auto-scales). */
  height?: number;
  className?: string;
}

/**
 * The real Party On Delivery master logo (/images/pod-logo-2025.svg), rendered
 * white so it reads on the dark event page (the source logo is built for light
 * backgrounds). Decorative — the containing element supplies the accessible
 * label.
 */
export default function Wordmark({ height = 30, className }: WordmarkProps): ReactElement {
  const style: CSSProperties = {
    height,
    width: 'auto',
    // Force a crisp white silhouette of the master logo on the dark page.
    filter: 'brightness(0) invert(1)',
  };
  return (
    <Image
      src="/images/pod-logo-2025.svg"
      alt="Party On Delivery"
      width={Math.round(height * 3.6)}
      height={height}
      priority
      style={style}
      className={className}
    />
  );
}

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
 * The real Party On Delivery master logo (/images/pod-logo-2025.svg), in its
 * true brand colors. Decorative — the containing element supplies the
 * accessible label.
 */
export default function Wordmark({ height = 30, className }: WordmarkProps): ReactElement {
  const style: CSSProperties = {
    height,
    width: 'auto',
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

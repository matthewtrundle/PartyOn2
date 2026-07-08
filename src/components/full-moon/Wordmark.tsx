import type { CSSProperties, ReactElement } from 'react';

const HEADING_FONT = 'var(--font-barlow-condensed), sans-serif';

interface WordmarkProps {
  variant?: 'horizontal' | 'stacked';
  /** Rendered height in px (width auto-scales). */
  height?: number;
  className?: string;
}

/**
 * The Party On Delivery typographic wordmark as inline SVG: "PARTY ON" in white
 * with a yellow tick, "DELIVERY" in gold. Decorative — the containing element
 * supplies the accessible label. (Swap for the real master logo at launch.)
 */
export default function Wordmark({ variant = 'horizontal', height, className }: WordmarkProps): ReactElement {
  if (variant === 'stacked') {
    const style: CSSProperties = { height: height ?? 150, width: 'auto', display: 'block' };
    return (
      <svg viewBox="0 0 120 200" style={style} className={className} aria-hidden="true">
        <text x="60" y="58" textAnchor="middle" style={{ fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '0.08em', fontSize: 50 }} fill="#ffffff">
          PARTY
        </text>
        <text x="60" y="108" textAnchor="middle" style={{ fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '0.08em', fontSize: 50 }} fill="#F2D34F">
          ON
        </text>
        <text x="60" y="158" textAnchor="middle" style={{ fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '0.04em', fontSize: 34 }} fill="#D4AF37">
          DELIVERY
        </text>
      </svg>
    );
  }

  const style: CSSProperties = { height: height ?? 30, width: 'auto', display: 'block' };
  return (
    <svg viewBox="0 0 540 96" style={style} className={className} aria-hidden="true">
      <text x="0" y="56" textLength="246" lengthAdjust="spacingAndGlyphs" style={{ fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '0.10em', fontSize: 56 }} fill="#ffffff">
        PARTY ON
      </text>
      <rect x="256" y="24" width="6" height="40" fill="#F2D34F" />
      <text x="276" y="56" textLength="240" lengthAdjust="spacingAndGlyphs" style={{ fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '0.10em', fontSize: 56 }} fill="#D4AF37">
        DELIVERY
      </text>
    </svg>
  );
}

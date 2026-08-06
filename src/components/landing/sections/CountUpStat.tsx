'use client';

/**
 * Animated count-up for the trust-bar stat cards: "500+" climbs 0 → 500 when
 * scrolled into view. Watching the number accumulate makes scale feel earned
 * rather than asserted — the top trust-signal treatment for customers-served
 * / review-count metrics.
 *
 * Renders any stat string by splitting it into prefix + number + suffix
 * ("$0" → "$"+0, "5.0★" → 5.0+"★", "48-hr" → 48+"-hr"). Strings without a
 * number ("Free") render as-is. The final value always matches the config
 * string exactly — this animates real claims, it never invents numbers.
 *
 * Honors prefers-reduced-motion by rendering the final value immediately.
 */

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 1400;
const STAT_PATTERN = /^([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/;

type Props = {
  /** The stat exactly as configured, e.g. "500+", "5.0★", "$0", "48-hr". */
  stat: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function CountUpStat({ stat, className, style }: Props) {
  const match = stat.match(STAT_PATTERN);
  const target = match ? parseFloat(match[2].replace(/,/g, '')) : null;
  const decimals = match?.[2].includes('.')
    ? (match[2].split('.')[1]?.length ?? 0)
    : 0;
  const grouped = match?.[2].includes(',') ?? false;

  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState<number | null>(target === null ? null : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || target === null) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      setValue(target);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        let start: number | null = null;
        const tick = (now: number) => {
          if (start === null) start = now;
          const progress = Math.min((now - start) / DURATION_MS, 1);
          // Ease-out cubic: the last digits land slowly, which is what sells it.
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(target * eased);
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  // Non-numeric stat — render untouched.
  if (!match || target === null) {
    return (
      <span className={className} style={style}>
        {stat}
      </span>
    );
  }

  const shown = value ?? 0;
  const formatted = grouped
    ? Math.round(shown).toLocaleString('en-US')
    : shown.toFixed(decimals);

  return (
    // tabular-nums keeps the card from jittering while digits change width.
    <span
      ref={ref}
      className={className}
      style={{ ...style, fontVariantNumeric: 'tabular-nums' }}
    >
      {match[1]}
      {formatted}
      {match[3]}
    </span>
  );
}

import type { ReactElement, ReactNode } from 'react';
import styles from './full-moon.module.css';

interface NeonHaloProps {
  children: ReactNode;
  /** Stretch the halo (and its child) to full width — for stacked CTAs. */
  full?: boolean;
  className?: string;
}

/**
 * Wraps a primary CTA in the page's neon glow. The workhorse button inside
 * stays 100% POD-standard; the halo is the sanctioned event-page accent.
 */
export default function NeonHalo({ children, full = false, className }: NeonHaloProps): ReactElement {
  return (
    <span className={[styles.halo, full ? styles.haloFull : '', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}

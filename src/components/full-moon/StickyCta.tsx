'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Button from '@/components/Button';
import NeonHalo from './NeonHalo';
import { EVENT, SECTIONS } from './event';
import styles from './full-moon.module.css';

/**
 * Mobile-only sticky ticket bar (CSS shows it below 720px). Hidden near the top
 * (the hero has its own CTA); shows on scroll-down, hides on scroll-up.
 */
export default function StickyCta(): ReactElement {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = (): void => {
      const y = window.scrollY;
      if (y < window.innerHeight * 0.6) {
        setHidden(true);
        last = y;
        return;
      }
      if (y > last + 4) setHidden(false);
      else if (y < last - 4) setHidden(true);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={[styles.stickyCta, hidden ? styles.stickyHidden : ''].filter(Boolean).join(' ')}>
      <div className={styles.stickyPrice}>
        <span className={styles.stickyAmt}>${EVENT.price}</span>
        <span className={styles.stickyPer}>taco bar included</span>
      </div>
      <NeonHalo>
        <Button variant="cart" href={`#${SECTIONS.tickets}`} className="uppercase">
          Get Ticket
        </Button>
      </NeonHalo>
    </div>
  );
}

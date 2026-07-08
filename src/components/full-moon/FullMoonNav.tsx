'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';
import styles from './full-moon.module.css';
import Wordmark from './Wordmark';
import { SECTIONS } from './event';

const LINKS: { href: string; label: string }[] = [
  { href: `#${SECTIONS.included}`, label: "What's Included" },
  { href: `#${SECTIONS.schedule}`, label: 'Schedule' },
  { href: `#${SECTIONS.tickets}`, label: 'Tickets' },
  { href: `#${SECTIONS.gallery}`, label: 'Gallery' },
  { href: `#${SECTIONS.faq}`, label: 'FAQ' },
];

/**
 * Slim sticky header. Just the logo (centered on mobile) + section anchors on
 * desktop — the single "Get Your Ticket" CTA lives in the hero, above the fold.
 * Transparent over the hero, opaque with a blur after 60px of scroll.
 */
export default function FullMoonNav(): ReactElement {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={[styles.nav, scrolled ? styles.navScrolled : ''].filter(Boolean).join(' ')}>
      <div className={styles.navInner}>
        <Link href={`#${SECTIONS.top}`} aria-label="Party On Delivery" style={{ display: 'flex', flexShrink: 0 }}>
          <Wordmark height={26} />
        </Link>
        <nav className={styles.navLinks}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

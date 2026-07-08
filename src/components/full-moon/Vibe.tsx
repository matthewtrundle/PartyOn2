'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import ImageSlot from './ImageSlot';
import { SECTIONS, VIBE_LINES, VIBE_PHOTO } from './event';
import styles from './full-moon.module.css';

/**
 * "The Night" — large prose lines that light from dim to white as each scrolls
 * into view, followed by a twilight photo that reveals.
 */
export default function Vibe(): ReactElement {
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = proseRef.current?.querySelectorAll<HTMLElement>('[data-vibe-line]');
    if (!lines) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add(styles.vibeLit);
        });
      },
      { threshold: 0.6 },
    );
    lines.forEach((line) => io.observe(line));
    return () => io.disconnect();
  }, []);

  return (
    <Section id={SECTIONS.vibe}>
      <p className={[styles.eyebrow, styles.eyebrowNeon].join(' ')}>The Night</p>
      <div className={styles.vibeProse} ref={proseRef}>
        {VIBE_LINES.map((line, i) => (
          <div key={i} className={styles.vibeLine} data-vibe-line>
            {line.text}
            {line.accent ? <span className={styles.vibeAccent}>{line.accent}</span> : null}
            {line.tail ?? null}
          </div>
        ))}
      </div>
      <ScrollReveal>
        <div className={styles.vibePhoto}>
          <ImageSlot src={VIBE_PHOTO.src} alt={VIBE_PHOTO.alt} sizes="(max-width: 900px) 100vw, 1100px" />
        </div>
      </ScrollReveal>
    </Section>
  );
}

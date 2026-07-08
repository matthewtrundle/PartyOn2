'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Image from 'next/image';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import ImageSlot from './ImageSlot';
import { GALLERY, SECTIONS } from './event';
import styles from './full-moon.module.css';

/** "Nights on the water" gallery with a click-to-enlarge lightbox. */
export default function Gallery(): ReactElement {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  return (
    <Section id={SECTIONS.gallery}>
      <ScrollReveal>
        <p className={[styles.eyebrow, styles.eyebrowNeon].join(' ')}>Premier Party Cruises</p>
      </ScrollReveal>
      <ScrollReveal>
        <h2 className={styles.sectionTitle}>OTHER PREMIER PARTIES.</h2>
      </ScrollReveal>
      <ScrollReveal>
        <span className={styles.ruleNeon} />
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.galleryGrid}>
          {GALLERY.map((item, i) => {
            const src = item.src;
            return (
              <div
                key={i}
                className={[
                  styles.gphoto,
                  item.wide ? styles.gphotoWide : '',
                  item.tall ? styles.gphotoTall : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <ImageSlot
                  src={src}
                  alt={item.alt}
                  sizes="(max-width: 980px) 50vw, 25vw"
                  onClick={src ? () => setLightbox({ src, alt: item.alt }) : undefined}
                />
              </div>
            );
          })}
        </div>
      </ScrollReveal>

      {lightbox ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo"
          onClick={() => setLightbox(null)}
        >
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setLightbox(null)}>
            &times;
          </button>
          <Image
            src={lightbox.src}
            alt={lightbox.alt}
            width={1600}
            height={1200}
            sizes="92vw"
            style={{ width: 'auto', height: 'auto', maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 12 }}
          />
        </div>
      ) : null}
    </Section>
  );
}

'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import styles from './full-moon.module.css';
import ImageSlot from './ImageSlot';
import { Icon } from './icons';
import { CAROUSEL } from './event';
import { useReducedMotion } from './useReducedMotion';

const DELAY = 4200;

/** Auto-advancing hero image carousel with crossfade, hover-pause, arrows + dots. */
export default function HeroCarousel(): ReactElement {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const hovering = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      if (!hovering.current) setActive((i) => (i + 1) % CAROUSEL.length);
    }, DELAY);
    return () => clearInterval(timer);
  }, [reduced]);

  const go = (n: number): void => setActive((n + CAROUSEL.length) % CAROUSEL.length);

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => {
        hovering.current = true;
      }}
      onMouseLeave={() => {
        hovering.current = false;
      }}
    >
      {CAROUSEL.map((slide, i) => (
        <div
          key={slide.step}
          className={[styles.hcSlide, i === active ? styles.hcSlideActive : ''].filter(Boolean).join(' ')}
          aria-hidden={i !== active}
        >
          <ImageSlot
            src={slide.src}
            alt={slide.alt}
            placeholderLabel={slide.caption}
            priority={i === 0}
            sizes="(max-width: 900px) 100vw, 45vw"
          />
          <span className={styles.hcCap}>
            <span className={styles.hcStep}>{slide.step}</span>
            {slide.caption}
          </span>
        </div>
      ))}

      <button
        type="button"
        className={[styles.hcArrow, styles.hcPrev].join(' ')}
        aria-label="Previous slide"
        onClick={() => go(active - 1)}
      >
        <Icon name="chevronLeft" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={[styles.hcArrow, styles.hcNext].join(' ')}
        aria-label="Next slide"
        onClick={() => go(active + 1)}
      >
        <Icon name="chevronRight" strokeWidth={2} />
      </button>

      <div className={styles.hcDots} role="tablist" aria-label="Choose slide">
        {CAROUSEL.map((slide, i) => (
          <button
            type="button"
            key={slide.step}
            role="tab"
            aria-selected={i === active}
            aria-label={`Slide ${i + 1}`}
            className={[styles.hcDot, i === active ? styles.hcDotOn : ''].filter(Boolean).join(' ')}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

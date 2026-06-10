'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import styles from './AnimatedHeroText.module.css';

interface AnimatedHeroTextProps {
  drinks: string[];
  destinations: string[];
  drinkIntervalMs?: number;
  transitionMs?: number;
}

export default function AnimatedHeroText({
  drinks,
  destinations,
  drinkIntervalMs = 3600,
  transitionMs = 1200,
}: AnimatedHeroTextProps) {
  const [drinkIndex, setDrinkIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(0);

  useEffect(() => {
    const i = setInterval(
      () => setDrinkIndex((p) => (p + 1) % drinks.length),
      drinkIntervalMs
    );
    return () => clearInterval(i);
  }, [drinks.length, drinkIntervalMs]);

  useEffect(() => {
    const i = setInterval(
      () => setDestIndex((p) => (p + 1) % destinations.length),
      drinkIntervalMs + 200
    );
    return () => clearInterval(i);
  }, [destinations.length, drinkIntervalMs]);

  const longestDrink = drinks.reduce((a, b) => (a.length >= b.length ? a : b), '');
  const longestDest = destinations.reduce((a, b) => (a.length >= b.length ? a : b), '');

  const slotStyle = { '--hero-word-duration': `${transitionMs}ms` } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold tracking-[0.02em] text-center lg:text-left leading-[1.15]"
    >
      <span className="block">
        <span className={styles.slot} style={slotStyle}>
          <span className={styles.sizer} aria-hidden="true">{longestDrink}</span>
          <span
            key={`drink-${drinkIndex}`}
            className={`${styles.word} ${styles.fromRight} text-brand-yellow`}
          >
            {drinks[drinkIndex]}
          </span>
        </span>
      </span>

      <span className="block text-white">delivered cold</span>
      <span className="block text-white">&amp; on time to your</span>

      <span className="block">
        <span className={styles.slot} style={slotStyle}>
          <span className={styles.sizer} aria-hidden="true">{longestDest}</span>
          <span
            key={`dest-${destIndex}`}
            className={`${styles.word} ${styles.fromLeft} text-brand-yellow`}
          >
            {destinations[destIndex]}
          </span>
        </span>
      </span>
    </div>
  );
}

'use client';

import type { ReactElement } from 'react';
import Button from '@/components/Button';
import styles from './full-moon.module.css';
import NeonHalo from './NeonHalo';
import HeroCarousel from './HeroCarousel';
import { DATESTAMP, HERO, SECTIONS } from './event';

interface HeroProps {
  /** Primary "Get Your Ticket" action (the ticket seam). */
  onGetTicket: () => void;
}

/** The hero: copy stack + datestamp + CTAs on the left, image carousel on the right. */
export default function Hero({ onGetTicket }: HeroProps): ReactElement {
  return (
    <section className={styles.hero} id={SECTIONS.top}>
      <div className="container-custom" style={{ width: '100%' }}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent} data-fm-parallax="content">
            <p className={[styles.eyebrow, styles.eyebrowNeon].join(' ')}>{HERO.eyebrow}</p>
            <h1 className={styles.heroTitle}>
              {HERO.headlineLead}
              <br />
              <span className={styles.heroGlow}>{HERO.headlineGlow}</span>
            </h1>
            <p className={styles.heroSub}>{HERO.sub}</p>

            <div className={styles.datestamp}>
              {DATESTAMP.map((cell) => (
                <div key={cell.key} className={styles.dsCell}>
                  <span className={styles.dsKey}>{cell.key}</span>
                  <span className={styles.dsVal}>
                    {cell.value}
                    {cell.suffix ? <small>{cell.suffix}</small> : null}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.heroCta}>
              <NeonHalo>
                <Button variant="cart" size="lg" onClick={onGetTicket} className="uppercase">
                  {HERO.primaryCta}
                </Button>
              </NeonHalo>
              <a className={styles.ghostNeon} href={`#${SECTIONS.vibe}`}>
                {HERO.secondaryCta}
              </a>
            </div>
          </div>

          <div className={styles.heroMedia} data-fm-parallax="media">
            <HeroCarousel />
          </div>
        </div>
      </div>

      <a className={styles.scrollInd} href={`#${SECTIONS.facts}`} aria-label="Scroll down">
        <span className={styles.mouse} />
        <span>Scroll</span>
      </a>
    </section>
  );
}

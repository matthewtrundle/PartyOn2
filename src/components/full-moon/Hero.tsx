'use client';

import type { ReactElement } from 'react';
import Button from '@/components/Button';
import styles from './full-moon.module.css';
import NeonHalo from './NeonHalo';
import Wordmark from './Wordmark';
import HeroCarousel from './HeroCarousel';
import { DATESTAMP, HERO, SECTIONS } from './event';

interface HeroProps {
  /** Primary "Get Your Ticket" action (opens the purchase form). */
  onGetTicket: () => void;
}

/** The hero: copy stack + datestamp + single CTA (with logo), and the carousel. */
export default function Hero({ onGetTicket }: HeroProps): ReactElement {
  return (
    <section className={styles.hero} id={SECTIONS.top}>
      <div className="container-custom" style={{ width: '100%' }}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent} data-fm-parallax="content">
            <h1 className={styles.heroTitle}>
              {HERO.headlineLines.map((line, i) => (
                <span key={line}>
                  {i > 0 ? <br /> : null}
                  {i === HERO.glowLine ? <span className={styles.heroGlow}>{line}</span> : line}
                </span>
              ))}
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
              <span className={styles.heroCtaLogo} aria-hidden="true">
                <Wordmark height={34} />
              </span>
              <NeonHalo>
                <Button variant="cart" size="lg" onClick={onGetTicket} className="uppercase">
                  {HERO.primaryCta}
                </Button>
              </NeonHalo>
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

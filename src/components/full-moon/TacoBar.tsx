import type { ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ImageSlot from './ImageSlot';
import { TACO } from './event';
import styles from './full-moon.module.css';

/** The taco-bar section — the brightest, warmest moment in the lower half of the page. */
export default function TacoBar(): ReactElement {
  return (
    <section className={[styles.section, styles.taco].join(' ')}>
      <div className={styles.tacoGlow} aria-hidden="true" />
      <div className="container-custom">
        <div className={styles.tacoGrid}>
          <ScrollReveal>
            <div className={styles.tacoPhoto}>
              <ImageSlot src={TACO.src} alt={TACO.alt} sizes="(max-width: 980px) 100vw, 55vw" />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <div>
              <span className={styles.inclTag}>{TACO.tag}</span>
              <h2 className={styles.tacoTitle}>
                {TACO.headlineLead}
                <br />
                {TACO.headlineTail}
              </h2>
              <p className={styles.tacoLead}>{TACO.body}</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

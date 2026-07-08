import type { ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { BOARD_BRING, BOARD_INCLUDED, EVENT, SECTIONS } from './event';
import styles from './full-moon.module.css';

/** "What's on board" — one tile, two lists: what's included and what to bring. */
export default function WhatsIncluded(): ReactElement {
  return (
    <Section id={SECTIONS.included}>
      <ScrollReveal>
        <p className={[styles.eyebrow, styles.eyebrowNeon].join(' ')}>Every ticket, ${EVENT.price}</p>
      </ScrollReveal>
      <ScrollReveal>
        <h2 className={styles.sectionTitle}>WHAT&rsquo;S ON BOARD.</h2>
      </ScrollReveal>
      <ScrollReveal>
        <span className={styles.ruleYellow} />
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.boardTile}>
          <div className={styles.boardCol}>
            <h3 className={styles.boardColTitle}>What&rsquo;s included</h3>
            <ul className={styles.boardList}>
              {BOARD_INCLUDED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.boardCol}>
            <h3 className={styles.boardColTitle}>What to bring</h3>
            <ul className={styles.boardList}>
              {BOARD_BRING.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}

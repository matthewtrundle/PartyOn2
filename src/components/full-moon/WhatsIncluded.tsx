import type { ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { Icon } from './icons';
import { EVENT, INCLUDED, SECTIONS } from './event';
import styles from './full-moon.module.css';

/** "What's on board" — the six things every $69 ticket includes; the taco bar is featured. */
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

      <div className={styles.incGrid}>
        {INCLUDED.map((item, i) => (
          <ScrollReveal key={item.title} delay={(i % 3) * 0.08}>
            <div className={styles.inc}>
              <span className={styles.badgeIc}>
                <Icon name={item.icon} strokeWidth={1.7} />
              </span>
              <h4 className={styles.incTitle}>{item.title}</h4>
              <p className={styles.incBody}>{item.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

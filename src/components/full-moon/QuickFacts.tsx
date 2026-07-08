import type { ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { Icon } from './icons';
import styles from './full-moon.module.css';
import { FACTS, SECTIONS } from './event';

/** Four quick-fact cards under the hero. */
export default function QuickFacts(): ReactElement {
  return (
    <Section id={SECTIONS.facts} tight>
      <div className={styles.factsGrid}>
        {FACTS.map((fact, i) => (
          <ScrollReveal key={fact.title} delay={i * 0.08}>
            <div className={styles.fact}>
              <span className={styles.factIc}>
                <Icon name={fact.icon} />
              </span>
              <h4 className={styles.factTitle}>{fact.title}</h4>
              <p className={styles.factBody}>{fact.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

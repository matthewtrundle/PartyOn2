import type { ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { SAFETY } from './event';
import styles from './full-moon.module.css';

/** A prominent "get home safe" note + the Fetii group-ride discount. */
export default function SafetyNote(): ReactElement {
  return (
    <Section tight>
      <ScrollReveal>
        <div className={styles.safety}>
          <p className={styles.safetyTitle}>{SAFETY.title}</p>
          <p className={styles.safetyBody}>{SAFETY.body}</p>
          <p className={styles.safetyBody}>
            {SAFETY.fetiiLead} <strong>{SAFETY.fetiiPartner}</strong> {SAFETY.fetiiMid}{' '}
            <span className={styles.safetyCode}>{SAFETY.fetiiCode}</span> {SAFETY.fetiiTail}
          </p>
        </div>
      </ScrollReveal>
    </Section>
  );
}

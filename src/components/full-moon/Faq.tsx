'use client';

import { useState, type ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { Icon } from './icons';
import { FAQS, SECTIONS } from './event';
import styles from './full-moon.module.css';

/** FAQ accordion — the neon + rotates to an × when a row is open; multiple may be open. */
export default function Faq(): ReactElement {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number): void =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Section id={SECTIONS.faq}>
      <ScrollReveal>
        <p className={[styles.eyebrow, styles.eyebrowNeon].join(' ')}>Good to know</p>
      </ScrollReveal>
      <ScrollReveal>
        <h2 className={styles.sectionTitle}>QUESTIONS, ANSWERED.</h2>
      </ScrollReveal>
      <ScrollReveal>
        <span className={styles.ruleYellow} />
      </ScrollReveal>

      <div className={styles.faqList}>
        {FAQS.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <ScrollReveal key={item.q}>
              <div className={styles.faqItem}>
                <button type="button" className={styles.faqQ} aria-expanded={isOpen} onClick={() => toggle(i)}>
                  {item.q}
                  <span className={[styles.chev, isOpen ? styles.chevOpen : ''].filter(Boolean).join(' ')} aria-hidden="true">
                    <Icon name="plus" strokeWidth={2} />
                  </span>
                </button>
                <div className={styles.faqA} style={{ maxHeight: isOpen ? 500 : 0 }}>
                  <div className={styles.faqAInner}>{item.a}</div>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}

import type { CSSProperties, ReactElement } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { SCHEDULE, SECTIONS } from './event';
import styles from './full-moon.module.css';

/** The 8-11 PM cruise timeline — horizontal on desktop, vertical on mobile. */
export default function ScheduleTimeline(): ReactElement {
  return (
    <Section id={SECTIONS.schedule}>
      <ScrollReveal>
        <p className={[styles.eyebrow, styles.eyebrowNeon].join(' ')}>How the night unfolds</p>
      </ScrollReveal>
      <ScrollReveal>
        <h2 className={styles.sectionTitle}>FROM GOLDEN HOUR TO MOONLIGHT.</h2>
      </ScrollReveal>
      <ScrollReveal>
        <span className={styles.ruleNeon} />
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.timeline}>
          <div className={styles.timelineBar} aria-hidden="true" />
          <div className={styles.timelineTrack}>
            {SCHEDULE.map((stop) => (
              <div
                key={stop.time}
                className={[styles.tlStop, stop.moonlight ? styles.tlMoonlight : ''].filter(Boolean).join(' ')}
                style={{ '--sky-c': stop.skyColor } as CSSProperties}
              >
                <span className={styles.tlDot} />
                <span className={styles.tlTime}>{stop.time}</span>
                <span className={styles.tlLabel}>{stop.label}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}

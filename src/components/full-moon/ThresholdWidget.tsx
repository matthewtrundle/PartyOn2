'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import Button from '@/components/Button';
import Section from './Section';
import NeonHalo from './NeonHalo';
import { EVENT, SECTIONS, THRESHOLD } from './event';
import { fireConfetti } from './confetti';
import { useReducedMotion } from './useReducedMotion';
import styles from './full-moon.module.css';

interface ThresholdWidgetProps {
  onGetTicket: () => void;
}

type TicketState = 'working' | 'met' | 'cancelled';

/**
 * The ticket-threshold widget. Reads the live sold count from
 * /api/v1/full-moon/count and flips from "filling up" to "we're sailing" once
 * the 32-guest minimum is met. There is no hard cap — sales can exceed 50.
 * (`THRESHOLD.state === 'cancelled'` is a manual override for a postponed date.)
 */
export default function ThresholdWidget({ onGetTicket }: ThresholdWidgetProps): ReactElement {
  const { capacity, minimum } = EVENT;
  const [sold, setSold] = useState(THRESHOLD.sold);
  const [inView, setInView] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const confettiFired = useRef(false);
  const reduced = useReducedMotion();

  const forcedCancelled = THRESHOLD.state === 'cancelled';
  const state: TicketState = forcedCancelled ? 'cancelled' : sold >= minimum ? 'met' : 'working';
  const pct = Math.min(100, Math.round((sold / capacity) * 100));
  const markerPct = Math.round((minimum / capacity) * 100);
  const toGo = Math.max(0, minimum - sold);

  // Live count.
  useEffect(() => {
    let active = true;
    fetch('/api/v1/full-moon/count')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && typeof data.sold === 'number') setSold(data.sold);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Reveal → animate the bar into place.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (inView) setFillPct(pct);
  }, [inView, pct]);

  // Celebrate the moment the minimum is met (once).
  useEffect(() => {
    if (inView && state === 'met' && !reduced && !confettiFired.current && cardRef.current) {
      confettiFired.current = true;
      fireConfetti(cardRef.current, 26, 30);
    }
  }, [inView, state, reduced]);

  const eyebrow = state === 'met' ? "We're sailing" : state === 'cancelled' ? 'Postponed' : 'Filling up';
  const cardClass = [
    styles.threshold,
    state === 'met' ? styles.thresholdMet : '',
    state === 'cancelled' ? styles.thresholdCancelled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Section id={SECTIONS.tickets}>
      <div className={styles.thresholdWrap}>
        <div ref={cardRef} className={cardClass}>
          <p className={[styles.eyebrow, styles.eyebrowNeon, styles.statusEyebrow].join(' ')}>
            <span className={styles.statusDot} aria-hidden="true" />
            {eyebrow}
          </p>

          <div className={styles.count}>
            {sold}
            <span className={styles.countSep}> / </span>
            <span className={styles.countTotal}>{capacity}</span>
          </div>

          <p className={styles.subline}>
            {state === 'working' && (
              <>
                <strong>{toGo} more guests</strong> and we cast off under the full moon.
              </>
            )}
            {state === 'met' && (
              <>
                <strong>Minimum met.</strong> The {EVENT.dateLabel} full moon cruise is officially a go.
              </>
            )}
            {state === 'cancelled' && (
              <>
                This date didn&rsquo;t reach our {minimum}-guest minimum, so we&rsquo;re rolling it forward.{' '}
                <strong>Every ticket is fully refunded</strong> &mdash; no action needed.
              </>
            )}
          </p>

          <div className={styles.progress}>
            <div className={styles.fill} style={{ width: `${fillPct}%` }} />
            <div className={styles.marker} style={{ left: `${markerPct}%` }}>
              <span className={styles.markerLabel}>MIN</span>
            </div>
          </div>
          <div className={styles.legend}>
            <span>Min to sail: {minimum}</span>
            <span>Boat capacity: {capacity}</span>
          </div>

          <div className={styles.ctaLine}>
            {state === 'cancelled' ? (
              <a className={styles.ghostNeon} href={`#${SECTIONS.top}`}>
                See the Next Full Moon
              </a>
            ) : (
              <NeonHalo>
                <Button variant="cart" size="lg" onClick={onGetTicket} className="uppercase">
                  {state === 'met' ? 'Grab a Remaining Spot' : 'Claim Your Spot'} &mdash; ${EVENT.price}
                </Button>
              </NeonHalo>
            )}
          </div>

          <p className={styles.thresholdHelper}>
            If we don&rsquo;t reach {minimum} guests {EVENT.deadlineDays} days out, the cruise rolls to the next full
            moon and every ticket is refunded in full.
          </p>
        </div>
      </div>
    </Section>
  );
}

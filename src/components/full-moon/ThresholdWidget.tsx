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
 * the 32-guest minimum is met (no hard cap). Includes a "see guest list" toggle
 * that shows who has already bought (first name + last initial).
 */
export default function ThresholdWidget({ onGetTicket }: ThresholdWidgetProps): ReactElement {
  const { capacity, minimum } = EVENT;
  const [sold, setSold] = useState(THRESHOLD.sold);
  // Authoritative widget state from the live count endpoint (null until loaded).
  const [serverState, setServerState] = useState<TicketState | null>(null);
  const [inView, setInView] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guests, setGuests] = useState<string[] | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const confettiFired = useRef(false);
  const reduced = useReducedMotion();

  // Prefer the live server state (which already folds in the postponed flag);
  // fall back to the static snapshot / local derivation before it loads.
  const state: TicketState =
    serverState ?? (THRESHOLD.state === 'cancelled' ? 'cancelled' : sold >= minimum ? 'met' : 'working');
  const pct = Math.min(100, Math.round((sold / capacity) * 100));
  const markerPct = Math.round((minimum / capacity) * 100);
  const toGo = Math.max(0, minimum - sold);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/full-moon/count')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (typeof data.sold === 'number') setSold(data.sold);
        if (data.state === 'working' || data.state === 'met' || data.state === 'cancelled') {
          setServerState(data.state);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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

  useEffect(() => {
    if (inView && state === 'met' && !reduced && !confettiFired.current && cardRef.current) {
      confettiFired.current = true;
      fireConfetti(cardRef.current, 26, 30);
    }
  }, [inView, state, reduced]);

  const toggleGuests = (): void => {
    const next = !guestsOpen;
    setGuestsOpen(next);
    if (next && guests === null) {
      fetch('/api/v1/full-moon/guests')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setGuests(Array.isArray(data?.guests) ? data.guests : []))
        .catch(() => setGuests([]));
    }
  };

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
          <p className={styles.statusEyebrow}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span className={styles.statusBig}>{eyebrow}</span>
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

          <button type="button" className={styles.guestToggle} onClick={toggleGuests} aria-expanded={guestsOpen}>
            {guestsOpen ? 'Hide guest list' : 'See guest list'}
          </button>
          {guestsOpen ? (
            <div className={styles.guestList}>
              {guests === null ? (
                <p className={styles.guestEmpty}>Loading&hellip;</p>
              ) : guests.length === 0 ? (
                <p className={styles.guestEmpty}>No guests yet &mdash; be the first aboard!</p>
              ) : (
                <ul>
                  {guests.map((g, i) => (
                    <li key={`${g}-${i}`}>{g}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <p className={styles.thresholdHelper}>
            If we don&rsquo;t reach {minimum} guests {EVENT.deadlineDays} days out, the cruise rolls to the next full
            moon and every ticket is refunded in full.
          </p>
        </div>
      </div>
    </Section>
  );
}

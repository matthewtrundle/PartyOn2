'use client';

import type { ReactElement } from 'react';
import Image from 'next/image';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import { Icon } from './icons';
import { useFullMoonUI } from './ui-context';
import { EVENT } from './event';
import styles from './full-moon.module.css';
import overlay from './full-moon-overlays.module.css';

const SEATS: { label: string; open?: boolean }[] = [
  { label: 'A' },
  { label: 'J' },
  { label: 'M' },
  { label: '+' },
  { label: '?', open: true },
];

/** The inline "bring your crew" moment over a partygoers backdrop. */
export default function ShareInline(): ReactElement {
  const { openShare } = useFullMoonUI();

  return (
    <Section tight>
      <ScrollReveal>
        <div className={overlay.shareInline}>
          <Image
            src="/images/boat-heroes/boat-party-epic-night.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 900px) 100vw, 1100px"
            className={overlay.siBg}
            style={{ objectFit: 'cover' }}
          />
          <div className={overlay.siOverlay} aria-hidden="true" />
          <div className={overlay.siInner}>
            <div className={overlay.siCopy}>
              <p className={[styles.eyebrow, overlay.siEyebrow].join(' ')}>The boat holds {EVENT.capacity}</p>
              <h3 className={overlay.siHeading}>Bring your people.</h3>
              <p className={overlay.siBody}>
                This is better with your crew on deck. We need {EVENT.minimum} to sail — send the invite and fill the
                boat with {EVENT.capacity} of your soon-to-be favorite people.
              </p>
            </div>
            <div className={overlay.siActions}>
              <div className={overlay.seatRow} aria-hidden="true">
                {SEATS.map((seat, i) => (
                  <span key={i} className={[overlay.seat, seat.open ? overlay.seatOpen : overlay.seatFilled].join(' ')}>
                    {seat.label}
                  </span>
                ))}
              </div>
              <button type="button" className={overlay.chipShare} onClick={openShare}>
                <Icon name="share" strokeWidth={1.6} />
                Share the Night
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}

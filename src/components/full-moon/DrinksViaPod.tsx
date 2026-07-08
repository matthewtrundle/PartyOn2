import type { ReactElement } from 'react';
import Image from 'next/image';
import Button from '@/components/Button';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Section from './Section';
import Wordmark from './Wordmark';
import { DRINKS, EVENT } from './event';
import styles from './full-moon.module.css';

/**
 * The "drinks, order ahead" card — POD's own product plug over a bar/party
 * backdrop. Blue (secondary) CTA so it stays subordinate to the ticket CTA.
 */
export default function DrinksViaPod(): ReactElement {
  return (
    <Section>
      <ScrollReveal>
        <div className={styles.drinksCard}>
          <Image
            src="/images/hero/hero-drink-skyline.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 980px) 100vw, 1100px"
            className={styles.drinksBg}
            style={{ objectFit: 'cover' }}
          />
          <div className={styles.drinksOverlay} aria-hidden="true" />
          <div className={styles.drinksInner}>
            <div>
              <h2 className={styles.drinksTitle}>
                {DRINKS.headlineLead}
                <br />
                {DRINKS.headlineTail}
              </h2>
              <p className={styles.drinksBody}>{DRINKS.body}</p>
              <div style={{ marginTop: 24 }}>
                <Button variant="primary" size="lg" href={EVENT.ordersUrl} className="uppercase">
                  {DRINKS.cta} &rarr;
                </Button>
              </div>
            </div>
          </div>
          <div className={styles.podCorner} aria-hidden="true">
            <Wordmark height={120} className={styles.podCornerLogo} />
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}

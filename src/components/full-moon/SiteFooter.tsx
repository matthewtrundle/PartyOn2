import type { ReactElement } from 'react';
import Link from 'next/link';
import { FOOTER } from './event';
import styles from './full-moon.module.css';

/** Co-branded footer — reads as a POD product, with Premier Party Cruises secondary. */
export default function SiteFooter(): ReactElement {
  return (
    <footer className={styles.foot}>
      <div className="container-custom">
        <div className={styles.footTop}>
          <div className={styles.editorialLine}>{FOOTER.editorial}</div>
          <div className={styles.cobrand}>
            A <strong>Party On Delivery</strong> event
            <br />
            on the water with <strong>Premier Party Cruises</strong>
            <br />
            Lake Travis &middot; Austin, TX
          </div>
        </div>
        <div className={styles.footLegal}>
          <span>{FOOTER.legal}</span>
          <span>
            <Link href="/full-moon-terms" className={styles.footTermsLink}>
              Event terms
            </Link>
          </span>
          <span>{FOOTER.legalNote}</span>
        </div>
      </div>
    </footer>
  );
}

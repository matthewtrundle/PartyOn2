'use client';

import type { ReactElement } from 'react';
import { Icon } from './icons';
import { useFullMoonUI } from './ui-context';
import styles from './full-moon-overlays.module.css';

/** Always-accessible floating share button. */
export default function FabShare(): ReactElement {
  const { openShare } = useFullMoonUI();
  return (
    <button type="button" className={styles.fabShare} onClick={openShare} aria-label="Share the Full Moon Party">
      <span className={styles.fabLabel}>Share the night</span>
      <Icon name="share" strokeWidth={1.7} />
    </button>
  );
}

'use client';

import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './icons';
import { useFullMoonUI } from './ui-context';
import styles from './full-moon-overlays.module.css';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/** Small check-icon toast for copy/share confirmations. */
export default function Toast(): ReactElement {
  const { toast } = useFullMoonUI();
  return (
    <div className={styles.toastWrap}>
      <AnimatePresence>
        {toast ? (
          <motion.div
            className={styles.toast}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <Icon name="check" strokeWidth={2} />
            <span>{toast}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

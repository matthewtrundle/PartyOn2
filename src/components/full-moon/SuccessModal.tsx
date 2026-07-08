'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/components/Button';
import NeonHalo from './NeonHalo';
import { useFullMoonUI } from './ui-context';
import { useReducedMotion } from './useReducedMotion';
import { fireConfetti } from './confetti';
import { EVENT } from './event';
import base from './full-moon.module.css';
import styles from './full-moon-overlays.module.css';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/**
 * Post-purchase confirmation with a share prompt. Opens from the ticket seam
 * (`onGetTicket`); in production this becomes the real post-checkout screen.
 */
export default function SuccessModal(): ReactElement {
  const { successOpen, closeSuccess, openShare } = useFullMoonUI();
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (successOpen && cardRef.current && !reduced) fireConfetti(cardRef.current, 22, 18);
  }, [successOpen, reduced]);

  useEffect(() => {
    if (!successOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSuccess();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [successOpen, closeSuccess]);

  const inviteCrew = (): void => {
    closeSuccess();
    openShare();
  };

  return (
    <AnimatePresence>
      {successOpen ? (
        <motion.div
          className={styles.successScrim}
          onClick={closeSuccess}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <motion.div
            ref={cardRef}
            className={styles.successCard}
            role="dialog"
            aria-modal="true"
            aria-label="You're on the boat"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <button type="button" className={styles.sheetX} aria-label="Close" onClick={closeSuccess}>
              &times;
            </button>
            <div className={styles.sMoon} aria-hidden="true" />
            <p className={[base.eyebrow, styles.sEyebrow].join(' ')}>You&rsquo;re on the boat</p>
            <h2 className={styles.sTitle}>
              SEE YOU UNDER
              <br />
              THE FULL MOON.
            </h2>
            <p className={styles.sSub}>
              Your spot for {EVENT.dateLabel} is locked. A confirmation and the marina pin are on the way by text.
            </p>
            <div className={styles.sPrompt}>
              <div className={styles.sPq}>Now fill the deck.</div>
              <div className={styles.sPp}>
                We sail once we hit {EVENT.minimum} guests. Bring a friend and you lock in the cruise faster — the night
                is better with your people anyway.
              </div>
            </div>
            <div className={styles.sActions}>
              <NeonHalo full>
                <Button variant="cart" fullWidth onClick={inviteCrew} className="uppercase">
                  Invite Your Crew
                </Button>
              </NeonHalo>
            </div>
            <p className={styles.sMini}>
              or{' '}
              <button type="button" onClick={closeSuccess}>
                keep browsing the night
              </button>
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

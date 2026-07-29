'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/components/Button';
import NeonHalo from './NeonHalo';
import { useFullMoonUI } from './ui-context';
import { EVENT, MAX_TICKETS_PER_ORDER, ticketTotals } from './event';
import base from './full-moon.module.css';
import styles from './full-moon-overlays.module.css';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/**
 * The ticket purchase form. Collects buyer details + quantity, then POSTs to
 * /api/v1/full-moon/ticket and redirects to Stripe Checkout. When ticketing is
 * flagged off, the endpoint 403s and we show a friendly "not on sale yet" note.
 */
export default function TicketModal(): ReactElement {
  const { ticketOpen, closeTicket } = useFullMoonUI();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qty, setQty] = useState(1);
  const [agree, setAgree] = useState(false);
  const [hp, setHp] = useState(''); // honeypot — real users leave this empty
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeTicket();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ticketOpen, closeTicket]);

  const { subtotal, tax, total } = ticketTotals(qty);
  const canSubmit = Boolean(name.trim() && email.trim() && phone.trim() && agree) && !submitting;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/full-moon/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          quantity: qty,
          ageConfirmed: agree,
          hp_ticket_note: hp,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data?.error || 'Tickets aren’t on sale just yet — check back soon.');
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {ticketOpen ? (
        <motion.div
          className={styles.scrim}
          onClick={closeTicket}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Get your ticket"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <span className={styles.sheetGrip} aria-hidden="true" />
            <button type="button" className={styles.sheetX} aria-label="Close" onClick={closeTicket}>
              &times;
            </button>
            <p className={[base.eyebrow, styles.sheetEyebrow].join(' ')}>
              {EVENT.dateLabel} · ${EVENT.price} each + tax
            </p>
            <h3 className={styles.sheetHeading}>Get your ticket.</h3>
            <p className={styles.sheetSub}>
              Sunset cruise, moonrise dance party, taco bar included. We&rsquo;ll text the marina pin before the{' '}
              {EVENT.castOff} cast-off.
            </p>

            <form className={styles.ticketForm} onSubmit={submit}>
              {/* Honeypot — hidden from humans, tempting to bots. */}
              <input
                type="text"
                name="ticket_note"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="fm-name">
                  Name
                </label>
                <input
                  id="fm-name"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <span className={styles.fieldHint}>
                  Shown on the public guest list as your first name + last initial.
                </span>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="fm-email">
                  Email
                </label>
                <input
                  id="fm-email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="fm-phone">
                  Mobile (for the marina pin)
                </label>
                <input
                  id="fm-phone"
                  type="tel"
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>How many spots?</span>
                <div className={styles.qtyRow}>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    aria-label="Fewer tickets"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    &minus;
                  </button>
                  <span className={styles.qtyVal} aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    aria-label="More tickets"
                    onClick={() => setQty((q) => Math.min(MAX_TICKETS_PER_ORDER, q + 1))}
                    disabled={qty >= MAX_TICKETS_PER_ORDER}
                  >
                    +
                  </button>
                  <span className={styles.qtyTotal}>${total.toFixed(2)}</span>
                </div>
                {/* Tax is added on top of the advertised price, so show the
                    customer the exact breakdown before they're sent to Stripe
                    rather than surprising them on the payment page. */}
                <p className={styles.priceBreakdown}>
                  {qty} × ${EVENT.price} = ${subtotal.toFixed(2)}
                  <span aria-hidden="true"> · </span>
                  sales tax ${tax.toFixed(2)}
                  <span aria-hidden="true"> · </span>
                  <strong>total ${total.toFixed(2)}</strong>
                </p>
              </div>
              <label className={styles.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  I&rsquo;m 25 or older (this event is adults only), I understand every ticket is refunded in full
                  if the cruise doesn&rsquo;t reach {EVENT.minimum} guests, and I agree to the{' '}
                  {/* New tab so the half-filled form isn't lost. */}
                  <a href="/full-moon-terms" target="_blank" rel="noopener noreferrer" className={styles.checkLink}>
                    event terms
                  </a>
                  .
                </span>
              </label>

              {error ? <p className={styles.ticketError}>{error}</p> : null}

              <div className={styles.ticketSubmit}>
                <NeonHalo full>
                  <Button variant="cart" type="submit" fullWidth disabled={!canSubmit} className="uppercase">
                    {submitting ? 'Taking you to checkout…' : `Continue — $${total}`}
                  </Button>
                </NeonHalo>
              </div>
              <p className={styles.ticketFine}>Secure checkout by Stripe. You confirm payment on the next screen.</p>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

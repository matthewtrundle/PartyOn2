'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon, type IconName } from './icons';
import { useFullMoonUI } from './ui-context';
import { SHARE } from './event';
import base from './full-moon.module.css';
import styles from './full-moon-overlays.module.css';

interface Channel {
  id: string;
  label: string;
  icon: IconName;
  cls: string;
}

const CHANNELS: Channel[] = [
  { id: 'sms', label: 'Messages', icon: 'messages', cls: styles.cMsg },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', cls: styles.cWa },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', cls: styles.cIg },
  { id: 'x', label: 'X', icon: 'x', cls: styles.cX },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', cls: styles.cFb },
  { id: 'email', label: 'Email', icon: 'mail', cls: styles.cMail },
  { id: 'native', label: 'More', icon: 'native', cls: styles.cNative },
  { id: 'copy', label: 'Copy Link', icon: 'copy', cls: styles.cCopy },
];

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/** Bottom-sheet / dialog for sharing the event across channels. */
export default function ShareSheet(): ReactElement {
  const { shareOpen, closeShare, showToast } = useFullMoonUI();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeShare();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shareOpen, closeShare]);

  const openExternal = (url: string): void => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const copyText = (text: string, message: string): void => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(message),
        () => showToast(message),
      );
    } else {
      showToast(message);
    }
  };

  const handleChannel = (id: string): void => {
    const u = encodeURIComponent(SHARE.url);
    const t = encodeURIComponent(SHARE.text);
    const tu = encodeURIComponent(`${SHARE.text} ${SHARE.url}`);
    switch (id) {
      case 'sms':
        openExternal(`sms:?&body=${tu}`);
        break;
      case 'whatsapp':
        openExternal(`https://wa.me/?text=${tu}`);
        break;
      case 'x':
        openExternal(`https://twitter.com/intent/tweet?text=${t}&url=${u}`);
        break;
      case 'facebook':
        openExternal(`https://www.facebook.com/sharer/sharer.php?u=${u}`);
        break;
      case 'email':
        openExternal(`mailto:?subject=${encodeURIComponent(SHARE.title)}&body=${encodeURIComponent(`${SHARE.text}\n\n${SHARE.url}`)}`);
        break;
      case 'instagram':
        copyText(`${SHARE.text} ${SHARE.url}`, 'Caption copied — paste it into your story');
        break;
      case 'copy':
        copyText(SHARE.url, 'Link copied');
        break;
      case 'native':
        if (navigator.share) {
          navigator.share({ title: SHARE.title, text: SHARE.text, url: SHARE.url }).catch(() => undefined);
        } else {
          copyText(SHARE.url, 'Link copied');
        }
        break;
      default:
        break;
    }
  };

  const copyLink = (): void => {
    copyText(SHARE.url, 'Link copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const displayUrl = SHARE.url.replace(/^https?:\/\//, '');

  return (
    <AnimatePresence>
      {shareOpen ? (
        <motion.div
          className={styles.scrim}
          onClick={closeShare}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Share the Full Moon Party"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <span className={styles.sheetGrip} aria-hidden="true" />
            <button type="button" className={styles.sheetX} aria-label="Close" onClick={closeShare}>
              &times;
            </button>
            <p className={[base.eyebrow, styles.sheetEyebrow].join(' ')}>Bring your crew</p>
            <h3 className={styles.sheetHeading}>Send the invite.</h3>
            <p className={styles.sheetSub}>
              Every friend you bring gets us closer to casting off. Pick how you want to share.
            </p>

            <div className={styles.shareGrid}>
              {CHANNELS.map((c) => (
                <button type="button" key={c.id} className={styles.shareOpt} onClick={() => handleChannel(c.id)}>
                  <span className={[styles.soIc, c.cls].join(' ')}>
                    <Icon name={c.icon} strokeWidth={1.7} />
                  </span>
                  <span className={styles.soLbl}>{c.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.copylink}>
              <input type="text" readOnly value={displayUrl} aria-label="Event link" />
              <button type="button" className={copied ? styles.done : undefined} onClick={copyLink}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

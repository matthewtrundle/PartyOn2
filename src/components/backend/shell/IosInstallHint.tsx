'use client';

import { ReactElement, useEffect, useState } from 'react';

const DISMISS_KEY = 'hq_install_hint_dismissed';

function isIosSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * One-time "Add to Home Screen" hint for iOS Safari (which has no install
 * prompt API). Shown on the Today screen only when not already installed;
 * dismissal persists forever in localStorage.
 */
export default function IosInstallHint(): ReactElement | null {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isIosSafariBrowser() && !isStandalone()) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = (): void => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  return (
    <div className="bg-navy text-white rounded-xl p-4 flex items-start gap-3">
      <div className="w-11 h-11 shrink-0 rounded-xl bg-white/10 flex items-center justify-center font-heading font-bold text-sm tracking-[0.05em]">
        POD
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-heading font-bold text-base tracking-[0.08em] uppercase">
          Put HQ on your home screen
        </div>
        <p className="text-sm text-[#8FA3B5] mt-0.5">
          Full-screen app, one tap from your phone. Tap{' '}
          <svg className="inline w-4 h-4 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-label="Share">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0-12l-4 4m4-4l4 4M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" />
          </svg>{' '}
          Share, then &ldquo;Add to Home Screen.&rdquo;
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[44px] px-4 rounded-lg bg-brand-yellow text-gray-900 font-heading font-bold text-[13px] tracking-[0.08em] uppercase"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[44px] px-4 rounded-lg text-[#8FA3B5] font-semibold text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

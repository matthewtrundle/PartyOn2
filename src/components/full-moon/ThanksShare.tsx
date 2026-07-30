'use client';

import { useState, type ReactElement } from 'react';
import { SHARE } from './event';

/**
 * Share block for the post-purchase thank-you page. Native share sheet where
 * the browser has one (all phones — where sharing actually happens), copy-link
 * fallback everywhere else. Shares the CLEAN event URL, not the buyer's
 * UTM-tagged one, so friends' visits don't get mislabeled as email traffic.
 */
export default function ThanksShare(): ReactElement {
  const [copied, setCopied] = useState(false);

  const nativeShare = async (): Promise<void> => {
    try {
      if (navigator.share) {
        await navigator.share({ title: SHARE.title, text: SHARE.text, url: SHARE.url });
        return;
      }
    } catch {
      // Dismissed the sheet — nothing to do.
      return;
    }
    await copyLink();
  };

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(SHARE.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked — the visible URL below is the fallback.
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={nativeShare}
          className="rounded-lg bg-cyan-400 px-6 py-3 text-sm font-semibold tracking-[0.08em] uppercase text-gray-900 hover:bg-cyan-300"
        >
          Send it to your friends
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border-2 border-cyan-400 px-6 py-3 text-sm font-semibold tracking-[0.08em] uppercase text-cyan-300 hover:bg-cyan-400/10"
        >
          {copied ? 'Link copied!' : 'Copy the link'}
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-400 break-all">{SHARE.url}</p>
    </div>
  );
}

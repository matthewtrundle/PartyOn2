'use client';

/**
 * Two-tab partner page shell (the Lynn's Lodging replication template).
 *
 * Layout: a centered white "<Business Name>'s Concierge" masthead on the
 * dark band, then a full-viewport-width 50/50 tab bar (left = the POD
 * partner page, right = the embedded booking page, e.g. the Premier
 * Party Cruises quote mirror). The tab bar sticks to the top on scroll
 * so switching is always one tap — mobile-first sizing throughout.
 *
 * The iframe mounts on first open and stays mounted, so switching back
 * and forth never reloads either side.
 */

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { trackPodEvent } from '@/lib/analytics/client-tracker';

/** "Lynn's Lodging" → "Lynn's Lodging's"; "Cocktail Cowboys" → "Cocktail Cowboys'". */
function possessive(name: string): string {
  return /s$/i.test(name.trim()) ? `${name.trim()}'` : `${name.trim()}'s`;
}

export default function PartnerPageTabs({
  businessName,
  leftLabel,
  rightLabel,
  embedUrl,
  children,
}: {
  businessName: string;
  leftLabel: string;
  rightLabel: string;
  embedUrl: string;
  children: ReactNode;
}): ReactElement {
  const [tab, setTab] = useState<'left' | 'right'>('left');
  // Lazy-mount the iframe on first open; keep it mounted afterwards.
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedSrc, setEmbedSrc] = useState(embedUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const openRight = () => {
    // Source tracking (same params Premier's own embed kit appends) so
    // the referring partner page is captured on their side.
    if (!embedLoaded) {
      const u = new URL(embedUrl, window.location.origin);
      u.searchParams.set('sourceUrl', window.location.href);
      u.searchParams.set('sourceType', 'embedded_quote_builder');
      setEmbedSrc(u.toString());
    }
    // Measured from the parent, not the iframe: this is the only reliable
    // count of how often the boat tab is actually opened.
    trackPodEvent('partner_embed_opened', { businessName, label: rightLabel });
    setEmbedLoaded(true);
    setTab('right');
  };

  // Grow the frame to its content instead of double-scrolling.
  //
  // The embed is same-origin (it is a POD route proxying Premier), so we can
  // measure its body directly rather than depend on Premier's own
  // quote-builder-resize postMessage — one less contract of theirs to break.
  // The message listener stays as a fallback for the cross-origin case.
  useEffect(() => {
    if (!embedLoaded) return;
    const setHeight = (height: number) => {
      if (height > 0 && iframeRef.current) {
        iframeRef.current.style.height = `${Math.max(height + 50, 900)}px`;
      }
    };

    let observer: ResizeObserver | undefined;
    const attach = () => {
      try {
        const body = iframeRef.current?.contentDocument?.body;
        if (!body) return;
        observer?.disconnect();
        observer = new ResizeObserver(() => setHeight(body.scrollHeight));
        observer.observe(body);
        setHeight(body.scrollHeight);
      } catch {
        // Cross-origin or not ready yet — the message listener covers it.
      }
    };
    attach();
    const frame = iframeRef.current;
    frame?.addEventListener('load', attach);

    const origin = new URL(embedUrl, window.location.origin).origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; height?: number };
      if (data?.type === 'quote-builder-resize' && data.height) setHeight(data.height);
    };
    window.addEventListener('message', onMessage);

    return () => {
      observer?.disconnect();
      frame?.removeEventListener('load', attach);
      window.removeEventListener('message', onMessage);
    };
  }, [embedUrl, embedLoaded]);

  const tabClass = (active: boolean) =>
    `w-full px-2 py-3.5 md:py-4 text-sm sm:text-base md:text-xl font-heading font-bold tracking-[0.08em] uppercase border-b-4 transition-colors touch-manipulation ${
      active
        ? 'bg-white text-brand-blue border-brand-blue'
        : 'bg-gray-800/90 text-white/85 border-transparent hover:bg-gray-700/90 active:bg-gray-700'
    }`;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Masthead — the partner's concierge banner */}
      <div className="bg-gray-900 pt-5 pb-4 md:pt-7 md:pb-5 px-4">
        <h1 className="text-center text-white font-heading font-bold uppercase tracking-[0.1em] text-2xl sm:text-3xl md:text-5xl leading-tight drop-shadow-lg">
          {possessive(businessName)}{' '}
          <span className="text-brand-yellow">Concierge</span>
        </h1>
      </div>

      {/* Full-width 50/50 tab bar — sticky so the switch is always one tap */}
      <div className="sticky top-0 z-40 bg-gray-900 shadow-md">
        <div className="grid grid-cols-2 w-full">
          <button type="button" onClick={() => setTab('left')} className={tabClass(tab === 'left')}>
            {leftLabel}
          </button>
          <button type="button" onClick={openRight} className={tabClass(tab === 'right')}>
            {rightLabel}
          </button>
        </div>
      </div>

      {/* Left: the standard POD partner page */}
      <div hidden={tab !== 'left'}>{children}</div>

      {/* Right: embedded booking page (its hero carries the photo slideshow —
          injected by the proxy route; see src/lib/partners/premier-embed.ts) */}
      <div hidden={tab !== 'right'} className="bg-white">
        {embedLoaded && (
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={rightLabel}
            className="w-full border-0 block"
            style={{ height: 'calc(100vh - 58px)' }}
            allow="payment; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
        <div className="text-center py-3 bg-white">
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-blue underline"
          >
            Trouble loading? Open {rightLabel} in a new window →
          </a>
        </div>
      </div>
    </div>
  );
}

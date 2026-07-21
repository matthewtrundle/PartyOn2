'use client';

/**
 * Two-tab partner page shell (pilot: Lynn's Lodging).
 *
 * Left tab = the standard POD partner page (server-rendered children).
 * Right tab = an external booking page embedded in an iframe (e.g.
 * Premier Party Cruises' /quote — verified frame-friendly: no
 * X-Frame-Options / frame-ancestors on that page). The iframe mounts on
 * first open and stays mounted, so switching back and forth never
 * reloads either side, and a Premier outage can't break the POD tab.
 */

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

export default function PartnerPageTabs({
  leftLabel,
  rightLabel,
  embedUrl,
  children,
}: {
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
    // Premier's embed app expects source tracking params (their own
    // embed-code.html does the same) — appended client-side so the
    // referring partner page URL is captured.
    if (!embedLoaded) {
      const u = new URL(embedUrl);
      u.searchParams.set('sourceUrl', window.location.href);
      u.searchParams.set('sourceType', 'embedded_quote_builder');
      setEmbedSrc(u.toString());
    }
    setEmbedLoaded(true);
    setTab('right');
  };

  // Premier's embed posts its content height (quote-builder-resize) so the
  // frame can grow instead of double-scrolling.
  useEffect(() => {
    const origin = new URL(embedUrl).origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; height?: number };
      if (data?.type === 'quote-builder-resize' && data.height && iframeRef.current) {
        iframeRef.current.style.height = `${Math.max(data.height + 50, 900)}px`;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [embedUrl]);

  const tabClass = (active: boolean) =>
    `flex-1 sm:flex-none sm:min-w-[220px] px-6 py-3.5 text-base md:text-lg font-heading font-bold tracking-[0.08em] uppercase rounded-t-lg border-b-4 transition-colors ${
      active
        ? 'bg-white text-brand-blue border-brand-blue'
        : 'bg-gray-800/80 text-white/80 border-transparent hover:bg-gray-700/80'
    }`;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Tab bar — sticky so the switch is always reachable */}
      <div className="sticky top-0 z-40 bg-gray-900 pt-3 px-3 sm:px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex gap-1">
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

      {/* Right: embedded external booking page */}
      <div hidden={tab !== 'right'} className="bg-white">
        {embedLoaded && (
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={rightLabel}
            className="w-full border-0 block"
            style={{ height: 'calc(100vh - 62px)' }}
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

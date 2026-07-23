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

/** "Lynn's Lodging" → "Lynn's Lodging's"; "Cocktail Cowboys" → "Cocktail Cowboys'". */
function possessive(name: string): string {
  return /s$/i.test(name.trim()) ? `${name.trim()}'` : `${name.trim()}'s`;
}

/**
 * Hero slideshow for the boat tab — Premier's own party-wall photos
 * (self-hosted copies; Brian's shots, incl. the two he picked for the
 * hero). Auto-advances with a crossfade; dots are tappable.
 */
const BOAT_HERO_SLIDES = [
  '/images/partners/premier-boat-slideshow/unicorn-float-crew.jpg',
  '/images/partners/premier-boat-slideshow/bride-squad-captain.jpg',
  '/images/partners/premier-boat-slideshow/group-pic.jpg',
  '/images/partners/premier-boat-slideshow/pontoon-full-crew.jpg',
  '/images/partners/premier-boat-slideshow/disco-fun-1.jpg',
  '/images/partners/premier-boat-slideshow/disco-fun-2.jpg',
];

function BoatHeroSlideshow({ label }: { label: string }): ReactElement {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % BOAT_HERO_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative w-full h-[38vh] md:h-[48vh] overflow-hidden bg-gray-900">
      {BOAT_HERO_SLIDES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- crossfade stack; plain img keeps all slides cached
        <img
          key={src}
          src={src}
          alt={`${label} — Lake Travis party boat`}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === slide ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900/70 to-transparent" />
      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
        {BOAT_HERO_SLIDES.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Photo ${i + 1}`}
            onClick={() => setSlide(i)}
            className={`h-2.5 rounded-full transition-all touch-manipulation ${
              i === slide ? 'w-6 bg-brand-yellow' : 'w-2.5 bg-white/60 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
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
    setEmbedLoaded(true);
    setTab('right');
  };

  // The embed posts its content height (quote-builder-resize) so the
  // frame can grow instead of double-scrolling.
  useEffect(() => {
    const origin = new URL(embedUrl, window.location.origin).origin;
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

      {/* Right: hero slideshow + embedded booking page */}
      <div hidden={tab !== 'right'} className="bg-white">
        {embedLoaded && <BoatHeroSlideshow label={rightLabel} />}
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

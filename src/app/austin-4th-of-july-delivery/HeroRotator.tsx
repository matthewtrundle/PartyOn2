'use client';

import { useEffect, useState } from 'react';

export interface HeroSlide {
  label: string;
  src: string;
  accent: string;
}

/**
 * Auto-rotating image panel beside the hero — crossfades through the kit images.
 * A slide with no image yet falls back to a branded tile so it never looks broken.
 * Honors prefers-reduced-motion (no auto-advance).
 */
export default function HeroRotator({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
      {slides.map((s, i) => (
        <div
          key={s.label}
          aria-hidden={i !== active}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === active ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: '#0d1e34',
            backgroundImage: s.src ? `url("${s.src}")` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!s.src && (
            <>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 32%, ${s.accent}55, transparent 70%)` }} />
              <span className="absolute inset-0 flex items-center justify-center font-heading text-7xl text-white/15">POD</span>
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5">
            <p className="eyebrow text-xs text-white/70">Cocktail Kit</p>
            <p className="font-heading text-lg tracking-[0.06em] text-white">{s.label}</p>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute right-4 top-4 flex gap-1.5">
          {slides.map((s, i) => (
            <span key={s.label} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

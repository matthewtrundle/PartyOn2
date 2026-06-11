'use client';

/**
 * Hero backdrop — one cinematic photo (or a slow 2–4 image crossfade)
 * behind the landing-page hero panel.
 *
 * Replaces the old 10-slide / 1.5s HeroSlideshow, which mounted every
 * slide simultaneously (heavy LCP) and rotated too fast to read the page
 * against. Design rules here:
 *
 *   - 1 image  → static, `priority` + high fetch priority (it IS the LCP)
 *   - 2–4      → crossfade every 8s; only slides that have been shown get
 *                mounted, and only slide 0 is priority
 *   - A very slow scale (Ken Burns) adds cinematic life; disabled along
 *     with the rotation under prefers-reduced-motion
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';

export type HeroImage = { src: string; alt: string };

const INTERVAL_MS = 8000;

export default function HeroBackdrop({ images }: { images: HeroImage[] }) {
  const [index, setIndex] = useState(0);
  // Highest slide index we've shown so far — slides beyond it stay
  // unmounted so a 4-image hero doesn't load 4 full-bleed photos up front.
  const [maxShown, setMaxShown] = useState(0);

  const multi = images.length > 1;

  useEffect(() => {
    if (!multi) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return; // static first frame for reduced-motion users
    }
    const id = window.setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % images.length;
        setMaxShown((m) => Math.max(m, next));
        return next;
      });
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [multi, images.length]);

  return (
    <>
      {/* Scoped keyframes — a barely-perceptible 16s drift. transform-only,
          so it stays on the compositor. */}
      <style>{`
        @keyframes heroBackdropDrift {
          from { transform: scale(1); }
          to { transform: scale(1.06); }
        }
        .hero-backdrop-drift { animation: heroBackdropDrift 16s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .hero-backdrop-drift { animation: none; }
        }
      `}</style>
      {images.slice(0, maxShown + 1).map((img, i) => (
        <div
          key={img.src}
          className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            priority={i === 0}
            fetchPriority={i === 0 ? 'high' : undefined}
            sizes="100vw"
            className={`object-cover ${i === index ? 'hero-backdrop-drift' : ''}`}
          />
        </div>
      ))}
    </>
  );
}

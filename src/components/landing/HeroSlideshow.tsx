'use client';

/**
 * Hero background slideshow — cycles through 10 photos every 500ms.
 *
 * 5 Fresh Victor cocktail kit photos alternated with 5 party / event
 * photos pulled from /public/images. The component cross-fades between
 * frames so the transition isn't jarring at 2 fps.
 *
 * Used by LandingPageTemplate as the hero background instead of a single
 * static <Image>.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';

const SLIDES: { src: string; alt: string; kind: 'cocktail' | 'party' }[] = [
  // Cocktail / party / cocktail / party / … alternating
  {
    src: '/images/products/fresh-victor-cocktails/Lake%20Travis%20Ranch%20Water/Gemini_Generated_Image_8hxllx8hxllx8hxl.png',
    alt: 'Lake Travis Ranch Water cocktail kit',
    kind: 'cocktail',
  },
  {
    src: '/images/ppc/ppc-ccs-238.jpg',
    alt: 'Lake Travis bachelor party — photo by Capital City Shots for Premier Party Cruises',
    kind: 'party',
  },
  {
    src: '/images/products/fresh-victor-cocktails/Lady%20Bird%20Margarita/Gemini_Generated_Image_95mqfa95mqfa95mq.png',
    alt: 'Lady Bird Margarita cocktail kit',
    kind: 'cocktail',
  },
  {
    src: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
    alt: 'Bachelorette champagne tower',
    kind: 'party',
  },
  {
    src: '/images/products/fresh-victor-cocktails/Cucumber%20Crush%20Margarita/Gemini_Generated_Image_9t92hz9t92hz9t92.png',
    alt: 'Cucumber Crush Margarita cocktail kit',
    kind: 'cocktail',
  },
  {
    src: '/images/gallery/sunset-champagne-pontoon.webp',
    alt: 'Sunset champagne pontoon on Lake Travis',
    kind: 'party',
  },
  {
    src: '/images/products/fresh-victor-cocktails/Pink%20Party%20Lemonade/Gemini_Generated_Image_bdur4kbdur4kbdur.png',
    alt: 'Pink Party Lemonade cocktail kit',
    kind: 'cocktail',
  },
  {
    src: '/images/ppc/ppc-ccs-196.jpg',
    alt: 'Lake Travis party cruise — photo by Capital City Shots for Premier Party Cruises',
    kind: 'party',
  },
  {
    src: '/images/products/fresh-victor-cocktails/Keep%20Austin%20Spicy%20Marg/Gemini_Generated_Image_bm1s1dbm1s1dbm1s.png',
    alt: 'Keep Austin Spicy Marg cocktail kit',
    kind: 'cocktail',
  },
  {
    src: '/images/ppc/ppc-deck.jpg',
    alt: 'Premier Party Cruises deck party on Lake Travis',
    kind: 'party',
  },
];

const INTERVAL_MS = 1500;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          // First frame is priority so LCP doesn't suffer; others lazy-load.
          priority={i === 0}
          sizes="100vw"
          className="object-cover transition-opacity duration-300"
          style={{
            opacity: i === index ? 1 : 0,
            // Cocktail kits photograph as portrait product shots — drop in
            // slight darkening to keep hero text readable.
            filter: slide.kind === 'cocktail' ? 'brightness(0.85)' : 'brightness(0.9)',
          }}
        />
      ))}
    </>
  );
}

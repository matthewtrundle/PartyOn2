'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import styles from './full-moon.module.css';
import { useReducedMotion } from './useReducedMotion';

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  tw: number;
  sp: number;
}

/**
 * The fixed environmental "lighting" behind the whole page: a sunset gradient
 * that pans to midnight, a sun that sets through the hero, a starfield that
 * fades in, and a moon that rises through the lower half. Driven by a single
 * requestAnimationFrame scroll handler that writes straight to element styles
 * (no React re-render per frame). Hero copy/carousel parallax is handled here
 * too via `[data-fm-parallax]` targets. Honors reduced motion.
 */
export default function SkyBackdrop(): ReactElement {
  const skyRef = useRef<HTMLDivElement>(null);
  const sunLayerRef = useRef<HTMLDivElement>(null);
  const moonLayerRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const sky = skyRef.current;
    const sunLayer = sunLayerRef.current;
    const moonLayer = moonLayerRef.current;
    const moon = moonRef.current;
    const canvas = canvasRef.current;

    // ---- Scroll-driven arc ----
    let scrollTick = false;
    const frame = (): void => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const p = docH > 0 ? Math.min(1, Math.max(0, scrollY / docH)) : 0;

      if (sky) sky.style.backgroundPositionY = `${(p * 100).toFixed(2)}%`;
      if (canvas) canvas.style.opacity = Math.min(1, Math.max(0, (p - 0.18) / 0.55)).toFixed(3);
      if (sunLayer) {
        const s = Math.min(1, Math.max(0, p / 0.42));
        sunLayer.style.opacity = (1 - s).toFixed(3);
        sunLayer.style.transform = `translateY(${(s * 62).toFixed(1)}vh)`;
      }
      if (moonLayer && moon) {
        const m = Math.min(1, Math.max(0, (p - 0.26) / 0.6));
        moonLayer.style.opacity = m.toFixed(3);
        moon.style.transform = `translateY(${((1 - m) * 98 - 40).toFixed(1)}vh)`;
      }
      // No hero copy/carousel parallax — only the sky/sun/moon move with scroll.
      scrollTick = false;
    };
    const onScroll = (): void => {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(frame);
      }
    };

    // ---- Starfield ----
    const ctx = canvas?.getContext('2d') ?? null;
    let stars: Star[] = [];
    let starRAF = 0;
    const buildStars = (): void => {
      const count = Math.round((window.innerWidth * window.innerHeight) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.3 + 0.3,
        base: Math.random() * 0.5 + 0.3,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.018 + 0.004,
      }));
    };
    const sizeStars = (): void => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    };
    const drawStars = (twinkle: boolean): void => {
      if (!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of stars) {
        if (twinkle) s.tw += s.sp;
        ctx.globalAlpha = Math.max(0, twinkle ? s.base + Math.sin(s.tw) * 0.3 : s.base);
        ctx.fillStyle = '#eaf2ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (twinkle) starRAF = requestAnimationFrame(() => drawStars(true));
    };

    if (ctx) {
      sizeStars();
      if (reduced) drawStars(false);
      else starRAF = requestAnimationFrame(() => drawStars(true));
    }

    const onResize = (): void => {
      if (ctx) sizeStars();
      onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    frame();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (starRAF) cancelAnimationFrame(starRAF);
    };
  }, [reduced]);

  return (
    <>
      <div ref={skyRef} className={styles.sky} aria-hidden="true" />
      <div ref={sunLayerRef} className={styles.sunLayer} aria-hidden="true">
        <div className={styles.sun} />
      </div>
      <canvas ref={canvasRef} className={styles.stars} aria-hidden="true" />
      <div ref={moonLayerRef} className={styles.moonLayer} aria-hidden="true">
        <div ref={moonRef} className={styles.moon} />
      </div>
    </>
  );
}

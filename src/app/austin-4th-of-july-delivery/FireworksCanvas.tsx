'use client';

import { useEffect, useRef } from 'react';

// Brand-colored sparks: gold, red, blue, white.
const COLORS = ['#D4AF37', '#C8102E', '#0B74B8', '#FFFFFF'];
const MAX_ROCKETS = 6;
const MAX_SPARKS = 480;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
}

/**
 * Ambient + scroll-driven fireworks behind the page content.
 * Fixed full-viewport canvas, additive blending, transparent each frame.
 * Honors prefers-reduced-motion (renders a few static bursts, no animation).
 */
export default function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = (): void => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rand = (a: number, b: number): number => a + Math.random() * (b - a);
    const randColor = (): string => COLORS[Math.floor(Math.random() * COLORS.length)];

    const sparks: Spark[] = [];
    const rockets: Rocket[] = [];

    const burst = (x: number, y: number, color: string): void => {
      const count = Math.min(Math.floor(rand(40, 55)), MAX_SPARKS - sparks.length);
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(60, 190);
        const maxLife = rand(1.1, 1.8);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color: Math.random() < 0.18 ? '#FFFFFF' : color,
          size: rand(1.4, 2.6),
        });
      }
    };

    const launchRocket = (): void => {
      if (rockets.length >= MAX_ROCKETS) return;
      rockets.push({
        x: rand(W * 0.12, W * 0.88),
        y: H + 10,
        vy: -rand(H * 0.55, H * 0.78),
        targetY: rand(H * 0.18, H * 0.45),
        color: randColor(),
      });
    };

    // Reduced motion: paint a few static bursts once, skip the animation loop.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const cx = rand(W * 0.2, W * 0.8);
        const cy = rand(H * 0.2, H * 0.45);
        const color = COLORS[i % COLORS.length];
        for (let j = 0; j < 46; j++) {
          const a = (j / 46) * Math.PI * 2;
          const r = rand(20, 90);
          ctx.globalAlpha = rand(0.25, 0.7);
          ctx.fillStyle = Math.random() < 0.2 ? '#FFFFFF' : color;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      const onResizeStatic = (): void => resize();
      window.addEventListener('resize', onResizeStatic);
      return () => window.removeEventListener('resize', onResizeStatic);
    }

    const GRAVITY = 150; // px/s^2
    const FRICTION = 1.1; // velocity decay per second
    let raf = 0;
    let last = performance.now();

    const frame = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt;
        if (r.y <= r.targetY) {
          burst(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      const decay = Math.exp(-FRICTION * dt);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= decay;
        s.vy = s.vy * decay + GRAVITY * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        const t = Math.max(s.life / s.maxLife, 0);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = t * 0.18;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = t;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const r of rockets) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const openers = [0, 350, 700].map((d) => window.setTimeout(launchRocket, d));
    const ambient = window.setInterval(() => {
      if (!document.hidden) launchRocket();
    }, 900);

    let lastScrollY = window.scrollY;
    const onScroll = (): void => {
      if (Math.abs(window.scrollY - lastScrollY) >= 140) {
        lastScrollY = window.scrollY;
        launchRocket();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(ambient);
      openers.forEach((id) => clearTimeout(id));
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-10 pointer-events-none" />;
}

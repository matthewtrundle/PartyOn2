import { THEME } from './event';

/**
 * A gentle confetti burst from near the top of `host`, using the Web Animations
 * API (self-cleaning). Caller guards on reduced motion.
 */
export function fireConfetti(host: HTMLElement, count = 24, topPct = 24): void {
  const colors = [THEME.neonA, THEME.neonB, '#F2D34F', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.style.cssText = `position:absolute;top:${topPct}%;left:50%;width:7px;height:7px;border-radius:2px;pointer-events:none;z-index:5;`;
    dot.style.background = colors[i % colors.length];
    host.appendChild(dot);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 70 + Math.random() * 140;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 25;
    dot
      .animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx}px,${dy + 170}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
        ],
        { duration: 1350 + Math.random() * 700, easing: 'cubic-bezier(0.2,0.6,0.3,1)' },
      )
      .addEventListener('finish', () => dot.remove());
  }
}

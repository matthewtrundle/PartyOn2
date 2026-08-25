import type { ReactElement } from 'react';
import { EVENT } from './event';

/**
 * Site-wide notice shown on every Full Moon page while `EVENT.postponed` is
 * true. Renders nothing when the event is live, so relaunching is a one-field
 * change in event.ts rather than edits across four pages.
 *
 * Deliberately plain markup (no neon theme, no motion): a visitor who already
 * bought a ticket needs to read this, not admire it. Server component — no
 * client JS, so it paints with the first byte above every hero.
 */
export default function PostponedBanner(): ReactElement | null {
  if (!EVENT.postponed) return null;

  return (
    <div
      role="status"
      style={{
        background: '#7f1d1d',
        color: '#fff',
        padding: '14px 20px',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '15px',
        lineHeight: 1.5,
        position: 'relative',
        zIndex: 60,
      }}
    >
      <strong style={{ display: 'block', fontSize: '16px', letterSpacing: '0.02em' }}>
        {EVENT.shortDate} is postponed
      </strong>
      <span style={{ opacity: 0.92 }}>{EVENT.postponedNote}</span>
    </div>
  );
}

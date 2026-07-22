'use client';

/**
 * WidgetMenu — the site-wide floating entry point.
 *
 * Replaces the old quiz-only bubble. Tapping the floating button opens a
 * three-door menu (navy + gold) that routes to whichever help the visitor
 * wants:
 *
 *   1. "Order drinks now"            → straight to /order (fast lane)
 *   2. "Get a party recommendation"  → the PartyChat quiz (lead capture)
 *   3. "Chat with Wayne"             → the AIConcierge free-form concierge
 *
 * The quiz and Wayne are rendered *controlled* (isOpen/onClose) and are kept
 * MOUNTED the whole time — their panels just show/hide via isOpen. Keeping them
 * mounted means their state survives open/close and "back to menu" within a
 * page visit: Wayne's conversationId + full message history stay intact, so the
 * captured transcript (ChatConversation) never gets clobbered mid-visit. Closing
 * either sub-panel returns to the three doors; the menu's own × closes the whole
 * thing back to the bubble.
 *
 * NO age gating here by design — carding happens at delivery (operator
 * decision 2026-07-22). The bubble intentionally stays reachable over the
 * 21+ gate, matching the prior PartyChat behavior.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PartyChat from './PartyChat';
import AIConcierge from '@/components/AIConcierge';

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';
const BLUE = '#0B74B8';

type View = 'menu' | 'quiz' | 'wayne';

export default function WidgetMenu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const router = useRouter();

  const backToMenu = () => setView('menu');
  const closeAll = () => {
    setOpen(false);
    setView('menu');
  };

  return (
    <>
      {/* Closed → the floating bubble (same look as the old PartyChat FAB so
          nothing visually shifts when collapsed; only the tap target changes). */}
      {!open && (
        <button
          onClick={() => {
            setView('menu');
            setOpen(true);
          }}
          aria-label="Open the Party On Delivery menu"
          className="fixed z-[150] rounded-full shadow-2xl transition-transform hover:scale-[1.05]"
          style={{
            right: 20,
            bottom: 20,
            width: 64,
            height: 64,
            background: GOLD,
            color: NAVY,
            border: `3px solid ${NAVY}`,
            boxShadow: `0 6px 0 ${NAVY}, 0 12px 24px rgba(0,0,0,0.25)`,
          }}
        >
          <span className="text-3xl leading-none" role="img" aria-label="party">
            🥂
          </span>
        </button>
      )}

      {/* Open + view === 'menu' → the three-door panel. */}
      {open && view === 'menu' && (
        <div
          className="fixed z-[150] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            right: 20,
            bottom: 20,
            width: 'min(400px, calc(100vw - 40px))',
            background: NAVY,
            border: `2px solid ${GOLD}`,
          }}
          role="dialog"
          aria-label="Party On Delivery menu"
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between gap-3"
            style={{ color: '#FFFFFF', borderBottom: `3px solid ${GOLD}` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: GOLD, color: NAVY }}
              >
                🥂
              </div>
              <div className="min-w-0">
                <div className="font-heading text-base font-bold leading-tight tracking-wide">
                  Party On Delivery
                </div>
                <div className="text-sm opacity-80 leading-tight">
                  How can we help you party?
                </div>
              </div>
            </div>
            <button
              onClick={closeAll}
              aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
            >
              ×
            </button>
          </div>

          {/* Three doors */}
          <div className="flex flex-col gap-3 px-4 py-4">
            {/* Door 1 — fast lane (gold) */}
            <button
              type="button"
              onClick={() => {
                router.push('/order');
                closeAll();
              }}
              className="w-full text-left rounded-lg px-4 py-3 transition-transform hover:scale-[1.01]"
              style={{
                background: GOLD,
                color: NAVY,
                border: `3px solid ${NAVY}`,
                boxShadow: `0 4px 0 ${NAVY}`,
              }}
            >
              <div className="font-heading text-lg font-bold tracking-wider leading-tight">
                ⚡ Order drinks now
              </div>
              <div className="text-sm font-semibold opacity-80 leading-snug">
                Skip straight to the full menu
              </div>
            </button>

            {/* Door 2 — recommendation quiz (blue) */}
            <button
              type="button"
              onClick={() => setView('quiz')}
              className="w-full text-left rounded-lg px-4 py-3 transition-transform hover:scale-[1.01]"
              style={{
                background: BLUE,
                color: '#FFFFFF',
                border: `2px solid ${GOLD}`,
                boxShadow: `0 4px 0 rgba(0,0,0,0.35)`,
              }}
            >
              <div className="font-heading text-lg font-bold tracking-wider leading-tight">
                🎉 Get a party recommendation
              </div>
              <div className="text-sm font-medium opacity-90 leading-snug">
                Answer 3 quick questions, get a build
              </div>
            </button>

            {/* Door 3 — Wayne (ghost) */}
            <button
              type="button"
              onClick={() => setView('wayne')}
              className="w-full text-left rounded-lg px-4 py-3 transition-transform hover:scale-[1.01]"
              style={{
                background: 'transparent',
                color: '#FFFFFF',
                border: `2px solid rgba(242,211,79,0.7)`,
              }}
            >
              <div
                className="font-heading text-lg font-bold tracking-wider leading-tight"
                style={{ color: GOLD }}
              >
                💬 Chat with Wayne
              </div>
              <div className="text-sm font-medium opacity-80 leading-snug">
                Ask our Texas party pro anything
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sub-flows stay MOUNTED (shown via isOpen) so their state survives
          open/close and "back to menu" within a visit. Each renders its own
          panel and suppresses its own FAB when controlled; closing routes back
          to the three-door menu. */}
      <PartyChat isOpen={open && view === 'quiz'} onClose={backToMenu} />
      <AIConcierge isOpen={open && view === 'wayne'} onClose={backToMenu} />
    </>
  );
}

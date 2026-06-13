'use client';

/**
 * Dashboard banner that explains the active menu mode + lets the
 * customer flip to the full menu (with a caveat about availability).
 *
 * Two visual states:
 *
 *   - DEFAULT (last-minute filter on): friendly amber strip explaining
 *     they're seeing only deep-stock items + a "Show full menu →"
 *     button.
 *
 *   - FULL-MENU OVERRIDE (filter off but isLastMinute still true):
 *     softer-tone note saying some items in the full menu may not be
 *     available in 24h, and we'll text them post-purchase if a
 *     substitution is needed. "Back to last-minute menu" button.
 *
 * Mounted by /dashboard/[code]/page.tsx — only when GroupOrderV2.isLastMinute
 * is true. The toggle state lives on the dashboard page so it can flip
 * the `allowedProductIds` prop on ProductBrowse.
 */

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';

type Props = {
  /** True when the customer has chosen to view the full menu anyway. */
  showFullMenu: boolean;
  onToggle: () => void;
};

export default function LastMinuteMenuBanner({ showFullMenu, onToggle }: Props) {
  if (!showFullMenu) {
    // Default — last-minute menu engaged.
    return (
      <div
        className="rounded-lg p-3 sm:p-4 mb-4 flex items-start sm:items-center gap-3 flex-wrap sm:flex-nowrap"
        style={{
          background: '#FFF7D6',
          border: `2px solid ${GOLD}`,
          boxShadow: `0 2px 0 ${NAVY}1A`,
        }}
      >
        <div className="text-2xl sm:text-3xl leading-none flex-shrink-0" aria-hidden>
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-sm sm:text-base tracking-wide" style={{ color: NAVY }}>
            You&apos;re viewing the last-minute menu
          </div>
          <div className="text-xs sm:text-sm mt-0.5" style={{ color: '#5A4A14' }}>
            Only items we can deliver in 24h. Tap below to browse the full menu —
            heads up: some items may not be available, and we&apos;ll text you
            after purchase if anything needs a substitution.
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md px-3 py-2 text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap transition-transform hover:scale-[1.02]"
          style={{
            background: '#FFFFFF',
            color: NAVY,
            border: `2px solid ${NAVY}`,
            boxShadow: `0 2px 0 ${NAVY}`,
          }}
        >
          Show full menu →
        </button>
      </div>
    );
  }

  // Full-menu override — soft warning about availability.
  return (
    <div
      className="rounded-lg p-3 sm:p-4 mb-4 flex items-start sm:items-center gap-3 flex-wrap sm:flex-nowrap"
      style={{
        background: '#F4F4F4',
        border: `1.5px solid #C8C8C8`,
      }}
    >
      <div className="text-2xl sm:text-3xl leading-none flex-shrink-0" aria-hidden>
        🔍
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-heading font-bold text-sm sm:text-base tracking-wide" style={{ color: NAVY }}>
          Browsing the full menu — fast-delivery mode
        </div>
        <div className="text-xs sm:text-sm mt-0.5 text-gray-700">
          Add anything you want. We&apos;ll confirm what&apos;s in stock and
          text you after purchase if a substitution is needed.
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-md px-3 py-2 text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap transition-transform hover:scale-[1.02]"
        style={{
          background: GOLD,
          color: NAVY,
          border: `2px solid ${NAVY}`,
          boxShadow: `0 2px 0 ${NAVY}`,
        }}
      >
        ← Back to last-minute menu
      </button>
    </div>
  );
}

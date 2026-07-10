'use client';

import { ReactElement } from 'react';

/**
 * Fixed bottom action bar — slides up when orders are selected. Sits above
 * the iOS home indicator via .safe-area-bottom. The primary action (Mark
 * Fulfilled) is always labeled; secondary actions collapse to icons on
 * small screens.
 */
export default function BulkActionBar({
  count,
  fulfilling,
  onFulfill,
  onPrint,
  onShortage,
  onReviews,
  showReviews,
  onClear,
}: {
  count: number;
  fulfilling: boolean;
  onFulfill: () => void;
  onPrint: () => void;
  onShortage: () => void;
  onReviews: () => void;
  showReviews: boolean;
  onClear: () => void;
}): ReactElement | null {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-[var(--pod-tab-h,0px)] inset-x-0 md:left-[232px] z-40 print:hidden">
      <div className="mx-auto max-w-7xl px-3 pb-3 safe-area-bottom">
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white shadow-2xl px-3 py-2">
          <span className="text-sm font-bold text-blue-900 whitespace-nowrap">
            {count} selected
          </span>
          <button
            type="button"
            onClick={onFulfill}
            disabled={fulfilling}
            className="min-h-[44px] px-4 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation"
          >
            {fulfilling ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{fulfilling ? 'Fulfilling…' : 'Fulfill'}</span>
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="min-h-[44px] px-3 bg-white border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 flex items-center gap-1.5 touch-manipulation"
            title="Print pick sheets"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span className="hidden sm:inline">Pick sheets</span>
          </button>
          <button
            type="button"
            onClick={onShortage}
            className="min-h-[44px] px-3 bg-white border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 flex items-center gap-1.5 touch-manipulation"
            title="Generate shortage list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="hidden sm:inline">Shortage</span>
          </button>
          {showReviews && (
            <button
              type="button"
              onClick={onReviews}
              className="min-h-[44px] px-3 bg-white border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 flex items-center gap-1.5 touch-manipulation"
              title="Send review requests"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="hidden sm:inline">Reviews</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="ml-auto min-h-[44px] px-3 text-sm font-medium text-gray-500 hover:text-gray-800 rounded-lg touch-manipulation"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

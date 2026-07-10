'use client';

import { ReactElement } from 'react';

export type StockState = 'in' | 'low' | 'out' | 'oversold';

const STATE_CLS: Record<StockState, string> = {
  in: 'bg-gray-50 border border-gray-200 text-gray-900',
  low: 'bg-amber-100 text-amber-800',
  out: 'bg-red-100 text-red-800',
  oversold: 'bg-red-600 text-white',
};

const CAPTION: Record<StockState, string> = {
  in: 'in stock',
  low: 'low',
  out: 'tap to fix',
  oversold: 'oversold',
};

/**
 * The tap affordance on catalog rows: stock count + state, min 64×44px.
 * Tapping opens the stock stepper sheet.
 */
export default function StockPill({
  count,
  state,
  onClick,
}: {
  count: number;
  state: StockState;
  onClick?: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[64px] min-h-[44px] px-2 rounded-lg flex flex-col items-center justify-center touch-manipulation transition-transform active:scale-[0.98] ${STATE_CLS[state]}`}
    >
      <span className="font-heading font-bold text-lg leading-none">{count}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.05em] leading-tight mt-0.5">
        {CAPTION[state]}
      </span>
    </button>
  );
}

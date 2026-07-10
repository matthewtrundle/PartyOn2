'use client';

import { ReactElement } from 'react';
import StickyActionBar from '@/components/backend/kit/StickyActionBar';
import type { OrderDetail } from './types';

const TRANSITIONS: Record<string, { label: string; to: string }> = {
  UNFULFILLED: { label: 'Mark Packed', to: 'PENDING' },
  PENDING: { label: 'Mark Out', to: 'OUT_FOR_DELIVERY' },
  IN_TRANSIT: { label: 'Mark Delivered', to: 'DELIVERED' },
  OUT_FOR_DELIVERY: { label: 'Mark Delivered', to: 'DELIVERED' },
};

/**
 * The next fulfillment transition for an order, or null when there is none
 * (delivered, failed, or cancelled). Shared with the page so it can pad the
 * content bottom only when the bar renders.
 */
export function nextTransition(
  order: Pick<OrderDetail, 'status' | 'fulfillmentStatus'>,
): { label: string; to: string } | null {
  if (order.status === 'CANCELLED' || order.fulfillmentStatus === 'FAILED') return null;
  return TRANSITIONS[order.fulfillmentStatus] ?? null;
}

/**
 * Sticky bottom bar with the single yellow next-transition action
 * (MARK PACKED → MARK OUT → MARK DELIVERED). Writes go through the page's
 * optimistic updateOrder; the bar hides when no transition applies.
 */
export default function DetailStickyBar({
  order,
  saving,
  onAdvance,
  onOpenActions,
}: {
  order: OrderDetail;
  saving: boolean;
  onAdvance: (updates: Record<string, unknown>) => void;
  onOpenActions?: () => void;
}): ReactElement | null {
  const next = nextTransition(order);
  if (!next) return null;

  return (
    <StickyActionBar>
      <button
        type="button"
        onClick={() => onAdvance({ fulfillmentStatus: next.to })}
        disabled={saving}
        className="flex-1 min-h-[52px] rounded-lg bg-brand-yellow text-gray-900 font-heading font-bold text-base tracking-[0.08em] uppercase hover:bg-yellow-400 active:bg-yellow-500 disabled:opacity-60 transition-colors touch-manipulation"
      >
        {saving ? 'Saving…' : next.label}
      </button>
      {onOpenActions && (
        <button
          type="button"
          onClick={onOpenActions}
          aria-label="More actions"
          className="w-[52px] min-h-[52px] flex-shrink-0 rounded-lg border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50 transition-colors touch-manipulation"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      )}
    </StickyActionBar>
  );
}

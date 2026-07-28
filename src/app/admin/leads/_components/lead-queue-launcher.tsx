/**
 * "Work the queue" control in the board's navy band.
 *
 * Lane choice sits here rather than inside the queue because Premier (the
 * cruise-partner flood) and Ads & Direct (the paid funnel) are different
 * motions — you decide which one you're working before you start, not per card.
 */

'use client';

import type { ReactElement } from 'react';
import type { QueueLane } from '@/lib/leads/work-queue';

const LANES: ReadonlyArray<readonly [QueueLane, string]> = [
  ['direct', 'Ads & Direct'],
  ['premier', 'Premier'],
  ['all', 'Everything'],
];

export default function LeadQueueLauncher({
  counts,
  lane,
  onLaneChange,
  onStart,
}: {
  counts: Record<QueueLane, number>;
  lane: QueueLane;
  onLaneChange: (lane: QueueLane) => void;
  onStart: () => void;
}): ReactElement {
  const count = counts[lane];
  return (
    <div className="flex items-center gap-2">
      <select
        value={lane}
        onChange={(e) => onLaneChange(e.target.value as QueueLane)}
        aria-label="Queue lane"
        className="min-h-[36px] rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white [&>option]:text-gray-900"
      >
        {LANES.map(([value, label]) => (
          <option key={value} value={value}>
            {label} ({counts[value]})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onStart}
        disabled={count === 0}
        className="min-h-[36px] rounded-lg bg-brand-yellow px-3 text-sm font-semibold tracking-[0.08em] text-gray-900 hover:brightness-95 disabled:opacity-40"
      >
        Work the queue
      </button>
    </div>
  );
}

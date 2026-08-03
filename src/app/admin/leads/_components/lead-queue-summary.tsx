/**
 * End-of-queue card — what the sitting actually produced. Worth showing:
 * "23 worked" is the number that tells the operator the queue is doing its job.
 */

'use client';

import type { ReactElement } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import type { QueueOutcome } from './use-lead-queue';

const LINE: ReadonlyArray<readonly [QueueOutcome, string, string]> = [
  ['replied', 'Replies sent', 'reply sent'],
  ['called', 'Calls logged', 'call logged'],
  ['texted', 'Texts logged', 'text logged'],
  ['snoozed', 'Snoozed', 'snoozed'],
  ['lost', 'Marked Lost', 'marked Lost'],
  ['skipped', 'Skipped', 'skipped'],
];

export default function LeadQueueSummary({
  handled,
  total,
  onExit,
}: {
  handled: ReadonlyMap<string, QueueOutcome>;
  total: number;
  onExit: () => void;
}): ReactElement {
  const counts = new Map<QueueOutcome, number>();
  for (const outcome of handled.values()) {
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }
  const worked = [...handled.values()].filter((o) => o !== 'skipped').length;
  const rows = LINE.filter(([key]) => (counts.get(key) ?? 0) > 0);

  return (
    <BottomSheet open onClose={onExit} title="Queue clear" centered>
      <div className="px-4 pb-8 pt-2">
        <p className="text-base text-gray-700">
          <span className="font-heading text-2xl font-bold tracking-[0.1em] text-gray-900">
            {worked}
          </span>{' '}
          of {total} leads worked.
        </p>

        {rows.length > 0 && (
          <dl className="mt-3 divide-y divide-gray-100">
            {rows.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <dt className="text-sm text-gray-600">{label}</dt>
                <dd className="text-sm font-semibold text-gray-900">{counts.get(key)}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onExit} className="btn-primary min-h-[40px] px-4">
            Back to the board
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

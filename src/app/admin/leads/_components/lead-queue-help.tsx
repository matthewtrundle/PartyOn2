/**
 * Keyboard cheat sheet for focus mode (`?`). A shortcut nobody can see is a
 * shortcut nobody uses — the bar shows the common ones inline, this covers the rest.
 */

'use client';

import type { ReactElement } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';

const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ['J  or  →', 'Next lead (no change recorded)'],
  ['K  or  ←', 'Back one lead'],
  ['R', 'Jump to the reply box'],
  ['C', 'Log a call, then advance'],
  ['T', 'Log a text, then advance'],
  ['Z', 'Snooze 3 days, then advance'],
  ['X', 'Mark Lost — then 1-6 picks the reason'],
  ['?', 'Show or hide this list'],
  ['Esc', 'Leave the queue (keeps an unsent draft)'],
];

export default function LeadQueueHelp({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <BottomSheet open onClose={onClose} title="Keyboard shortcuts" centered>
      <div className="px-4 pb-8 pt-2">
        <dl className="divide-y divide-gray-100">
          {SHORTCUTS.map(([key, what]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2">
              <dt>
                <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-sm font-semibold text-gray-700">
                  {key}
                </kbd>
              </dt>
              <dd className="text-sm text-gray-600">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-gray-500">
          Shortcuts pause while you are typing, so you can write a reply normally.
        </p>
      </div>
    </BottomSheet>
  );
}

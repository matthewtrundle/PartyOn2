'use client';

import { ReactElement, useState } from 'react';
import type { OrderCardData } from '@/lib/ops/orders-view-data';
import { fmtDateLong } from './format';

export type CruisePick = 'DISCO' | 'PRIVATE';

/**
 * Pre-print gate: Premier/marina orders whose cruise type is unknown block the
 * pick-sheet print until the operator marks each Private or Disco. The choice
 * is persisted per dashboard (so it sticks on future sheets) and printed on the
 * sheet. Cards without a dashboard (rare solo marina orders) apply for this
 * print only.
 */
export default function CruiseTypeGateDialog({
  cards,
  onConfirm,
  onCancel,
}: {
  cards: OrderCardData[];
  onConfirm: (picks: Record<string, CruisePick>) => void;
  onCancel: () => void;
}): ReactElement {
  const [picks, setPicks] = useState<Record<string, CruisePick>>({});
  const [saving, setSaving] = useState(false);
  const allPicked = cards.every((c) => picks[c.key]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cruise-gate-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 id="cruise-gate-title" className="text-lg font-bold text-gray-900">
            Set cruise type before printing
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {cards.length} boat {cards.length === 1 ? 'order is' : 'orders are'} missing a
            Private / Disco type. Set each so it prints on the pick sheet.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-3 space-y-3">
          {cards.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-gray-900">{c.displayName}</div>
                <div className="truncate text-sm text-gray-500">
                  {fmtDateLong(c.deliveryDate)} · {c.deliveryTime}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {(['DISCO', 'PRIVATE'] as CruisePick[]).map((t) => {
                  const active = picks[c.key] === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPicks((p) => ({ ...p, [c.key]: t }))}
                      className={`min-h-[40px] rounded-lg px-3 text-sm font-semibold transition-colors ${
                        active
                          ? t === 'DISCO'
                            ? 'bg-orange-500 text-white'
                            : 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'DISCO' ? 'Disco' : 'Private'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-[40px] rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allPicked || saving}
            onClick={async () => {
              setSaving(true);
              await onConfirm(picks);
            }}
            className="min-h-[40px] rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Set & print'}
          </button>
        </div>
      </div>
    </div>
  );
}

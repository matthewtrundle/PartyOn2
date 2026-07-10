'use client';

import { ReactElement, useState } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import HqBadge from '@/components/backend/kit/Badge';

export interface StepperVariant {
  variantId: string;
  productId: string;
  /** Variant label ("750ml", "Case of 6") — null for the default variant. */
  label: string | null;
  available: number;
  committed: number;
  trackInventory: boolean;
}

export interface StepperTarget {
  productName: string;
  variants: StepperVariant[];
}

const PRESETS = [6, 12, 24];

function stateOf(available: number): { badge: 'green' | 'amber' | 'red'; word: string } {
  if (available <= 0) return { badge: 'red', word: 'Out' };
  if (available <= 10) return { badge: 'amber', word: 'Low' };
  return { badge: 'green', word: 'In stock' };
}

/**
 * Keyboard-free stock stepper: big count, ± buttons, +6/+12/+24 presets,
 * MARK OUT, and a SAVE with live delta preview. Saves set the variant's
 * available quantity via PATCH /api/v1/inventory/variants/[id], which runs
 * adjustInventory and writes a signed InventoryMovement ledger row with the
 * reason. Multi-variant products get a picker first. Evergreen
 * (trackInventory=false) variants are informational only — they are always
 * sellable and must never be marked out here.
 *
 * Reset per target: render with key={productId or variantId} so state
 * re-initializes when a different row opens the sheet.
 */
export default function StockStepperSheet({
  target,
  onClose,
  onSaved,
}: {
  target: StepperTarget | null;
  onClose: () => void;
  onSaved: () => void;
}): ReactElement | null {
  const single = target && target.variants.length === 1 ? target.variants[0] : null;
  const [selected, setSelected] = useState<StepperVariant | null>(single);
  const [count, setCount] = useState<number>(single ? Math.max(0, single.available) : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  function pick(v: StepperVariant): void {
    setSelected(v);
    setCount(Math.max(0, v.available));
    setError(null);
  }

  async function save(): Promise<void> {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/inventory/variants/${selected.variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available: count,
          reason: `HQ catalog stepper (${Math.max(0, selected.available)} → ${count})`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save stock');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('Failed to save stock');
    } finally {
      setSaving(false);
    }
  }

  const startAvailable = selected ? Math.max(0, selected.available) : 0;
  const dirty = selected !== null && count !== startAvailable;
  const state = stateOf(count);

  return (
    <BottomSheet open onClose={onClose} title="Stock">
      <div className="pb-3">
        {/* Product header */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{target.productName}</p>
            {selected?.label && <p className="text-sm text-gray-500">{selected.label}</p>}
          </div>
          {selected && selected.trackInventory && (
            <HqBadge variant={selected.available < 0 ? 'solid-red' : state.badge}>
              {selected.available < 0 ? 'Oversold' : state.word}
            </HqBadge>
          )}
        </div>

        {/* Variant picker (multi-variant products) */}
        {!selected && (
          <div className="mt-2 divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {target.variants.map((v) => (
              <button
                key={v.variantId}
                type="button"
                onClick={() => pick(v)}
                className="w-full min-h-[52px] px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-gray-50 touch-manipulation"
              >
                <span className="text-sm font-semibold text-gray-900">{v.label || 'Default'}</span>
                <span className="text-sm font-bold text-gray-600 tabular-nums">
                  {v.trackInventory ? `${v.available} avail` : 'evergreen'}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected && !selected.trackInventory && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Evergreen item — always sellable, stock isn&apos;t tracked. Nothing to adjust here;
            use the advanced inventory page if you really need to change tracking.
          </div>
        )}

        {selected && selected.trackInventory && (
          <>
            {selected.committed > 0 && (
              <p className="text-sm text-gray-500 mb-1">
                {selected.committed} committed to paid orders (kept separate — you&apos;re setting what&apos;s left to sell)
              </p>
            )}

            {/* Big count + steppers */}
            <div className="flex items-center justify-center gap-5 my-4">
              <button
                type="button"
                onClick={() => setCount(Math.max(0, count - 1))}
                disabled={count <= 0 || saving}
                aria-label="Decrease"
                className="w-16 h-16 rounded-xl border-2 border-gray-300 text-gray-700 text-3xl font-bold flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 touch-manipulation"
              >
                −
              </button>
              <div className="w-28 text-center">
                <span className="font-heading font-bold text-7xl leading-none text-gray-900 tabular-nums">
                  {count}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCount(count + 1)}
                disabled={saving}
                aria-label="Increase"
                className="w-16 h-16 rounded-xl bg-brand-blue text-white text-3xl font-bold flex items-center justify-center hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 touch-manipulation"
              >
                ＋
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCount(count + p)}
                  disabled={saving}
                  className="min-h-[48px] rounded-lg border border-gray-300 text-gray-800 font-heading font-bold text-base tracking-[0.05em] hover:bg-gray-50 disabled:opacity-40 touch-manipulation"
                >
                  +{p}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="grid grid-cols-[1fr_1.6fr] gap-2">
              <button
                type="button"
                onClick={() => setCount(0)}
                disabled={saving || count === 0}
                className="min-h-[52px] rounded-lg border-2 border-red-300 text-red-700 font-heading font-bold text-sm tracking-[0.08em] uppercase hover:bg-red-50 disabled:opacity-40 touch-manipulation"
              >
                Mark out
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className="min-h-[52px] rounded-lg bg-brand-yellow text-gray-900 font-heading font-bold text-base tracking-[0.08em] uppercase hover:bg-yellow-400 active:bg-yellow-500 disabled:opacity-50 touch-manipulation"
              >
                {saving ? 'Saving…' : dirty ? `Save — ${startAvailable} → ${count}` : 'Save'}
              </button>
            </div>

            {target.variants.length > 1 && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-2 min-h-[44px] text-sm font-semibold text-brand-blue touch-manipulation"
              >
                ← All variants
              </button>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

'use client';

/**
 * Dismiss-with-reason modal. Reason is required — submit is blocked while
 * the trimmed field is empty. Per docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md
 * §5d, reasons feed the future heuristic suppression loop.
 */

import { useState, type ReactElement } from 'react';
import type { RecommendationCardData } from '@/lib/recommendations/card-types';

export interface DismissModalProps {
  rec: RecommendationCardData;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

export function DismissModal({
  rec,
  isSaving,
  onCancel,
  onSubmit,
}: DismissModalProps): ReactElement {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const tooShort = trimmed.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dismiss-modal-heading"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dismiss-modal-heading" className="text-lg font-semibold text-gray-900">
          Dismiss — why?
        </h2>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{rec.title}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this rec being dismissed? (Required — feeds the heuristic suppression loop.)"
          rows={5}
          className="w-full mt-4 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          autoFocus
        />
        <div className="text-xs mt-2 text-gray-500">
          {tooShort ? 'Required — explain the dismiss reason.' : `${trimmed.length} chars`}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(trimmed)}
            disabled={isSaving || tooShort}
            className="px-4 py-2 text-sm rounded-lg font-semibold disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 min-h-[44px]"
          >
            {isSaving ? '…' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}

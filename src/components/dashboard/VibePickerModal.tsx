'use client';

import { useState, useEffect, type ReactElement } from 'react';
import type { PartyType } from '@/lib/group-orders-v2/types';
import { vibesForPicker, type HeroVibe } from '@/lib/dashboard/heroVibes';
import { updateGroupOrderV2 } from '@/lib/group-orders-v2/api-client';

/**
 * Modal grid of background "vibes" the customer can pick for their hero.
 *
 * UX:
 *  - Two sections: "Recommended for your {partyType}" (matching affinity)
 *    and "All vibes" (everything else).
 *  - Tapping a thumbnail PREVIEWS the choice in the modal -- the dashboard
 *    behind stays on its current vibe until Save is tapped. This avoids
 *    accidental commits and saves on API calls.
 *  - Save commits to the server; Cancel discards.
 *  - "Reset to default" clears heroVibeKey to null, falling back to the
 *    party-type default.
 *
 * The modal is mounted by the dashboard page. WelcomeHero just calls
 * onVibePickerOpen() to flip a boolean in the page state.
 */

export interface VibePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current vibe key on the dashboard (server-side truth). */
  currentVibeKey: string | null;
  partyType: PartyType | null;
  shareCode: string;
  /** Caller's participant id -- sent with the save so the server can verify host status. */
  participantId: string;
  /** Called after a successful save so the page can refetch. */
  onSaved: () => void;
}

/**
 * A single vibe card. Renders the gradient (or photo if authored) as a
 * 16:9 thumbnail with the label centered. Selected state shows a yellow
 * ring + checkmark.
 */
function VibeCard({
  vibe,
  selected,
  onSelect,
}: {
  vibe: HeroVibe;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative aspect-[16/9] rounded-xl overflow-hidden transition-all ${
        selected
          ? 'ring-4 ring-brand-yellow shadow-warm-md scale-[1.02]'
          : 'ring-1 ring-black/10 hover:ring-2 hover:ring-brand-yellow/60 hover:shadow-warm-sm'
      }`}
      aria-pressed={selected}
      aria-label={`Select vibe: ${vibe.label}`}
    >
      <div
        className="absolute inset-0"
        style={
          vibe.photoUrl
            ? { backgroundImage: `url(${vibe.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: vibe.gradient }
        }
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
      <span className="absolute bottom-2 left-2 right-2 text-left font-heading font-semibold text-white text-xs md:text-sm tracking-[0.04em] uppercase">
        {vibe.label}
      </span>
      {selected && (
        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-yellow flex items-center justify-center shadow-warm-sm">
          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default function VibePickerModal({
  isOpen,
  onClose,
  currentVibeKey,
  partyType,
  shareCode,
  participantId,
  onSaved,
}: VibePickerModalProps): ReactElement | null {
  // Local "draft" selection -- previewed in the modal, committed on Save.
  // null means "no vibe / use party-type default" (the explicit Reset button).
  const [draftKey, setDraftKey] = useState<string | null>(currentVibeKey);
  const [saving, setSaving] = useState(false);
  // Reset draft whenever the modal opens fresh (or the current truth changes
  // underneath us via a separate update).
  useEffect(() => {
    if (isOpen) setDraftKey(currentVibeKey);
  }, [isOpen, currentVibeKey]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { recommended, others } = vibesForPicker(partyType);
  const dirty = draftKey !== currentVibeKey;

  async function handleSave() {
    if (!dirty) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      // Empty string -> server clears to null -> party-type default returns.
      await updateGroupOrderV2(shareCode, participantId, {
        heroVibeKey: draftKey === null ? null : draftKey,
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error('Failed to save vibe:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a background vibe"
    >
      <div
        className="bg-cream rounded-t-2xl md:rounded-2xl shadow-warm-lg w-full md:max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-black/5">
          <div>
            <h2 className="font-heading font-bold text-xl md:text-2xl tracking-[0.06em] text-gray-900">
              Pick your vibe
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Background mood for your dashboard hero.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-6">
          {recommended.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gold mb-2.5">
                Recommended for you
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {recommended.map((v) => (
                  <VibeCard
                    key={v.key}
                    vibe={v}
                    selected={draftKey === v.key}
                    onSelect={() => setDraftKey(v.key)}
                  />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-2.5">
                {recommended.length > 0 ? 'All other vibes' : 'All vibes'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {others.map((v) => (
                  <VibeCard
                    key={v.key}
                    vibe={v}
                    selected={draftKey === v.key}
                    onSelect={() => setDraftKey(v.key)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-t border-black/5">
          <button
            type="button"
            onClick={() => setDraftKey(null)}
            disabled={draftKey === null}
            className="text-sm font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-5 py-2.5 min-h-[44px] bg-brand-yellow text-gray-900 text-sm font-semibold tracking-[0.04em] rounded-xl hover:bg-yellow-400 active:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-warm-sm"
            >
              {saving ? 'Saving...' : 'Save vibe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

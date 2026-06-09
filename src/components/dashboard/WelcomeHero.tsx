'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import Image from 'next/image';
import type { GroupOrderV2Full, SubOrderFull, PartyType } from '@/lib/group-orders-v2/types';
import { welcomeCopyFor } from '@/lib/dashboard/welcomeCopy';
import { heroImageForPartyType } from '@/lib/dashboard/heroImageForPartyType';
import { heroVibeByKey } from '@/lib/dashboard/heroVibes';
import { updateGroupOrderV2 } from '@/lib/group-orders-v2/api-client';

/**
 * The dashboard's "Opening Moment" -- a full-bleed lifestyle hero with the
 * editable identity of the party (title + subtitle) and a discreet
 * background-vibe picker.
 *
 * Design pillars:
 *  - The H1 IS the dashboard name (was up in the header, now lives here
 *    where it earns the gradient's screen space).
 *  - The subtitle line below the H1 is also editable. Empty subtitle falls
 *    back to a smart default: "{Month Day} · {City}" when the active tab
 *    has a confirmed delivery, otherwise the Fraunces-italic welcome copy.
 *  - Eyebrow above the H1 stays category-only (party type label). Not
 *    editable -- it's a category, not personal.
 *  - Background priority: heroVibe gradient (if customer picked one) >
 *    party-type photo (when authored) > generic warm gradient.
 *  - A paintbrush button bottom-right opens the vibe picker modal mounted
 *    by the parent page.
 *
 * Inline editing pattern mirrors the original DashboardHeader rename UX --
 * click to edit, Enter or blur to save, Escape to cancel. API call is the
 * existing updateGroupOrderV2 PATCH endpoint.
 */

export interface WelcomeHeroProps {
  groupOrder: GroupOrderV2Full;
  /** The currently selected tab -- used to derive the smart subtitle default. */
  activeTab: SubOrderFull;
  /** Participant id of the current viewer (host or guest). */
  participantId: string;
  /** Whether the current viewer is a host. Guests see read-only display. */
  isHost: boolean;
  /** Whether the order is locked (delivery cut-off passed). Disables inline edits even for hosts. */
  isLocked: boolean;
  /** Whether tabs render above this hero -- affects the top-left radius. */
  hasTabsAbove?: boolean;
  /** Called after a successful rename or vibe change so the page can refetch. */
  onChanged: () => void;
  /** Called when the paintbrush button is tapped -- parent owns the modal mount. */
  onVibePickerOpen: () => void;
}

/**
 * Smart subtitle default. Used when the stored subtitle is null/empty.
 *
 * Order of preference:
 *   1. "{Month Day} · {City}" -- when the active tab has a confirmed
 *      delivery date AND a city. Customer feels the page knows where/when.
 *   2. welcomeCopy.subhead -- the Fraunces-italic mood copy for this
 *      party type. Friendly fallback before delivery is dialed in.
 */
function smartSubtitleFor(
  tab: SubOrderFull,
  partyType: PartyType | null
): string {
  if (tab.deliveryDateConfirmed && tab.deliveryAddress?.city) {
    try {
      const d = new Date(tab.deliveryDate);
      if (!isNaN(d.getTime())) {
        const month = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
        const day = d.getUTCDate();
        return `${month} ${day} · ${tab.deliveryAddress.city}`;
      }
    } catch {
      // fall through to welcome copy
    }
  }
  return welcomeCopyFor(partyType).subhead;
}

/**
 * A warm CSS gradient stand-in used when no vibe is selected and no
 * party-type photo is authored. "Saturday morning sunlight" mood.
 */
function WarmGradient(): ReactElement {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #FAF6EE 0%, #F2D34F 55%, #D4AF37 85%, #B8941E 100%)',
        }}
      />
      <div
        className="absolute right-[18%] top-[35%] w-32 h-32 rounded-full opacity-40 blur-2xl"
        style={{ background: 'radial-gradient(circle, #FFF8DC 0%, transparent 70%)' }}
      />
      <div
        className="absolute left-0 right-0 bottom-[35%] h-px opacity-30"
        style={{ background: 'linear-gradient(90deg, transparent, #8B6914, transparent)' }}
      />
    </div>
  );
}

export default function WelcomeHero({
  groupOrder,
  activeTab,
  participantId,
  isHost,
  isLocked,
  hasTabsAbove = true,
  onChanged,
  onVibePickerOpen,
}: WelcomeHeroProps): ReactElement {
  const copy = welcomeCopyFor(groupOrder.partyType);
  // Edits are gated on host AND not locked. Guests see the same hero, just
  // without click affordances or the vibe button.
  const canEdit = isHost && !isLocked;

  // --- Background selection ---
  // Priority: customer-picked vibe -> party-type photo -> warm gradient.
  const vibe = heroVibeByKey(groupOrder.heroVibeKey);
  const partyTypePhoto = heroImageForPartyType(groupOrder.partyType);
  const photoUrl = vibe?.photoUrl ?? partyTypePhoto ?? null;
  const vibeGradient = vibe && !vibe.photoUrl ? vibe.gradient : null;

  // --- Inline edit: title (groupOrder.name) ---
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(groupOrder.name);
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setNameValue(groupOrder.name); }, [groupOrder.name]);
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  async function saveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === groupOrder.name) {
      setEditingName(false);
      setNameValue(groupOrder.name);
      return;
    }
    setSavingName(true);
    try {
      await updateGroupOrderV2(groupOrder.shareCode, participantId, { name: trimmed });
      onChanged();
    } catch (e) {
      console.error('Failed to save dashboard name:', e);
      setNameValue(groupOrder.name);
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }

  // --- Inline edit: subtitle (groupOrder.subtitle) ---
  // The displayed text falls back to the smart default when subtitle is null
  // or empty. When editing, the input starts EMPTY if no override is stored
  // -- this lets the customer "fill in" rather than "edit away" the default.
  const subtitleDisplay = groupOrder.subtitle?.trim()
    ? groupOrder.subtitle
    : smartSubtitleFor(activeTab, groupOrder.partyType);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [subtitleValue, setSubtitleValue] = useState(groupOrder.subtitle ?? '');
  const [savingSubtitle, setSavingSubtitle] = useState(false);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setSubtitleValue(groupOrder.subtitle ?? ''); }, [groupOrder.subtitle]);
  useEffect(() => {
    if (editingSubtitle && subtitleInputRef.current) {
      subtitleInputRef.current.focus();
      subtitleInputRef.current.select();
    }
  }, [editingSubtitle]);

  async function saveSubtitle() {
    const trimmed = subtitleValue.trim();
    // Empty string -> null -> smart default returns. We compare to the
    // STORED value (null/empty), not the displayed one.
    const storedNorm = groupOrder.subtitle?.trim() ?? '';
    if (trimmed === storedNorm) {
      setEditingSubtitle(false);
      return;
    }
    setSavingSubtitle(true);
    try {
      await updateGroupOrderV2(groupOrder.shareCode, participantId, {
        // empty -> null on the wire, server clears the column
        subtitle: trimmed === '' ? null : trimmed,
      });
      onChanged();
    } catch (e) {
      console.error('Failed to save subtitle:', e);
      setSubtitleValue(groupOrder.subtitle ?? '');
    } finally {
      setSavingSubtitle(false);
      setEditingSubtitle(false);
    }
  }

  return (
    <section data-tour="welcome-hero" className="relative">
      <div
        className={`relative overflow-hidden rounded-2xl ${hasTabsAbove ? 'rounded-tl-none' : ''} h-[200px] md:h-[280px]`}
      >
        {/* Background layer */}
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1024px"
          />
        ) : vibeGradient ? (
          <div className="absolute inset-0" style={{ background: vibeGradient }} />
        ) : (
          <WarmGradient />
        )}
        {/* Dark scrim for legible white type at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/55" />

        {/* Copy block -- bottom-left anchored */}
        <div className="absolute inset-0 p-4 md:p-8 flex flex-col justify-end">
          {/* Eyebrow -- auto, not editable */}
          <p className="font-heading font-semibold text-[11px] md:text-sm tracking-[0.18em] uppercase text-brand-yellow">
            {copy.eyebrow}
            {isLocked && (
              <span className="ml-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-100 bg-red-600/80 px-1.5 py-0.5 rounded">
                Locked
              </span>
            )}
          </p>

          {/* Title (H1) -- inline-editable, click to rename */}
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') {
                  setNameValue(groupOrder.name);
                  setEditingName(false);
                }
              }}
              maxLength={200}
              disabled={savingName}
              className="mt-1.5 font-heading font-bold text-3xl md:text-5xl tracking-[0.06em] text-white leading-tight bg-transparent border-b-2 border-brand-yellow outline-none w-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => canEdit && setEditingName(true)}
              disabled={!canEdit}
              className="mt-1.5 group flex items-center gap-2 text-left min-w-0 disabled:cursor-default"
              title={!canEdit ? (isLocked ? 'Order is locked' : 'Only hosts can rename') : 'Click to rename'}
            >
              <h1 className="font-heading font-bold text-3xl md:text-5xl tracking-[0.06em] text-white leading-tight truncate">
                {groupOrder.name}
              </h1>
              {canEdit && (
                <svg
                  className="w-4 h-4 md:w-5 md:h-5 text-white/60 group-hover:text-brand-yellow transition-colors flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </button>
          )}

          {/* Subtitle -- inline-editable, smart default when empty */}
          {editingSubtitle ? (
            <input
              ref={subtitleInputRef}
              value={subtitleValue}
              onChange={(e) => setSubtitleValue(e.target.value)}
              onBlur={saveSubtitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveSubtitle();
                if (e.key === 'Escape') {
                  setSubtitleValue(groupOrder.subtitle ?? '');
                  setEditingSubtitle(false);
                }
              }}
              placeholder={smartSubtitleFor(activeTab, groupOrder.partyType)}
              maxLength={200}
              disabled={savingSubtitle}
              className="mt-1 font-fraunces italic text-white/95 text-lg md:text-2xl bg-transparent border-b border-white/40 outline-none w-full placeholder:text-white/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => canEdit && setEditingSubtitle(true)}
              disabled={!canEdit}
              className="mt-1 text-left group max-w-full disabled:cursor-default"
              title={!canEdit ? (isLocked ? 'Order is locked' : 'Only hosts can edit') : 'Click to edit subtitle'}
            >
              <span className={`font-fraunces italic text-white/95 text-lg md:text-2xl ${canEdit ? 'group-hover:underline decoration-white/40 underline-offset-4' : ''}`}>
                {subtitleDisplay}
              </span>
            </button>
          )}
        </div>

        {/* Vibe picker trigger -- bottom-right floating button. SVG paintbrush.
            Hosts only. Locked dashboards also hide it. */}
        {canEdit && (
          <button
            type="button"
            onClick={onVibePickerOpen}
            className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white text-xs md:text-sm font-semibold tracking-[0.04em] rounded-full transition-colors"
            aria-label="Change background vibe"
            title="Change background vibe"
          >
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Change vibe
          </button>
        )}
      </div>
    </section>
  );
}

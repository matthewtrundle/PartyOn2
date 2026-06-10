'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { GroupOrderV2Full } from '@/lib/group-orders-v2/types';
import ParticipantPanel from './ParticipantPanel';

/**
 * Dashboard header -- the sticky strip at the top of every dashboard page.
 *
 * After the WelcomeHero rewrite this is just nav: logo on the left, share
 * + participants on the right. The editable dashboard title that used to
 * live here is gone -- it moved into the hero where it earns its space.
 * The `Locked` badge that used to render here also moved into the hero's
 * eyebrow line so the header stays nav-only.
 */

interface Props {
  groupOrder: GroupOrderV2Full;
  participantId: string;
  // isLocked is still accepted from the parent for backwards compatibility,
  // but no longer rendered here. Kept on the interface so the parent doesn't
  // need a one-off conditional. The hero handles the locked-state badge now.
  isLocked: boolean;
  onRefresh: () => void;
  onShareClick: () => void;
}

export default function DashboardHeader({
  groupOrder,
  participantId,
  isLocked,
  onRefresh,
  onShareClick,
}: Props): ReactElement {
  const [showParticipants, setShowParticipants] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeParticipants = groupOrder.participants.filter(
    (p) => p.status === 'ACTIVE'
  );
  const otherNames = activeParticipants
    .filter((p) => p.id !== participantId)
    .map((p) => p.name);

  // Close panel on outside click
  useEffect(() => {
    if (!showParticipants) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowParticipants(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showParticipants]);

  return (
    // Direction E: translucent cream + soft black border instead of solid
    // white + hard gray-200. The blur lets a hint of the photo hero peek
    // through as the user scrolls.
    <header className="bg-cream/85 backdrop-blur-md border-b border-black/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* logo | flex spacer | share + people */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/pod-logo-2025.svg"
              alt="Party On"
              width={130}
              height={40}
              className="h-8 w-auto"
            />
          </Link>

          {/* Empty flex spacer pushes actions to the right edge. */}
          <div className="flex-1" aria-hidden />

          <div className="flex items-center gap-3">
            {/* Share button */}
            <button
              data-tour="share-button"
              onClick={onShareClick}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-blue hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>

            {/* Participant count button */}
            <div className="relative" ref={panelRef} data-tour="participants">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-black/10 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">
                  {activeParticipants.length === 1
                    ? 'Just you'
                    : otherNames.length === 0
                      ? `${activeParticipants.length} people`
                      : `You + ${otherNames.slice(0, 2).join(', ')}${otherNames.length > 2 ? ` +${otherNames.length - 2}` : ''}`
                  }
                </span>
                <span className="md:hidden font-semibold">{activeParticipants.length}</span>
              </button>

              {showParticipants && (
                <ParticipantPanel
                  shareCode={groupOrder.shareCode}
                  tabId={groupOrder.tabs[0]?.id ?? ''}
                  participantId={participantId}
                  participants={groupOrder.participants}
                  isLocked={isLocked}
                  onClose={() => setShowParticipants(false)}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { GroupOrderV2Full } from '@/lib/group-orders-v2/types';
import { updateGroupOrderV2 } from '@/lib/group-orders-v2/api-client';
import { parseTitleMarkup } from '@/lib/dashboard/parse-title-markup';
import ParticipantPanel from './ParticipantPanel';

interface Props {
  groupOrder: GroupOrderV2Full;
  participantId: string;
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
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeParticipants = groupOrder.participants.filter(
    (p) => p.status === 'ACTIVE'
  );
  const otherNames = activeParticipants
    .filter((p) => p.id !== participantId)
    .map((p) => p.name);

  const tab = groupOrder.tabs[0];
  const hostLabel = groupOrder.hostName === 'Party Host' ? 'Host' : groupOrder.hostName;
  const rawName = groupOrder.name;
  const displayName = (!rawName || rawName === "Party Host's Order")
    ? `${hostLabel}'s Party`
    : rawName;

  // Focus name input when entering edit mode
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  function startEditingName() {
    setNameValue(displayName);
    setEditingName(true);
  }

  async function saveOrderName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateGroupOrderV2(groupOrder.shareCode, { name: trimmed });
      onRefresh();
    } catch {
      // Silently fail
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }

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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top row: logo, title, actions */}
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

          {/* Title -- truncates on mobile to avoid overlapping buttons */}
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => saveOrderName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveOrderName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                maxLength={100}
                disabled={savingName}
                className="text-xl md:text-3xl font-heading font-bold tracking-[0.06em] text-gray-900 bg-transparent border-b-2 border-brand-blue outline-none text-center w-full"
              />
            ) : (
              <button
                onClick={startEditingName}
                className="group flex items-center gap-2 cursor-pointer hover:opacity-80 min-w-0"
              >
                <h1 className="text-xl md:text-3xl font-heading font-bold tracking-[0.06em] text-gray-900 truncate">
                  {parseTitleMarkup(displayName)}
                </h1>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-blue transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {isLocked && (
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                Locked
              </span>
            )}
          </div>

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
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">
                  {activeParticipants.length === 1
                    ? 'Just you'
                    : `You + ${otherNames.slice(0, 2).join(', ')}${otherNames.length > 2 ? ` +${otherNames.length - 2}` : ''}`}
                </span>
                <span className="md:hidden flex items-center justify-center w-5 h-5 bg-brand-blue text-white text-xs font-bold rounded-full">{activeParticipants.length}</span>
              </button>

              {showParticipants && tab && (
                <ParticipantPanel
                  shareCode={groupOrder.shareCode}
                  tabId={tab.id}
                  participantId={participantId}
                  participants={groupOrder.participants}
                  isLocked={isLocked}
                  onRefresh={() => {
                    onRefresh();
                    setShowParticipants(false);
                  }}
                  onClose={() => setShowParticipants(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

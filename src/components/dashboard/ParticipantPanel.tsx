'use client';

import { useState, type ReactElement } from 'react';
import type { ParticipantSummary } from '@/lib/group-orders-v2/types';
import {
  removeParticipantV2,
  updateTabV2,
  transferHostV2,
  updateParticipantNameV2,
} from '@/lib/group-orders-v2/api-client';

interface Props {
  shareCode: string;
  tabId: string;
  participantId: string;
  participants: ParticipantSummary[];
  isLocked: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export default function ParticipantPanel({
  shareCode,
  tabId,
  participantId,
  participants,
  isLocked,
  onRefresh,
  onClose,
}: Props): ReactElement {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmMakeHostId, setConfirmMakeHostId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [locking, setLocking] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  const isHost = participants.find((p) => p.id === participantId)?.isHost ?? false;

  async function handleSaveName(pid: string) {
    if (!editNameValue.trim()) return;
    setSavingName(true);
    try {
      await updateParticipantNameV2(shareCode, pid, editNameValue.trim());
      setEditingNameId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setSavingName(false);
    }
  }
  const activeParticipants = participants.filter((p) => p.status === 'ACTIVE');

  async function handleRemove(pid: string) {
    setRemovingId(pid);
    try {
      await removeParticipantV2(shareCode, pid, participantId);
      setConfirmRemoveId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to remove participant:', err);
      alert(err instanceof Error ? err.message : 'Could not remove this person.');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleMakeHost(newHostId: string) {
    setTransferring(true);
    try {
      await transferHostV2(shareCode, participantId, newHostId);
      setConfirmMakeHostId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to transfer host:', err);
    } finally {
      setTransferring(false);
    }
  }

  async function handleToggleLock() {
    setLocking(true);
    try {
      await updateTabV2(shareCode, tabId, {
        participantId,
        status: isLocked ? 'OPEN' : 'LOCKED',
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    } finally {
      setLocking(false);
    }
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-white shadow-xl rounded-xl border border-gray-200 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold tracking-[0.08em] text-gray-900">
          Participants ({activeParticipants.length})
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
        {activeParticipants.map((p) => (
          <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              {editingNameId === p.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName(p.id);
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    disabled={savingName}
                    autoFocus
                    className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-1.5 py-0.5 w-28 focus:border-brand-blue focus:ring-0"
                  />
                  <button
                    onClick={() => handleSaveName(p.id)}
                    disabled={savingName || !editNameValue.trim()}
                    className="text-xs text-brand-blue hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {savingName ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingNameId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium text-gray-900 truncate ${p.id === participantId ? 'cursor-pointer hover:text-brand-blue' : ''}`}
                  onClick={() => {
                    if (p.id === participantId) {
                      setEditingNameId(p.id);
                      setEditNameValue(p.name);
                    }
                  }}
                  title={p.id === participantId ? 'Click to edit your name' : undefined}
                >
                  {p.name}
                </span>
                {p.isHost && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded">
                    Host
                  </span>
                )}
                {p.id === participantId && !p.isHost && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              )}
              {editingNameId !== p.id && (
              <p className="text-xs text-gray-400">
                {p.id === participantId ? 'Tap name to edit' : `Joined ${new Date(p.joinedAt).toLocaleDateString()}`}
              </p>
              )}
            </div>

            {isHost && !p.isHost && p.id !== participantId && (
              <div className="flex items-center gap-2">
                {confirmMakeHostId === p.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMakeHost(p.id)}
                      disabled={transferring}
                      className="text-xs text-brand-blue hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      {transferring ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmMakeHostId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : confirmRemoveId === p.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRemove(p.id)}
                      disabled={removingId === p.id}
                      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                    >
                      {removingId === p.id ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmMakeHostId(p.id)}
                      className="text-xs text-brand-blue hover:text-blue-700 font-medium"
                    >
                      Make Host
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(p.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isHost && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <button
            onClick={handleToggleLock}
            disabled={locking}
            className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              isLocked
                ? 'bg-brand-blue text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {locking
              ? 'Updating...'
              : isLocked
              ? 'Unlock Order'
              : 'Lock Order'}
          </button>
        </div>
      )}
    </div>
  );
}

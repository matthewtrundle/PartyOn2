'use client';

import { useState, ReactElement } from 'react';
import {
  updateGroupOrderV2,
  cancelGroupOrderV2,
  updateTabV2,
  deleteTabV2,
} from '@/lib/group-orders-v2/api-client';
import type { GroupOrderV2Full, SubOrderFull } from '@/lib/group-orders-v2/types';

interface Props {
  groupOrder: GroupOrderV2Full;
  activeTab: SubOrderFull | undefined;
  hostParticipantId: string;
  onRefresh: () => void;
}

export default function HostControlBar({
  groupOrder,
  activeTab,
  hostParticipantId,
  onRefresh,
}: Props): ReactElement {
  const [loading, setLoading] = useState('');

  const code = groupOrder.shareCode;
  const isCancelled = groupOrder.status === 'CANCELLED';
  const isClosed = groupOrder.status === 'CLOSED';

  const handleCloseGroup = async () => {
    if (!confirm('Close this group? No new participants can join, but existing members can still checkout.')) return;
    setLoading('close');
    try {
      await updateGroupOrderV2(code, hostParticipantId, { status: 'CLOSED' });
      onRefresh();
    } catch (err) {
      console.error('Failed to close group:', err);
    } finally {
      setLoading('');
    }
  };

  const handleReopenGroup = async () => {
    setLoading('reopen');
    try {
      await updateGroupOrderV2(code, hostParticipantId, { status: 'ACTIVE' });
      onRefresh();
    } catch (err) {
      console.error('Failed to reopen group:', err);
    } finally {
      setLoading('');
    }
  };

  const handleCancelGroup = async () => {
    if (!confirm('Cancel this entire group order? This cannot be undone. Purchased items are unaffected.')) return;
    setLoading('cancel');
    try {
      await cancelGroupOrderV2(code, hostParticipantId);
      onRefresh();
    } catch (err) {
      console.error('Failed to cancel group:', err);
      alert(err instanceof Error ? err.message : 'Could not cancel this order.');
    } finally {
      setLoading('');
    }
  };

  const handleToggleTabLock = async () => {
    if (!activeTab) return;
    const newStatus = activeTab.status === 'LOCKED' ? 'OPEN' : 'LOCKED';
    const msg = newStatus === 'LOCKED'
      ? 'Lock this tab? Participants cannot add or modify items.'
      : 'Unlock this tab? Participants can add items again.';
    if (!confirm(msg)) return;
    setLoading('lockTab');
    try {
      await updateTabV2(code, activeTab.id, {
        participantId: hostParticipantId,
        status: newStatus,
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle tab lock:', err);
    } finally {
      setLoading('');
    }
  };

  const handleDeleteTab = async () => {
    if (!activeTab) return;
    if (!confirm(`Delete "${activeTab.name}"? Draft items will be removed. Purchased items are unaffected.`)) return;
    setLoading('deleteTab');
    try {
      await deleteTabV2(code, activeTab.id, hostParticipantId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete tab:', err);
      alert(err instanceof Error ? err.message : 'Could not delete this tab.');
    } finally {
      setLoading('');
    }
  };

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-base text-red-700">
        This group order has been cancelled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group-level controls */}
      <div className="flex flex-wrap gap-3">
        {isClosed ? (
          <button
            onClick={handleReopenGroup}
            disabled={!!loading}
            className="px-4 py-2 text-base font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            {loading === 'reopen' ? 'Reopening...' : 'Reopen Group'}
          </button>
        ) : (
          <button
            onClick={handleCloseGroup}
            disabled={!!loading}
            className="px-4 py-2 text-base font-semibold rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
          >
            {loading === 'close' ? 'Closing...' : 'Close Group'}
          </button>
        )}
        <button
          onClick={handleCancelGroup}
          disabled={!!loading}
          className="px-4 py-2 text-base font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {loading === 'cancel' ? 'Cancelling...' : 'Cancel Group'}
        </button>
      </div>

      {/* Tab-level controls */}
      {activeTab && activeTab.status !== 'CANCELLED' && activeTab.status !== 'FULFILLED' && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-base text-gray-500 mb-3">
            Tab: <span className="font-semibold text-gray-900">{activeTab.name}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleToggleTabLock}
              disabled={!!loading}
              className={`px-4 py-2 text-base font-semibold rounded-lg disabled:opacity-50 transition-colors ${
                activeTab.status === 'LOCKED'
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {loading === 'lockTab'
                ? 'Updating...'
                : activeTab.status === 'LOCKED'
                ? 'Unlock Tab'
                : 'Lock Tab'}
            </button>
            <button
              onClick={handleDeleteTab}
              disabled={!!loading}
              className="px-4 py-2 text-base font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {loading === 'deleteTab' ? 'Deleting...' : 'Delete Tab'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

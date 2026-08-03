'use client';

import { useState, useEffect, ReactElement } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useGroupOrderV2 } from '@/lib/group-orders-v2/hooks';
import { removeParticipantV2 } from '@/lib/group-orders-v2/api-client';
import GroupHeader from '@/components/group-v2/GroupHeader';
import TabBar from '@/components/group-v2/TabBar';
import TabContent from '@/components/group-v2/TabContent';
import ParticipantList from '@/components/group-v2/ParticipantList';
import HostControlBar from '@/components/group-v2/HostControlBar';
import MobileCheckoutBar from '@/components/group-v2/MobileCheckoutBar';
import CheckoutSummaryModal from '@/components/group-v2/CheckoutSummaryModal';
import DashboardSkeleton from '@/components/group-v2/DashboardSkeleton';
import CreateTabModal from '@/components/group-v2/CreateTabModal';
import ShareGroupModal from '@/components/group-v2/ShareGroupModal';
import GroupProductCatalog from '@/components/group-v2/GroupProductCatalog';

export default function DashboardPage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const { groupOrder, isLoading, error, refresh } = useGroupOrderV2(code);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Restore participant ID from localStorage (scoped to this group code)
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem('groupV2Code');
      const savedPid = localStorage.getItem('groupV2ParticipantId');
      if (savedPid && savedCode === code) setParticipantId(savedPid);
    } catch {
      // localStorage may be unavailable (private browsing, SSR)
    }
  }, [code]);

  // Set first tab as active, or reset if active tab was deleted
  useEffect(() => {
    const tabs = groupOrder?.tabs || [];
    if (!groupOrder || tabs.length === 0) return;
    const activeStillExists = activeTabId && tabs.some((t) => t.id === activeTabId);
    if (!activeStillExists) {
      setActiveTabId(tabs[0].id);
    }
  }, [groupOrder, activeTabId]);

  // Redirect if not a participant
  useEffect(() => {
    if (groupOrder && participantId) {
      const isParticipant = (groupOrder.participants || []).some(
        (p) => p.id === participantId && p.status === 'ACTIVE'
      );
      if (!isParticipant) {
        router.push(`/group/${code}`);
      }
    }
  }, [groupOrder, participantId, code, router]);

  const isHost = !!(groupOrder?.participants || []).find(
    (p) => p.id === participantId && p.isHost
  );

  const handleRemoveParticipant = async (pid: string) => {
    if (!participantId || !confirm('Remove this participant? Their draft items will be deleted.')) return;
    try {
      await removeParticipantV2(code, pid, participantId);
      refresh();
    } catch (err) {
      console.error('Failed to remove participant:', err);
      alert(err instanceof Error ? err.message : 'Could not remove this person.');
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !groupOrder) {
    return (
      <div className="pt-28 min-h-screen bg-whiteSoft flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Group Order Not Found
          </h1>
          <Link
            href="/order"
            className="text-brand-blue hover:underline"
          >
            Create a new group order
          </Link>
        </div>
      </div>
    );
  }

  const activeTab = (groupOrder.tabs || []).find((t) => t.id === activeTabId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - mt-24 pushes below fixed nav */}
      <GroupHeader groupOrder={groupOrder} isHost={isHost} />

      {/* Tab Bar + Share */}
      <TabBar
        tabs={groupOrder.tabs || []}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onAddTab={isHost ? () => setShowCreateTab(true) : undefined}
        isHost={isHost}
        onShare={() => setShowShare(true)}
      />

      {/* Full-width Info Bar - Participants, Summary, Host Controls */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Participants */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-heading text-xl text-gray-900 uppercase tracking-wide mb-4">
                Participants
              </h3>
              <ParticipantList
                participants={groupOrder.participants || []}
                isHost={isHost}
                onRemove={isHost ? handleRemoveParticipant : undefined}
              />
            </div>

            {/* Tab Summary */}
            {activeTab && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-heading text-xl text-gray-900 uppercase tracking-wide mb-4">
                  Order Summary
                </h3>
                <div className="space-y-3 text-lg">
                  <div className="flex justify-between text-gray-600">
                    <span>Draft Subtotal</span>
                    <span className="font-semibold">${(activeTab.totals?.draftSubtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Purchased</span>
                    <span className="font-semibold">${(activeTab.totals?.purchasedSubtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span className="font-semibold">
                      {activeTab.deliveryFeeWaived
                        ? 'Waived'
                        : `$${(activeTab.totals?.deliveryFee ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>
                      $
                      {(
                        (activeTab.totals?.draftSubtotal ?? 0) +
                        (activeTab.totals?.purchasedSubtotal ?? 0) +
                        (activeTab.deliveryFeeWaived ? 0 : (activeTab.totals?.deliveryFee ?? 0))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Host Controls */}
            {isHost && participantId && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-heading text-xl text-gray-900 uppercase tracking-wide mb-4">
                  Host Controls
                </h3>
                <HostControlBar
                  groupOrder={groupOrder}
                  activeTab={activeTab}
                  hostParticipantId={participantId}
                  onRefresh={refresh}
                />
              </div>
            )}

            {/* Empty State or Additional Info */}
            {!activeTab && (
              <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546m18-3.046c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 12.5m18-3.046c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0" />
                  </svg>
                  <p className="text-xl font-semibold text-gray-700">No items yet</p>
                  <p className="text-lg text-gray-500 mt-2">
                    Share the link to get the party started!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-width Cart Content */}
      {activeTab && (
        <div className="bg-white py-8">
          <div className="px-4 md:px-8 lg:px-12">
            <TabContent
              shareCode={code}
              tab={activeTab}
              currentParticipantId={participantId}
              isHost={isHost}
              onRefresh={refresh}
              onCheckout={() => setShowCheckout(true)}
            />
          </div>
        </div>
      )}

      {/* Full-width Product Catalog */}
      {activeTab && participantId && activeTab.status === 'OPEN' && (
        <div className="bg-gray-50 border-t border-gray-200 py-10 pb-32 md:pb-10">
          <div className="px-4 md:px-8 lg:px-12">
            <GroupProductCatalog
              shareCode={code}
              tabId={activeTab.id}
              participantId={participantId}
              orderType={activeTab.orderType}
              draftItems={activeTab.draftItems || []}
              onItemAdded={refresh}
            />
          </div>
        </div>
      )}

      {/* Create Tab Modal */}
      {participantId && (
        <CreateTabModal
          shareCode={code}
          participantId={participantId}
          isOpen={showCreateTab}
          onClose={() => setShowCreateTab(false)}
          onCreated={refresh}
        />
      )}

      {/* Mobile Sticky Checkout Bar */}
      {activeTab && (
        <MobileCheckoutBar
          items={activeTab.draftItems || []}
          participantId={participantId}
          onCheckout={() => setShowCheckout(true)}
        />
      )}

      {/* Share Group Modal */}
      <ShareGroupModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        shareCode={groupOrder.shareCode}
        groupName={groupOrder.name}
      />

      {/* Checkout Summary Modal (shared between mobile bar + inline button) */}
      {activeTab && participantId && (
        <CheckoutSummaryModal
          shareCode={code}
          tab={activeTab}
          participantId={participantId}
          items={activeTab.draftItems || []}
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}

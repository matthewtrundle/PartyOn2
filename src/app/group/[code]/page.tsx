'use client';

import { useState, useEffect, ReactElement } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchGroupOrderV2 } from '@/lib/group-orders-v2/api-client';
import type { GroupOrderV2Full } from '@/lib/group-orders-v2/types';
import JoinGroupForm from '@/components/group-v2/JoinGroupForm';

export default function JoinGroupPage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [groupOrder, setGroupOrder] = useState<GroupOrderV2Full | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchGroupOrderV2(code);
        setGroupOrder(data);

        // Check if already joined
        let savedPid: string | null = null;
        let savedCode: string | null = null;
        try {
          savedPid = localStorage.getItem('groupV2ParticipantId');
          savedCode = localStorage.getItem('groupV2Code');
        } catch {
          // localStorage may be unavailable
        }
        if (savedPid && savedCode === code) {
          const isParticipant = (data.participants || []).some(
            (p) => p.id === savedPid && p.status === 'ACTIVE'
          );
          if (isParticipant) {
            router.push(`/group/${code}/dashboard`);
            return;
          }
        }
      } catch {
        setError('Group order not found or has expired.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code, router]);

  const handleJoined = (participantId: string) => {
    try {
      localStorage.setItem('groupV2Code', code);
      localStorage.setItem('groupV2ParticipantId', participantId);
    } catch {
      // localStorage may be unavailable
    }
    router.push(`/group/${code}/dashboard`);
  };

  if (loading) {
    return (
      <div className="pt-32 pb-16 px-4 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading group order...</div>
      </div>
    );
  }

  if (error || !groupOrder) {
    return (
      <div className="pt-32 pb-16 px-4 min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Group Order Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/order"
            className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Create Your Own
          </Link>
        </div>
      </div>
    );
  }

  if (groupOrder.status !== 'ACTIVE') {
    return (
      <div className="pt-32 pb-16 px-4 min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Group Order {groupOrder.status === 'CLOSED' ? 'Closed' : 'No Longer Available'}
          </h1>
          <p className="text-gray-600">
            This group order is no longer accepting new participants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-16 px-4 min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {groupOrder.name}
          </h1>
          <p className="text-gray-600">
            Hosted by {groupOrder.hostName}
          </p>
        </div>

        {/* Tab summaries */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Deliveries
          </h3>
          {(groupOrder.tabs || []).map((tab) => (
            <div
              key={tab.id}
              className="flex justify-between items-center text-sm"
            >
              <span className="text-gray-700">{tab.name}</span>
              <span className="text-gray-500">
                {tab.deliveryDate
                  ? new Date(tab.deliveryDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                  : 'Date TBD'}
                {tab.deliveryTime && tab.deliveryTime !== 'TBD' ? ` at ${tab.deliveryTime}` : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Join Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Join This Group Order
          </h2>
          <JoinGroupForm groupOrder={groupOrder} onJoined={handleJoined} />
        </div>
      </div>
    </div>
  );
}

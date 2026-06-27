/**
 * /order/last-minute - Creates a GroupOrderV2 flagged isLastMinute and redirects
 * to /dashboard/[code]. The dashboard filters products to the "last-minute"
 * Shopify collection so customers can only pick from deep-stock items we can
 * guarantee for 48-72 hour delivery.
 */

'use client';

import { Suspense, useEffect, useState, useRef, type ReactElement } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createDashboardOrderV2 } from '@/lib/group-orders-v2/api-client';
import type { PartyType, DashboardSource, DeliveryContextType } from '@/lib/group-orders-v2/types';
import { getAffiliateDefaultAddress } from '@/lib/affiliates/presets';
import { getAttributionForDashboard } from '@/lib/analytics/attribution';

const PARTY_TYPE_MAP: Record<string, PartyType> = {
  bachelor: 'BACHELOR',
  bachelorette: 'BACHELORETTE',
  wedding: 'WEDDING',
  corporate: 'CORPORATE',
  'house-party': 'HOUSE_PARTY',
  house_party: 'HOUSE_PARTY',
  boat: 'BOAT',
  bach: 'BACH',
};

const DELIVERY_CONTEXT_MAP: Record<string, DeliveryContextType> = {
  house: 'HOUSE',
  boat: 'BOAT',
  venue: 'VENUE',
  hotel: 'HOTEL',
};

export default function LastMinuteOrderRedirectPage(): ReactElement {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img src="/images/pod-logo-2025.svg" alt="Party On" className="h-40 w-auto mx-auto mb-8" />
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Preparing your last-minute order</p>
        </div>
      </div>
    }>
      <LastMinuteRedirectInner />
    </Suspense>
  );
}

function LastMinuteRedirectInner(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const creating = useRef(false);

  useEffect(() => {
    if (creating.current) return;
    creating.current = true;

    async function createAndRedirect() {
      try {
        const ref = searchParams?.get('ref') ?? null;
        const partyParam = searchParams?.get('p') ?? null;
        const deliveryParam = searchParams?.get('d') ?? null;
        const nameParam = searchParams?.get('name') ?? null;
        const affiliateParam = searchParams?.get('a') ?? null;

        let affiliateId: string | undefined;
        let affiliateCode: string | undefined;
        let source: DashboardSource = 'DIRECT';

        if (ref) {
          try {
            const attrRes = await fetch(`/api/v1/affiliate/attribution?code=${ref}`);
            if (attrRes.ok) {
              const attrJson = await attrRes.json();
              if (attrJson.data?.affiliateId) {
                affiliateId = attrJson.data.affiliateId;
                affiliateCode = attrJson.data.affiliateCode;
                source = 'PARTNER_PAGE';
              }
            }
          } catch {
            // Non-blocking
          }
        }

        if (!affiliateId && !affiliateParam) {
          try {
            const cookieRes = await fetch('/api/v1/affiliate/attribution');
            if (cookieRes.ok) {
              const cookieJson = await cookieRes.json();
              if (cookieJson.success && cookieJson.data?.affiliateId) {
                affiliateId = cookieJson.data.affiliateId;
                source = 'PARTNER_PAGE';
              }
            }
          } catch {
            // Non-blocking
          }
        }

        if (affiliateParam) {
          affiliateId = affiliateParam;
          source = 'PARTNER_PAGE';
        }

        const partyType = partyParam ? PARTY_TYPE_MAP[partyParam] : undefined;
        const deliveryContextType = deliveryParam
          ? DELIVERY_CONTEXT_MAP[deliveryParam]
          : undefined;

        const premierAddress = affiliateCode ? getAffiliateDefaultAddress(affiliateCode) : null;

        // NOTE: we no longer pre-set isLastMinute=true. The dashboard's
        // delivery-window gate (Today/Tomorrow vs Future) now fires on
        // first dashboard view and lets the customer pick. This URL
        // becomes a generic "start a fresh order" entry that still spins
        // up the GroupOrderV2 but defers the menu decision to the gate.
        const group = await createDashboardOrderV2({
          hostName: nameParam || 'Party Host',
          partyType,
          deliveryContextType,
          affiliateId,
          source,
          name: nameParam ? `${nameParam}'s Order` : undefined,
          deliveryAddress: premierAddress || undefined,
          tabName: premierAddress ? 'Marina Delivery' : undefined,
          // Host's first-touch attribution → stamped onto every Order in this group.
          attribution: getAttributionForDashboard(),
        });

        const host = group.participants.find((p) => p.isHost);
        if (host) {
          localStorage.setItem(
            `dashboard_participant_${group.shareCode}`,
            host.id
          );
        }

        router.replace(`/dashboard/${group.shareCode}`);
      } catch (err) {
        console.error('Failed to create order:', err);
        setError('Something went wrong. Please try again.');
        creating.current = false;
      }
    }

    createAndRedirect();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Image
            src="/images/pod-logo-2025.svg"
            alt="Party On"
            width={480}
            height={152}
            className="h-40 w-auto mx-auto mb-8"
          />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError('');
              creating.current = false;
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Image
          src="/images/pod-logo-2025.svg"
          alt="Party On"
          width={480}
          height={152}
          className="h-40 w-auto mx-auto mb-8"
        />
        <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-900">Preparing your last-minute order</p>
      </div>
    </div>
  );
}

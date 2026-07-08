'use client';

import { useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { createDashboardOrderV2 } from '@/lib/group-orders-v2/api-client';
import { getAttributionForDashboard } from '@/lib/analytics/attribution';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import type { CtaSection } from '@/lib/analytics/ga4-events';
import type { StrPartnerConfig } from '@/lib/partners/str-partners';

interface StrStartOrderButtonProps {
  /** The STR partner this landing page belongs to. */
  config: StrPartnerConfig;
  /**
   * Affiliate referral code (NOT the DB id). Resolved server-side at submit
   * time via /api/v1/affiliate/attribution (ACTIVE affiliates only) — never
   * ship raw affiliate DB ids to the client.
   */
  affiliateCode: string;
  /** Button label. */
  label?: string;
  /** GA4 CTA section for click tracking. */
  section?: CtaSection;
  /** Button classes — defaults to the yellow cart CTA. */
  className?: string;
}

/**
 * "Start Your Order" CTA for STR partner landing pages.
 *
 * The landing page's only job is to convert — no forms in the hero. One click
 * creates a partner-attributed group-order dashboard (HOUSE context, no
 * address yet) and routes the guest to `/dashboard/<code>`, where the
 * STR property dropdown lets them pick their rental (or enter its address).
 */
export default function StrStartOrderButton({
  config,
  affiliateCode,
  label = 'Start Your Order',
  section = 'hero',
  className = 'btn-cart w-full sm:w-auto h-14 md:h-16 px-10 text-lg md:text-xl disabled:opacity-60',
}: StrStartOrderButtonProps): ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Re-entry guard: a fast double-tap can beat the `busy` re-render and
  // create two dashboards (same race /order guards with creating.current).
  const creating = useRef(false);

  async function handleStart(): Promise<void> {
    setError('');
    trackCTAClick(label, `/partners/${config.slug}`, section);

    if (creating.current) return;
    creating.current = true;
    setBusy(true);
    try {
      // Resolve the affiliate id server-side (ACTIVE affiliates only).
      // Non-blocking: an unresolved code still creates the dashboard,
      // just without affiliate attribution.
      let affiliateId: string | undefined;
      try {
        const res = await fetch(
          `/api/v1/affiliate/attribution?code=${encodeURIComponent(affiliateCode)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.affiliateId) affiliateId = json.data.affiliateId;
        }
      } catch {
        // Attribution is best-effort; the order flow must not break on it.
      }

      const group = await createDashboardOrderV2({
        hostName: 'Party Host',
        source: 'PARTNER_PAGE',
        affiliateId,
        deliveryContextType: config.deliveryContextType,
        name: `${config.name} Delivery`,
        tabName: 'Rental Delivery',
        attribution: getAttributionForDashboard(),
      });

      const host = group.participants.find((p) => p.isHost);
      if (host) {
        try {
          localStorage.setItem(`dashboard_participant_${group.shareCode}`, host.id);
        } catch {
          /* localStorage unavailable — non-blocking */
        }
      }
      router.push(`/dashboard/${group.shareCode}`);
    } catch (err) {
      console.error('StrStartOrderButton: failed to start order', err);
      setError('Something went wrong. Please try again.');
      creating.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleStart} disabled={busy} className={className}>
        {busy ? 'Starting…' : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

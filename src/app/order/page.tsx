/**
 * /order - Universal dashboard entry point.
 *
 * Friction-reduction G1: this page used to immediately create a GroupOrderV2
 * and redirect to the dashboard, where the customer was hit with a 3-step
 * OnboardingPopup (name, party type, dashboard name). That was too much
 * friction before they had seen a single product.
 *
 * Now the flow is:
 *   1. If ?p= is in the URL, or an affiliate preset supplies partyType, or
 *      a ?name= param is present, skip the chip and auto-create. Same
 *      behavior as before for partner flows / direct deep links.
 *   2. Otherwise show a single-screen party-type chip selector. One tap
 *      creates the dashboard with that party type and redirects.
 *
 * Host name is no longer collected here -- Stripe captures it at checkout.
 * Dashboard name is no longer collected here -- the dashboard's
 * inline-editable header title handles the rare case where the host wants
 * to name their party page.
 */

'use client';

import { Suspense, useEffect, useState, useRef, useCallback, type ReactElement } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createDashboardOrderV2, createTabV2 } from '@/lib/group-orders-v2/api-client';
import type { PartyType, DashboardSource, DeliveryContextType } from '@/lib/group-orders-v2/types';
import { getAffiliateOrderDefaults } from '@/lib/affiliates/presets';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import { useHeroExperiment } from '@/hooks/useHeroExperiment';
import { trackExperimentClick } from '@/hooks/useExperimentVariant';
import { getAttributionForDashboard } from '@/lib/analytics/attribution';
import { getEventPreset } from '@/lib/events/event-presets';

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

/**
 * Chip options for the entry selector. Order is deliberate: the most-used
 * party types first (Boat, Bachelor/ette, Wedding), corporate + house lower,
 * "I'm not sure" last as the no-friction escape hatch.
 *
 * The "Bachelor/ette" chip umbrellas BACHELOR and BACHELORETTE into the
 * single BACH enum value per the user's friction-reduction decision -- one
 * chip, less choice fatigue. Existing BACHELOR / BACHELORETTE dashboards
 * keep working (their entries in PARTY_TYPE_MAP still resolve from URL).
 */
interface ChipOption {
  label: string;
  partyType: PartyType;
  /** A short illustrative emoji-free symbol. Stays compliant with no-emoji rule. */
  glyph: string;
}

const CHIPS: ChipOption[] = [
  { label: 'Boat day',         partyType: 'BOAT',        glyph: '◴' },
  { label: 'Bachelor/ette',    partyType: 'BACH',        glyph: '◇' },
  { label: 'Wedding',          partyType: 'WEDDING',     glyph: '◊' },
  { label: 'Corporate',        partyType: 'CORPORATE',   glyph: '◯' },
  { label: 'House party',      partyType: 'HOUSE_PARTY', glyph: '◉' },
  { label: "I'm not sure",     partyType: 'OTHER',       glyph: '⌁' },
];

export default function OrderRedirectPage(): ReactElement {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <img src="/images/pod-logo-2025.svg" alt="Party On" className="h-40 w-auto mx-auto mb-8" />
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Preparing to PARTY ON</p>
        </div>
      </div>
    }>
      <OrderRedirectInner />
    </Suspense>
  );
}

function OrderRedirectInner(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Whether we've decided the chip selector should NOT show (because an
  // upstream source -- query param or affiliate preset -- already supplied
  // a party type). null = still deciding.
  const [autoMode, setAutoMode] = useState<boolean | null>(null);
  const creating = useRef(false);

  // Self-serve hero headline test — ONLY when the chip selector actually
  // renders. Auto-mode visitors (query-param / affiliate presets) never see
  // the headline; assigning them would inflate impressions and poison CTR.
  const hero = useHeroExperiment('/order', { skip: autoMode !== false });

  // Pull the URL inputs once -- they don't change across renders.
  const ref = searchParams?.get('ref') ?? null;
  const partyParam = searchParams?.get('p') ?? null;
  const deliveryParam = searchParams?.get('d') ?? null;
  const nameParam = searchParams?.get('name') ?? null;
  const affiliateParam = searchParams?.get('a') ?? null;
  const eventParam = searchParams?.get('event') ?? null;

  // Resolve affiliate + presets + decide auto-mode vs chip selector.
  useEffect(() => {
    let cancelled = false;

    async function decide() {
      // If party type came in via ?p= or ?name= (which is partner-named), or
      // an affiliate preset hands us one, we skip the chip selector.
      if (partyParam || nameParam || eventParam) {
        if (!cancelled) {
          setAutoMode(true);
          runCreate();
        }
        return;
      }

      // Check affiliate preset for a forced partyType / skip flag.
      const presetCode = ref || affiliateParam || undefined;
      const presets = presetCode ? getAffiliateOrderDefaults(presetCode) : null;
      if (presets?.skipPartyType) {
        if (!cancelled) {
          setAutoMode(true);
          runCreate();
        }
        return;
      }

      // Fall back: check the ref_code cookie. If it resolves to an affiliate
      // whose preset skips party type, auto-create.
      try {
        const cookieRes = await fetch('/api/v1/affiliate/attribution');
        if (cookieRes.ok) {
          const cookieJson = await cookieRes.json();
          const cookieCode = cookieJson?.data?.affiliateCode;
          if (cookieCode) {
            const cookiePresets = getAffiliateOrderDefaults(cookieCode);
            if (cookiePresets?.skipPartyType) {
              if (!cancelled) {
                setAutoMode(true);
                runCreate();
              }
              return;
            }
          }
        }
      } catch {
        // Non-blocking
      }

      // No upstream party type -- show the chip selector.
      if (!cancelled) setAutoMode(false);
    }

    decide();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyParam, nameParam, ref, affiliateParam, eventParam]);

  /**
   * Create the GroupOrderV2 and redirect to the dashboard. Called either
   * from auto-mode (URL or preset supplied a party type) or from a chip tap.
   */
  const runCreate = useCallback(async (overridePartyType?: PartyType) => {
    if (creating.current) return;
    creating.current = true;
    setBusy(true);
    const eventPreset = getEventPreset(eventParam);
    try {
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

      // Resolve party type: explicit chip click > URL ?p= > nothing.
      const partyType: PartyType | undefined =
        overridePartyType ?? (partyParam ? PARTY_TYPE_MAP[partyParam] : undefined);

      // Resolve partner-page defaults (works even without a DB Affiliate row).
      const presetCode = affiliateCode || ref || undefined;
      const presets = presetCode ? getAffiliateOrderDefaults(presetCode) : null;

      const deliveryContextType = deliveryParam
        ? DELIVERY_CONTEXT_MAP[deliveryParam]
        : presets?.deliveryContextType;

      const group = await createDashboardOrderV2({
        hostName: nameParam || 'Party Host',
        partyType,
        deliveryContextType,
        affiliateId,
        source,
        name: eventPreset?.name ?? (nameParam ? `${nameParam}'s Order` : undefined),
        deliveryAddress: presets?.address,
        tabName: eventPreset?.tabName ?? presets?.tabName,
        deliveryDate: eventPreset?.deliveryDate,
        deliveryTime: eventPreset?.deliveryTime,
        // Host's first-touch attribution → stamped onto every Order in this group.
        attribution: getAttributionForDashboard(),
      });

      const host = group.participants.find((p) => p.isHost);
      if (host) {
        localStorage.setItem(
          `dashboard_participant_${group.shareCode}`,
          host.id
        );

        // Boat partners (e.g. Lake Travis Yacht Rentals) seed a second "House
        // Order" tab so guests can order for the boat AND stock the house from
        // one dashboard. Awaited so both tabs exist on first dashboard load;
        // non-blocking — a failure just means the host adds the tab later.
        if (presets?.additionalTabs?.length) {
          for (const extra of presets.additionalTabs) {
            try {
              await createTabV2(group.shareCode, {
                participantId: host.id,
                name: extra.name,
              });
            } catch (tabErr) {
              console.error('Failed to add preset tab:', extra.name, tabErr);
            }
          }
        }
      }

      // Keep the skip-party flag for backward compat with any consumer that
      // still reads it (the dashboard popup is gone, but this is cheap).
      if (presets?.skipPartyType) {
        localStorage.setItem(`dashboard_skip_party_${group.shareCode}`, '1');
      }

      router.replace(`/dashboard/${group.shareCode}`);
    } catch (err) {
      console.error('Failed to create order:', err);
      setError('Something went wrong. Please try again.');
      creating.current = false;
      setBusy(false);
    }
  }, [ref, affiliateParam, partyParam, deliveryParam, nameParam, router, eventParam]);

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
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

  // Auto-create flow (URL/preset supplied the party type): show the loading
  // state and let the effect-driven runCreate finish.
  if (autoMode === null || autoMode === true) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/images/pod-logo-2025.svg"
            alt="Party On"
            width={480}
            height={152}
            className="h-40 w-auto mx-auto mb-8"
          />
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Preparing to PARTY ON</p>
        </div>
      </div>
    );
  }

  // Chip selector flow (no party type supplied).
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center">
        <Image
          src="/images/pod-logo-2025.svg"
          alt="Party On"
          width={480}
          height={152}
          className="h-24 md:h-32 w-auto mx-auto mb-8"
        />
        <h1 className="font-heading font-bold text-3xl md:text-5xl tracking-[0.06em] text-gray-900 mb-2">
          {hero.content?.headline ?? 'What are we celebrating?'}
        </h1>
        <p className="font-fraunces italic text-gray-600 text-lg md:text-xl mb-8">
          {hero.content?.subhead ?? "One tap and we'll set up your order page."}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {CHIPS.map((chip) => (
            <button
              key={chip.partyType}
              type="button"
              onClick={() => {
                trackCTAClick(chip.label, '/order', 'party_type_chip', hero.experimentId ?? undefined, hero.variantId ?? undefined);
                if (hero.experimentId && hero.variantId) {
                  // Fire-and-forget — must never delay dashboard creation.
                  void trackExperimentClick(hero.experimentId, hero.variantId, chip.label);
                }
                runCreate(chip.partyType);
              }}
              disabled={busy}
              className="flex flex-col items-center justify-center gap-2 px-4 py-5 md:py-6 bg-white rounded-2xl shadow-warm-sm hover:shadow-warm-md active:bg-cream font-heading font-semibold tracking-[0.04em] text-gray-900 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl md:text-3xl text-gold" aria-hidden>{chip.glyph}</span>
              <span className="text-sm md:text-base">{chip.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-8">
          You can rename or change anything after.
        </p>
      </div>
    </div>
  );
}

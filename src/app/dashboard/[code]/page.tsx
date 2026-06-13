'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type ReactElement } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useGroupOrderV2 } from '@/lib/group-orders-v2/hooks';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardCustomHero from '@/components/dashboard/DashboardCustomHero';
import DeliveryHeroSection from '@/components/dashboard/DeliveryHeroSection';
import MoodWash from '@/components/dashboard/MoodWash';
import VibePickerModal from '@/components/dashboard/VibePickerModal';
// OnboardingPopup intentionally not mounted on the dashboard anymore --
// friction reduction G2. Party type is collected at /order via the chip
// selector; dashboard name is captured via the inline-editable header
// title. The file remains in tree for partner-page flows that may still use
// it. See plan: /Users/allan/.claude/plans/rustling-snacking-rain.md
import OrderSidebar from '@/components/dashboard/OrderSidebar';
import ProductBrowse from '@/components/dashboard/ProductBrowse';
import LastMinuteMenuBanner from '@/components/dashboard/LastMinuteMenuBanner';
import DashboardBottomBar from '@/components/dashboard/DashboardBottomBar';
import DashboardCheckoutModal from '@/components/dashboard/DashboardCheckoutModal';
import DeliveryDetailsModal from '@/components/dashboard/DeliveryDetailsModal';
import NewDeliveryModal from '@/components/dashboard/NewDeliveryModal';
import GetRecsModal from '@/components/dashboard/GetRecsModal';
import RecommendationsSection from '@/components/dashboard/RecommendationsSection';
import ShareModal from '@/components/dashboard/ShareModal';
import JoinOverlay from '@/components/dashboard/JoinOverlay';
import type { RecommendationResult } from '@/components/dashboard/GetRecsModal';
import { claimHostV2, addDraftItemV2, removeDraftItemV2 } from '@/lib/group-orders-v2/api-client';
import type { AppliedPromo } from '@/lib/group-orders-v2/types';
import PromoCodeInput from '@/components/dashboard/PromoCodeInput';
import PremierPerksBanner from '@/components/dashboard/PremierPerksBanner';
import { OnboardingTourProvider, DashboardTour } from '@/components/dashboard/tour';
import { getHiddenProductIds } from '@/lib/affiliates/product-exclusions';
import { getCustomDashboardTheme } from '@/lib/dashboard/custom-themes';

// Direction E Rec #5: brand palette only (was darker blue + magenta + orange,
// none of which are on-brand). Once-per-session cap so the celebration stays
// special; honors prefers-reduced-motion for accessibility.
const CONFETTI_COLORS = ['#0B74B8', '#F2D34F', '#D4AF37', '#FAF6EE', '#FFFFFF'];
//                       brand-blue   yellow      gold       cream      white
const CONFETTI_SESSION_KEY = 'pod_confetti_fired';

function fireConfetti() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.sessionStorage.getItem(CONFETTI_SESSION_KEY)) return;
  window.sessionStorage.setItem(CONFETTI_SESSION_KEY, '1');
  import('canvas-confetti').then((mod) => {
    const confetti = mod.default;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.65, x: 0.55 },
        colors: CONFETTI_COLORS,
      });
    }, 200);
  }).catch((err) => { console.error('Confetti error:', err); });
}

const PARTICIPANT_KEY_PREFIX = 'dashboard_participant_';
const PROMO_KEY_PREFIX = 'dashboard_promo_';

export default function DashboardPage(): ReactElement {
  const params = useParams() ?? {};
  const code = (params.code as string) || '';
  const searchParams = useSearchParams();
  const router = useRouter();

  const { groupOrder, isLoading, refresh } = useGroupOrderV2(code);

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [checkoutMode, setCheckoutMode] = useState<'mine' | 'all' | null>(null);
  const [showGetRecs, setShowGetRecs] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResult[] | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const cartRef = useRef<HTMLDivElement>(null);

  // Products hidden by affiliate (e.g. Centex Boat Rentals hides Bag of Ice)
  const dashboardHiddenProductIds = useMemo(
    () => new Set(getHiddenProductIds(groupOrder?.affiliate?.code)),
    [groupOrder?.affiliate?.code]
  );

  // Last-minute whitelist: when flagged, load the `last-minute`
  // collection from the local Postgres `Category` table and use it as
  // the allow-set for product display.
  const [lastMinuteAllowedIds, setLastMinuteAllowedIds] = useState<Set<string> | null>(null);
  // Customer-facing override: when true (and isLastMinute), we don't
  // filter the catalog — they see the full menu. The banner explains
  // some items may be unavailable + we'll text post-purchase.
  const [showFullMenuOverride, setShowFullMenuOverride] = useState(false);
  useEffect(() => {
    if (!groupOrder?.isLastMinute) {
      setLastMinuteAllowedIds(null);
      return;
    }
    let cancelled = false;
    fetch('/api/products?localCollection=last-minute&first=200')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const ids = new Set<string>(
          (json.products?.edges || []).map((e: { node: { id: string } }) => e.node.id)
        );
        setLastMinuteAllowedIds(ids);
      })
      .catch(() => {
        // Silent fail — fall back to no filter rather than empty dashboard
      });
    return () => {
      cancelled = true;
    };
  }, [groupOrder?.isLastMinute]);
  // Reset the override when the underlying isLastMinute flag flips
  // (e.g. the host edits the delivery date to next week).
  useEffect(() => {
    if (!groupOrder?.isLastMinute) setShowFullMenuOverride(false);
  }, [groupOrder?.isLastMinute]);


  // Restore participant ID from localStorage
  useEffect(() => {
    if (!code) return;
    const stored = localStorage.getItem(`${PARTICIPANT_KEY_PREFIX}${code}`);
    if (stored) {
      setParticipantId(stored);
    }
  }, [code]);

  // Restore applied promo from localStorage
  useEffect(() => {
    if (!code) return;
    // Private custom-themed dashboards never carry an applied promo —
    // clear any stale entry that was set by a prior visit before this guard existed.
    if (getCustomDashboardTheme(code)) {
      localStorage.removeItem(`${PROMO_KEY_PREFIX}${code}`);
      setAppliedPromo(null);
      return;
    }
    try {
      const stored = localStorage.getItem(`${PROMO_KEY_PREFIX}${code}`);
      if (stored) {
        setAppliedPromo(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, [code]);

  // Track dashboard view (fire-and-forget)
  useEffect(() => {
    if (!code) return;
    fetch(`/api/v2/group-orders/${code}/track-view`, { method: 'POST' }).catch(() => {});
  }, [code]);

  // Auto-load affiliate from cookie (with confetti on first apply)
  useEffect(() => {
    if (!code || !participantId) return;
    // Skip auto-attribution for private custom-themed dashboards (e.g. Ashley's birthday)
    if (getCustomDashboardTheme(code)) return;
    // Skip if promo already applied
    const stored = localStorage.getItem(`${PROMO_KEY_PREFIX}${code}`);
    if (stored) return;

    fetch('/api/v1/affiliate/attribution')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.active) {
          const promo: AppliedPromo = {
            type: 'affiliate',
            code: json.data.affiliateId,
            label: `Free Delivery (via ${json.data.partnerName})`,
            discountAmount: 0,
            freeDelivery: true,
            affiliateId: json.data.affiliateId,
          };
          setAppliedPromo(promo);
          localStorage.setItem(`${PROMO_KEY_PREFIX}${code}`, JSON.stringify(promo));
          fireConfetti();
        }
      })
      .catch(() => {
        // Silent fail
      });
  }, [code, participantId]);

  // Fallback: auto-apply affiliate promo from groupOrder data (no cookie needed)
  useEffect(() => {
    if (!code || !participantId || !groupOrder) return;
    // Skip auto-attribution for private custom-themed dashboards (e.g. Ashley's birthday)
    if (getCustomDashboardTheme(code)) return;
    // Skip if promo already applied
    const stored = localStorage.getItem(`${PROMO_KEY_PREFIX}${code}`);
    if (stored) return;
    // Skip if already set in state (e.g. by cookie effect above)
    if (appliedPromo) return;

    if (groupOrder.affiliate) {
      const promo: AppliedPromo = {
        type: 'affiliate',
        code: groupOrder.affiliate.code,
        label: `Free Delivery (via ${groupOrder.affiliate.businessName})`,
        discountAmount: 0,
        freeDelivery: true,
        affiliateId: groupOrder.affiliate.id,
      };
      setAppliedPromo(promo);
      localStorage.setItem(`${PROMO_KEY_PREFIX}${code}`, JSON.stringify(promo));
      fireConfetti();
    }
  }, [code, participantId, groupOrder, appliedPromo]);

  // Detect whether user is a known participant or needs to join
  useEffect(() => {
    if (!groupOrder || participantId) return;

    const stored = localStorage.getItem(`${PARTICIPANT_KEY_PREFIX}${code}`);

    if (stored) {
      const match = groupOrder.participants.find((p) => p.id === stored && p.status === 'ACTIVE');
      if (match) {
        setParticipantId(match.id);
        return;
      }
    }

    setNeedsJoin(true);
  }, [groupOrder, participantId, code]);

  // Show onboarding for new orders (no party type set yet)
  // Friction reduction G2: the auto-popup that fired OnboardingPopup when a
  // host arrived without a partyType is removed. Party type is now collected
  // at /order (chip selector) before the dashboard mounts. Dashboards that
  // somehow land here with partyType=null still render -- the WelcomeHero
  // falls through to its OTHER fallback ("Party On" eyebrow + "Let's get
  // this started" subhead), which is friendlier than a forced modal.

  // Handle host claim token from URL
  useEffect(() => {
    if (!groupOrder || !participantId) return;
    const claimToken = searchParams?.get('claim');
    if (!claimToken) return;

    const alreadyHost = groupOrder.participants.find(
      (p) => p.id === participantId && p.isHost
    );
    if (alreadyHost) {
      // Already host, just strip the param
      router.replace(`/dashboard/${code}`);
      return;
    }

    claimHostV2(code, claimToken, participantId)
      .then(() => {
        refresh();
        router.replace(`/dashboard/${code}`);
      })
      .catch((err) => {
        console.error('Failed to claim host:', err);
        router.replace(`/dashboard/${code}`);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupOrder?.id, participantId]);

  const handlePromoApply = useCallback(async (promo: AppliedPromo) => {
    setAppliedPromo(promo);
    localStorage.setItem(`${PROMO_KEY_PREFIX}${code}`, JSON.stringify(promo));
    fireConfetti();

    // Auto-add free products if present
    if (promo.freeProducts?.length && participantId && groupOrder) {
      const tabIndex = Math.min(activeTabIndex, groupOrder.tabs.length - 1);
      const activeTab = groupOrder.tabs[tabIndex];
      if (!activeTab) return;
      // Skip free product auto-add on boat tabs (survival package is a house/venue perk)
      if (activeTab.partyType === 'BOAT' || activeTab.deliveryContextType === 'BOAT') {
        refresh();
        return;
      }
      for (const fp of promo.freeProducts) {
        // Skip if this variant is already in the cart (any participant)
        const alreadyInCart = activeTab.draftItems.some(
          (item) => item.variantId === fp.variantId && item.price === 0
        );
        if (alreadyInCart) continue;
        try {
          await addDraftItemV2(code, activeTab.id, {
            participantId,
            productId: fp.productId,
            variantId: fp.variantId,
            title: fp.name,
            price: 0,
            quantity: fp.quantity,
          });
        } catch (err) {
          console.error('[Promo] Failed to add free product:', err);
        }
      }
      refresh();
    }
  }, [code, participantId, groupOrder, activeTabIndex, refresh]);

  const handlePromoRemove = useCallback(async () => {
    const prevPromo = appliedPromo;
    setAppliedPromo(null);
    localStorage.removeItem(`${PROMO_KEY_PREFIX}${code}`);

    // Remove free products from cart
    if (prevPromo?.freeProducts?.length && participantId && groupOrder) {
      const tabIndex = Math.min(activeTabIndex, groupOrder.tabs.length - 1);
      const activeTab = groupOrder.tabs[tabIndex];
      if (!activeTab) return;
      const freeVariantIds = new Set(prevPromo.freeProducts.map((fp) => fp.variantId));
      for (const item of activeTab.draftItems) {
        if (freeVariantIds.has(item.variantId) && item.price === 0) {
          try {
            await removeDraftItemV2(code, activeTab.id, item.id, item.addedBy.id);
          } catch (err) {
            console.error('[Promo] Failed to remove free product:', err);
          }
        }
      }
      refresh();
    }
  }, [code, appliedPromo, participantId, groupOrder, activeTabIndex, refresh]);

  if (isLoading || !groupOrder) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base text-gray-500">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (groupOrder.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">This order has been cancelled</h1>
          <p className="text-gray-600">
            The host or partner cancelled this group order. Please reach out to them if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  // Friction reduction G3 (deferred -- see plan): the intent is to drop this
  // full-page JoinOverlay interception and instead show an inline
  // first-name + age-21 prompt anchored to the product card on first
  // Add-to-Cart tap. That change requires loosening participantId from
  // `string` to `string | null` across ProductBrowse + DashboardProductCard
  // and their API call sites -- a sizeable refactor. Until then, joiners
  // still see this overlay. Tracked as a follow-up to this PR.
  if (!participantId && needsJoin && groupOrder) {
    const host = groupOrder.participants.find((p) => p.isHost);
    const firstTab = groupOrder.tabs[0];
    const joinLocked = firstTab?.status === 'LOCKED';
    return (
      <JoinOverlay
        shareCode={code}
        orderName={groupOrder.name}
        hostName={host?.name || groupOrder.hostName}
        hostParticipantId={host?.id}
        isLocked={joinLocked}
        onJoined={(newPid) => {
          setParticipantId(newPid);
          localStorage.setItem(`${PARTICIPANT_KEY_PREFIX}${code}`, newPid);
          setNeedsJoin(false);
          refresh();
        }}
      />
    );
  }

  if (!participantId) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base text-gray-500">Setting up...</p>
        </div>
      </div>
    );
  }

  // Ensure activeTabIndex is within bounds
  const safeTabIndex = Math.min(activeTabIndex, groupOrder.tabs.length - 1);
  const tab = groupOrder.tabs[safeTabIndex];
  if (!tab) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">No location tab found.</p>
      </div>
    );
  }

  const isLocked = tab.status === 'LOCKED';

  const myDraftItems = tab.draftItems.filter(
    (i) => i.addedBy.id === participantId
  );
  const checkoutItems =
    checkoutMode === 'all' ? tab.draftItems : myDraftItems;

  const currentIsHost = !!groupOrder.participants.find(p => p.id === participantId)?.isHost;
  const customTheme = getCustomDashboardTheme(groupOrder.shareCode);

  // Compute effective promo per-tab: boat tabs get free delivery unconditionally,
  // other tabs need to meet the minimum order amount
  const effectivePromo = (() => {
    if (!appliedPromo) return null;
    if (!appliedPromo.freeDelivery) return appliedPromo;
    const isBoatTab = tab.deliveryContextType === 'BOAT';
    if (isBoatTab) return appliedPromo;
    const min = appliedPromo.minOrderAmount || 0;
    if (min <= 0) return appliedPromo;
    const tabSubtotal = tab.draftItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (tabSubtotal >= min) return appliedPromo;
    return { ...appliedPromo, freeDelivery: false };
  })();

  return (
    <OnboardingTourProvider shareCode={code}>
    {/* Direction E: cream replaces the cool gray-50 default surface. The whole
        dashboard is a warm "Saturday-morning sunlight" environment. */}
    <div className="min-h-screen bg-cream pb-20 lg:pb-6">
      {/* MoodWash: subtle theme-able color shift behind everything. Skipped
          for CORPORATE/OTHER party types and honors prefers-reduced-motion. */}
      <MoodWash partyType={groupOrder.partyType} />
      <DashboardTour
        isHost={currentIsHost}
        hasPartyType={!!groupOrder.partyType}
        shareCode={code}
      />
      {customTheme && (
        <DashboardCustomHero groupOrder={groupOrder} theme={customTheme} />
      )}
      <DashboardHeader
        groupOrder={groupOrder}
        participantId={participantId}
        isLocked={isLocked}
        onRefresh={refresh}
        onShareClick={() => setShowShareModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Left column: hero + recs + products */}
        <div>
          <DeliveryHeroSection
            groupOrder={groupOrder}
            activeTabIndex={safeTabIndex}
            activeTab={tab}
            participantId={participantId}
            isLocked={isLocked}
            onTabChange={setActiveTabIndex}
            onAddDelivery={() => setShowNewLocation(true)}
            onEditDelivery={() => setShowLocationDetails(true)}
            onRefresh={refresh}
            onVibePickerOpen={() => setShowVibePicker(true)}
          />
          {/* Mobile cart (hidden on desktop) */}
          <div className="lg:hidden">
            <OrderSidebar
              ref={cartRef}
              shareCode={groupOrder.shareCode}
              tabId={tab.id}
              participantId={participantId}
              participants={groupOrder.participants}
              draftItems={tab.draftItems}
              purchasedItems={tab.purchasedItems}
              isLocked={isLocked}
              deliveryFee={tab.deliveryFee}
              appliedPromo={effectivePromo}
              onItemChanged={refresh}
              onCheckoutMine={() => setCheckoutMode('mine')}
              onCheckoutAll={() => setCheckoutMode('all')}
            />
          </div>

          {/* Promo code + Get Recommendations. Both surfaces stay visible on
              mobile (we previously hid Get Recs on mobile because the hero
              had a Get ideas chip; that chip is gone, so this button is the
              only entry point again). */}
          <div className="mb-4 flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
            <div className="flex-1 basis-0 min-w-0">
              <PromoCodeInput
                appliedPromo={appliedPromo}
                subtotal={tab.draftItems.reduce((s, i) => s + i.price * i.quantity, 0)}
                onApply={handlePromoApply}
                onRemove={handlePromoRemove}
              />
            </div>
            {!recommendations && (
              <div className="flex-1 basis-0">
                <button
                  data-tour="get-recs"
                  onClick={() => setShowGetRecs(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-yellow text-gray-900 font-semibold tracking-[0.08em] rounded-lg hover:bg-yellow-400 active:bg-yellow-500 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Get Recommendations
                </button>
              </div>
            )}
          </div>

          <PremierPerksBanner
            groupOrder={groupOrder}
            activeTab={tab}
            participantId={participantId}
            shareCode={groupOrder.shareCode}
            onItemChanged={refresh}
          />

          {/* Last-minute mode banner — only renders when the order is
              flagged last-minute. Lets the customer flip to the full
              menu with a "some items may not be available" caveat. */}
          {groupOrder.isLastMinute && (
            <LastMinuteMenuBanner
              showFullMenu={showFullMenuOverride}
              onToggle={() => setShowFullMenuOverride((prev) => !prev)}
            />
          )}

          <ProductBrowse
            shareCode={groupOrder.shareCode}
            tabId={tab.id}
            participantId={participantId}
            partyType={tab.partyType}
            draftItems={tab.draftItems}
            isLocked={isLocked}
            onItemChanged={refresh}
            affiliateCode={groupOrder.affiliate?.code}
            allowedProductIds={
              // Filter only when last-minute is on AND the customer
              // hasn't toggled the override to see the full catalog.
              groupOrder.isLastMinute && !showFullMenuOverride
                ? lastMinuteAllowedIds
                : null
            }
            recsSection={
              recommendations ? (
                <RecommendationsSection
                  recommendations={recommendations}
                  shareCode={groupOrder.shareCode}
                  tabId={tab.id}
                  participantId={participantId}
                  onItemChanged={refresh}
                  onDismiss={() => setRecommendations(null)}
                  hiddenProductIds={dashboardHiddenProductIds}
                />
              ) : null
            }
          />
        </div>

        {/* Right column: desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:block">
          <OrderSidebar
            shareCode={groupOrder.shareCode}
            tabId={tab.id}
            participantId={participantId}
            participants={groupOrder.participants}
            draftItems={tab.draftItems}
            purchasedItems={tab.purchasedItems}
            isLocked={isLocked}
            deliveryFee={tab.deliveryFee}
            appliedPromo={effectivePromo}
            onItemChanged={refresh}
            onCheckoutMine={() => setCheckoutMode('mine')}
            onCheckoutAll={() => setCheckoutMode('all')}
          />
        </div>
      </main>

      <DashboardBottomBar
        participantId={participantId}
        draftItems={tab.draftItems}
        isLocked={isLocked}
        cartRef={cartRef}
        onCheckout={() => setCheckoutMode('mine')}
      />

      {checkoutMode && (
        <DashboardCheckoutModal
          shareCode={groupOrder.shareCode}
          tab={tab}
          participantId={participantId}
          mode={checkoutMode}
          items={checkoutItems}
          appliedPromo={effectivePromo}
          participantEmail={groupOrder.participants.find((p) => p.id === participantId)?.email || null}
          onClose={() => setCheckoutMode(null)}
          onOpenDeliveryDetails={() => {
            setCheckoutMode(null);
            setShowLocationDetails(true);
          }}
        />
      )}

      {showGetRecs && (
        <GetRecsModal
          shareCode={groupOrder.shareCode}
          onRecommendations={(recs) => {
            setRecommendations(recs);
            setShowGetRecs(false);
          }}
          onClose={() => setShowGetRecs(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          shareCode={groupOrder.shareCode}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <VibePickerModal
        isOpen={showVibePicker}
        onClose={() => setShowVibePicker(false)}
        currentVibeKey={groupOrder.heroVibeKey}
        partyType={groupOrder.partyType}
        shareCode={groupOrder.shareCode}
        participantId={participantId}
        onSaved={refresh}
      />

      {showLocationDetails && (
        <DeliveryDetailsModal
          shareCode={groupOrder.shareCode}
          tab={tab}
          participantId={participantId}
          onClose={() => setShowLocationDetails(false)}
          onSaved={() => {
            setShowLocationDetails(false);
            refresh();
          }}
        />
      )}

      {showNewLocation && (
        <NewDeliveryModal
          shareCode={groupOrder.shareCode}
          participantId={participantId}
          tabCount={groupOrder.tabs.length}
          onClose={() => setShowNewLocation(false)}
          onCreated={async () => {
            setShowNewLocation(false);
            // Clear promo code -- discounts should not carry over to new tabs
            setAppliedPromo(null);
            localStorage.removeItem(`${PROMO_KEY_PREFIX}${code}`);
            const updated = await refresh();
            if (updated) {
              setActiveTabIndex(updated.tabs.length - 1);
            }
          }}
        />
      )}

    </div>
    </OnboardingTourProvider>
  );
}

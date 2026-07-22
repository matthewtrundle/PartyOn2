/**
 * Feature Flags Service
 * Control feature rollout and A/B testing
 */

import { prisma } from '@/lib/database/client';

/**
 * Feature flag keys
 */
export const FEATURE_FLAGS = {
  // Cart system
  USE_CUSTOM_CART: 'use_custom_cart',
  USE_CUSTOM_CHECKOUT: 'use_custom_checkout',

  // Product management
  USE_CUSTOM_PRODUCTS: 'use_custom_products',
  USE_CUSTOM_INVENTORY: 'use_custom_inventory',

  // Customer system
  USE_CUSTOM_AUTH: 'use_custom_auth',
  USE_CUSTOM_CUSTOMERS: 'use_custom_customers',

  // Orders
  USE_CUSTOM_ORDERS: 'use_custom_orders',

  // AI features
  AI_INVENTORY_COUNTING: 'ai_inventory_counting',
  AI_STOCK_PREDICTIONS: 'ai_stock_predictions',
  AI_QUERY_ASSISTANT: 'ai_query_assistant',

  // Follow-up email system (src/lib/followups) — master kill switch + one
  // flag per journey. All auto-create disabled; the engine checks the master
  // first, then the journey flag per job.
  FOLLOWUPS_MASTER: 'followups_master',
  FOLLOWUPS_ABANDONED_QUOTE: 'followups_abandoned_quote',
  FOLLOWUPS_UNPAID_INVOICE: 'followups_unpaid_invoice',
  FOLLOWUPS_PARTNER_INQUIRY: 'followups_partner_inquiry',
  FOLLOWUPS_CONTACT_FORM: 'followups_contact_form',
  FOLLOWUPS_NEWSLETTER_WELCOME: 'followups_newsletter_welcome',
  FOLLOWUPS_AFFILIATE_APPLY: 'followups_affiliate_apply',
  FOLLOWUPS_EVENT_QUIZ: 'followups_event_quiz',
  FOLLOWUPS_POST_PURCHASE_REVIEW: 'followups_post_purchase_review',
  // Partner-prospect outreach campaign (STR + bartending databases).
  // DEFAULT OFF per Brian 2026-07-21 — no real sends until partner pages
  // are built and each email has been test-sent to info@.
  FOLLOWUPS_PARTNER_OUTREACH: 'followups_partner_outreach',

  // Full Moon Party — set true when the event is postponed/cancelled (short of
  // the minimum at the deadline). Flips the public threshold widget to its
  // "postponed" state. Set by the deadline cron or the operator; reset to
  // resume selling. See src/lib/full-moon/event-state.ts.
  FULL_MOON_POSTPONED: 'full_moon_postponed',

  // Premiere credit automation (src/lib/premiere-credits) — master kill switch
  // + a separate send gate. MASTER off → the cron is a no-op. With MASTER on
  // and SEND off, the cron mints codes + writes grants but sends nothing (the
  // safe dry-run mode used to eyeball the first real batch). Both default off.
  PREMIERE_CREDITS_MASTER: 'premiere_credits_master',
  PREMIERE_CREDITS_SEND: 'premiere_credits_send',

  // Not a rollout flag — a debounce stamp. The row's updatedAt records when
  // the operator was last emailed about CoreLinq ingest failures, so a CRM
  // outage alerts once per window instead of once per form submit. See
  // src/lib/webhooks/corelinq-alert.ts.
  CORELINQ_INGEST_ALERTED: 'corelinq_ingest_alerted',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * Feature flag cache to reduce database queries
 */
interface CachedFlag {
  enabled: boolean;
  rolloutPercentage: number;
  cachedAt: number;
}

const flagCache = new Map<string, CachedFlag>();
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get a feature flag's state
 */
export async function isFeatureEnabled(
  key: FeatureFlagKey,
  userId?: string
): Promise<boolean> {
  // Check cache first
  const cached = flagCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return evaluateFlag(cached, userId);
  }

  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      // Create default flag if it doesn't exist
      await prisma.featureFlag.create({
        data: {
          key,
          enabled: false,
          rolloutPercentage: 0,
        },
      });
      return false;
    }

    // Update cache
    flagCache.set(key, {
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      cachedAt: Date.now(),
    });

    return evaluateFlag(
      { enabled: flag.enabled, rolloutPercentage: flag.rolloutPercentage, cachedAt: Date.now() },
      userId
    );
  } catch (error) {
    console.error(`[FeatureFlags] Error checking flag ${key}:`, error);
    return false;
  }
}

/**
 * Evaluate a flag considering rollout percentage
 */
function evaluateFlag(flag: CachedFlag, userId?: string): boolean {
  if (!flag.enabled) return false;
  if (flag.rolloutPercentage === 100) return true;
  if (flag.rolloutPercentage === 0) return false;

  // Use userId for consistent rollout (same user always gets same result)
  if (userId) {
    const hash = hashString(userId);
    return hash % 100 < flag.rolloutPercentage;
  }

  // Random rollout for anonymous users
  return Math.random() * 100 < flag.rolloutPercentage;
}

/**
 * Simple hash function for consistent user bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Enable a feature flag
 */
export async function enableFeature(
  key: FeatureFlagKey,
  rolloutPercentage = 100
): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    update: {
      enabled: true,
      rolloutPercentage,
    },
    create: {
      key,
      enabled: true,
      rolloutPercentage,
    },
  });

  // Invalidate cache
  flagCache.delete(key);
}

/**
 * Disable a feature flag
 */
export async function disableFeature(key: FeatureFlagKey): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    update: {
      enabled: false,
    },
    create: {
      key,
      enabled: false,
      rolloutPercentage: 0,
    },
  });

  // Invalidate cache
  flagCache.delete(key);
}

/**
 * Set rollout percentage for gradual migration
 */
export async function setRolloutPercentage(
  key: FeatureFlagKey,
  percentage: number
): Promise<void> {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Rollout percentage must be between 0 and 100');
  }

  await prisma.featureFlag.upsert({
    where: { key },
    update: {
      rolloutPercentage: percentage,
    },
    create: {
      key,
      enabled: percentage > 0,
      rolloutPercentage: percentage,
    },
  });

  // Invalidate cache
  flagCache.delete(key);
}

/**
 * Get all feature flags status
 */
export async function getAllFeatureFlags(): Promise<
  Array<{
    key: string;
    enabled: boolean;
    rolloutPercentage: number;
  }>
> {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: 'asc' },
  });

  return flags.map((f) => ({
    key: f.key,
    enabled: f.enabled,
    rolloutPercentage: f.rolloutPercentage,
  }));
}

/**
 * Clear all cached flags
 */
export function clearFlagCache(): void {
  flagCache.clear();
}

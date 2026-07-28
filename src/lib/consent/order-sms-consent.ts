import { phoneLast10 } from '@/lib/leads/phone';

/**
 * Resolve the persisted `Order.smsConsent` from what checkout captured.
 *
 * A2P 10DLC binding: the affirmative opt-in checkbox is paired with a specific
 * phone on our OWN checkout form (billing phone / group participant phone), but
 * the number that actually receives texts is the one stored on the Order — which
 * on the paid paths comes from Stripe's separate `phone_number_collection` field
 * (or a participant's guest phone), NOT the checkbox field. If those differ, the
 * consent flag would authorize marketing to a number whose owner never saw the
 * checkbox (e.g. a spouse's line autofilled on Stripe's page). So consent is
 * honored ONLY when the consented phone equals the order phone (last-10-digit
 * match, matching how `Order.customerPhone` is indexed). Fail closed on a false/
 * missing flag, a missing phone, or any mismatch.
 *
 * The $0/free-order path doesn't need this — it has no second Stripe phone field,
 * so the same value is used for both the gate and the stored phone.
 *
 * @param metadataConsent  Stripe metadata `smsConsent`: 'true' | 'false' | undefined
 * @param consentedPhone   phone the opt-in was captured against (metadata `smsConsentPhone`)
 * @param orderPhone       phone persisted on the Order (what would be texted)
 */
export function resolveOrderSmsConsent(
  metadataConsent: string | undefined,
  consentedPhone: string | null | undefined,
  orderPhone: string | null | undefined,
): boolean {
  if (metadataConsent !== 'true') return false;
  const consented = phoneLast10(consentedPhone);
  const order = phoneLast10(orderPhone);
  return consented !== null && consented === order;
}

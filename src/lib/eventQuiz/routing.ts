/**
 * Event-quiz routing — what does a quiz answer map to?
 *
 * The /event-quiz page is a paid-ad funnel:
 *   1. Visitor sees a modal questionnaire
 *   2. They pick party type → delivery timing → needs (multi-select) → contact
 *   3. We create a Lead, send a welcome email, and redirect them to the
 *      best matching landing page
 *
 * Right now only four landing pages exist (bachelor, bachelorette,
 * corporate, wedding-weekend). Anything else routes to the bachelor
 * page as a sensible fallback — same TABC-licensed flow, same
 * Quick-Buy / Package Builder modals, just with bachelor branding.
 *
 * Adding a new landing page later? Add the slug to LANDING_BY_PARTY +
 * make sure the page exists at /<slug>.
 */

export type PartyType =
  | 'just-deliver'
  | 'bachelor'
  | 'bachelorette'
  | 'corporate'
  | 'wedding'
  | 'boat'
  | 'house'
  | 'hotel';

export type DeliveryTiming = 'today' | 'tomorrow' | 'future';

export type EventNeed =
  | 'stock-drinks'
  | 'transportation'
  | 'party-boat'
  | 'tour'
  | 'event-rentals';

/** Display labels — used by the modal UI + the email template. */
export const PARTY_TYPE_LABEL: Record<PartyType, string> = {
  'just-deliver': 'Just deliver drinks now',
  bachelor: 'Bachelor party',
  bachelorette: 'Bachelorette party',
  corporate: 'Corporate event',
  wedding: 'Wedding party',
  boat: 'Boat party',
  house: 'House party',
  hotel: 'The B&B / Hotel',
};

export const DELIVERY_TIMING_LABEL: Record<DeliveryTiming, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  future: 'Future date',
};

export const EVENT_NEED_LABEL: Record<EventNeed, string> = {
  'stock-drinks': 'Stock the B&B / drinks for the boat',
  transportation: 'Arrange transportation',
  'party-boat': 'Book a party boat',
  tour: 'Book a tour',
  'event-rentals': 'I need event rentals',
};

/**
 * Party type → landing-page slug. Anything not in the map falls back
 * to bachelor.
 */
const LANDING_BY_PARTY: Record<PartyType, string> = {
  'just-deliver': 'austin-bachelor-party-delivery',
  bachelor: 'austin-bachelor-party-delivery',
  bachelorette: 'austin-bachelorette-party-delivery',
  corporate: 'austin-corporate-event-delivery',
  wedding: 'austin-wedding-weekend-delivery',
  boat: 'austin-bachelor-party-delivery',
  house: 'austin-bachelor-party-delivery',
  hotel: 'austin-bachelor-party-delivery',
};

/**
 * Resolve the destination URL for a completed quiz. Appends
 * `?welcome=1&from=event-quiz` so the landing page can swap its hero
 * header to "Step one: Let's get started with your drinks, and then
 * we'll plan the rest of your weekend" + tag any captured leads with
 * the quiz funnel source.
 */
export function targetUrlFor(party: PartyType): string {
  const slug = LANDING_BY_PARTY[party] ?? LANDING_BY_PARTY.bachelor;
  return `/${slug}?welcome=1&from=event-quiz`;
}

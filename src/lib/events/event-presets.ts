/**
 * Named event presets for the `/order` entry flow.
 *
 * Passing `?event=<key>` to `/order` pre-fills the dashboard title + delivery
 * date/time so a per-group dashboard opens already configured for that event.
 * Address, affiliate, party type, and delivery context still come from the
 * usual `?ref=` / `?p=` / `?d=` params — the event preset only layers the
 * title + date/time on top.
 */

import { PREMIER_MARINA_ADDRESS, type AffiliateAddress } from '@/lib/affiliates/presets';

export interface EventPreset {
  /** Dashboard title, shown as the dashboard hero h1 (e.g. "Rodeo Cruise"). */
  name: string;
  /** Delivery date as YYYY-MM-DD. Sundays are allowed — boat events run Sundays. */
  deliveryDate: string;
  /** Delivery window label shown on the first tab (e.g. "11:00 AM - 12:00 PM"). */
  deliveryTime: string;
  /** Optional first-tab name override. */
  tabName?: string;
  /**
   * Optional pre-filled delivery address. The rodeo cruise got its marina
   * address by riding `?ref=PREMIER`'s affiliate preset — which also
   * attributes the order to the PREMIER affiliate and accrues commission
   * rows. For POD's OWN events that attribution is wrong (and % commission
   * on alcohol sales to unlicensed partners is a compliance no-go), so the
   * event preset can now carry the address itself, no ref required.
   */
  address?: AffiliateAddress;
}

export const EVENT_PRESETS: Record<string, EventPreset> = {
  'rodeo-cruise': {
    name: 'Rodeo Cruise',
    deliveryDate: '2026-07-12',
    deliveryTime: '11:00 AM - 12:00 PM',
    tabName: 'Marina Delivery',
  },
  // Lake Travis Full Moon Party (Fri Aug 28) — every ticket holder starts
  // their OWN order, pre-filled with the marina + the dock-handoff window
  // before the 7:00 PM cast-off. Entry: /full-moon-drinks lander →
  // /order?event=full-moon&p=boat&d=boat.
  'full-moon': {
    name: 'Full Moon Party',
    deliveryDate: '2026-08-28',
    deliveryTime: '6:00 PM - 6:45 PM',
    tabName: 'Marina Delivery',
    address: PREMIER_MARINA_ADDRESS,
  },
};

/** Look up an event preset by key. Null-safe. */
export function getEventPreset(key: string | null | undefined): EventPreset | null {
  if (!key) return null;
  return EVENT_PRESETS[key] ?? null;
}

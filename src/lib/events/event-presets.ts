/**
 * Named event presets for the `/order` entry flow.
 *
 * Passing `?event=<key>` to `/order` pre-fills the dashboard title + delivery
 * date/time so a per-group dashboard opens already configured for that event.
 * Address, affiliate, party type, and delivery context still come from the
 * usual `?ref=` / `?p=` / `?d=` params — the event preset only layers the
 * title + date/time on top.
 */

export interface EventPreset {
  /** Dashboard title, shown as the dashboard hero h1 (e.g. "Rodeo Cruise"). */
  name: string;
  /** Delivery date as YYYY-MM-DD. Sundays are allowed — boat events run Sundays. */
  deliveryDate: string;
  /** Delivery window label shown on the first tab (e.g. "11:00 AM - 12:00 PM"). */
  deliveryTime: string;
  /** Optional first-tab name override. */
  tabName?: string;
}

export const EVENT_PRESETS: Record<string, EventPreset> = {
  'rodeo-cruise': {
    name: 'Rodeo Cruise',
    deliveryDate: '2026-07-12',
    deliveryTime: '11:00 AM - 12:00 PM',
    tabName: 'Marina Delivery',
  },
};

/** Look up an event preset by key. Null-safe. */
export function getEventPreset(key: string | null | undefined): EventPreset | null {
  if (!key) return null;
  return EVENT_PRESETS[key] ?? null;
}

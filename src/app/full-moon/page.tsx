import type { Metadata } from 'next';
import FullMoonParty from '@/components/full-moon/FullMoonParty';
import { EVENT, OG_IMAGE, SHARE } from '@/components/full-moon/event';

export const metadata: Metadata = {
  title: 'Lake Travis Full Moon Party · Party On Delivery',
  description:
    'A sunset cruise that becomes a moonrise dance party on Lake Travis. $59 — light bites, water & ice included; drinks ordered ahead through Party On Delivery. Once a month, when the moon is full.',
  alternates: { canonical: '/full-moon' },
  openGraph: {
    title: SHARE.title,
    description: `Sunset cruise, moonrise dance party on Lake Travis. $${EVENT.price} — light bites included, drinks via Party On Delivery.`,
    url: EVENT.shareUrl,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE.title,
    description: `Sunset cruise, moonrise dance party on Lake Travis. $${EVENT.price} — light bites included, drinks via Party On Delivery.`,
    images: [OG_IMAGE],
  },
  // Preview build — hold out of the search index until the launch checklist runs.
  robots: { index: false, follow: false },
};

/** /full-moon — Lake Travis Full Moon Party landing page (preview). */
export default function FullMoonPage(): React.ReactElement {
  return <FullMoonParty />;
}

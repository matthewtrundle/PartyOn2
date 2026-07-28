import type { Metadata } from 'next';
import FullMoonParty from '@/components/full-moon/FullMoonParty';
import { EVENT, OG_IMAGE, SHARE } from '@/components/full-moon/event';

export const metadata: Metadata = {
  title: 'Lake Travis Full Moon Party · Party On Delivery',
  description: `A sunset cruise that becomes a moonrise dance party on Lake Travis — a four-hour BYOB cruise on ${EVENT.dateLabel} with a DJ, a taco bar, and water, ice & cups. $${EVENT.price} a ticket; drinks ordered ahead through Party On Delivery.`,
  alternates: { canonical: '/full-moon-aug28' },
  openGraph: {
    title: SHARE.title,
    description: `${EVENT.shortDate} — sunset cruise + full-moon dance party on Lake Travis. $${EVENT.price} with a taco bar included, BYOB via Party On Delivery.`,
    url: EVENT.shareUrl,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE.title,
    description: `${EVENT.shortDate} — sunset cruise + full-moon dance party on Lake Travis. $${EVENT.price} with a taco bar included, BYOB via Party On Delivery.`,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

/** /full-moon-aug28 — Lake Travis Full Moon Party landing page (Aug 28 event). */
export default function FullMoonPage(): React.ReactElement {
  return <FullMoonParty />;
}

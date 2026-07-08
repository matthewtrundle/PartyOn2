import type { Metadata } from 'next';
import FullMoonParty from '@/components/full-moon/FullMoonParty';
import { EVENT, OG_IMAGE, SHARE } from '@/components/full-moon/event';

export const metadata: Metadata = {
  title: 'Lake Travis Full Moon Party · Party On Delivery',
  description:
    'A sunset cruise that becomes a moonrise dance party on Lake Travis — taco bar included, drinks delivered by Party On Delivery. Once a month, when the moon is full.',
  alternates: { canonical: '/full-moon' },
  openGraph: {
    title: SHARE.title,
    description: 'Sunset cruise, moonrise dance party, tacos on deck on Lake Travis. $69, taco bar included.',
    url: EVENT.shareUrl,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE.title,
    description: 'Sunset cruise, moonrise dance party, tacos on deck on Lake Travis. $69, taco bar included.',
    images: [OG_IMAGE],
  },
  // Preview build — hold out of the search index until the launch checklist runs.
  robots: { index: false, follow: false },
};

/** /full-moon — Lake Travis Full Moon Party landing page (preview). */
export default function FullMoonPage(): React.ReactElement {
  return <FullMoonParty />;
}

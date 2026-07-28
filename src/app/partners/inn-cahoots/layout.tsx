import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Inn Cahoots - Free Alcohol Delivery | Party On Delivery',
  description:
    'Get free alcohol delivery to Inn Cahoots on East 6th Street in Austin. We stock your fridge at check-in with beer, wine, spirits, and mixers. Perfect for bachelorette parties, weddings, and corporate retreats.',
  openGraph: {
    title: 'Inn Cahoots - Free Alcohol Delivery',
    description:
      "Austin's boutique hotel on East 6th. Get free delivery to your room — fridge stocked when you check in. Easy group ordering for bach parties, weddings, and corporate retreats.",
    images: [
      {
        url: '/images/partners/hotel-partner.webp',
        width: 1200,
        height: 630,
        alt: 'Inn Cahoots boutique hotel on East 6th Street - Free alcohol delivery',
      },
    ],
  },
  keywords: [
    'Inn Cahoots alcohol delivery',
    'East 6th hotel drinks',
    'Austin hotel alcohol delivery',
    'bachelorette hotel Austin',
    'corporate retreat Austin drinks',
  ],
};

interface LayoutProps {
  children: ReactNode;
}

export default function InnCahootsLayout({
  children,
}: LayoutProps): ReactElement {
  return <>{children}</>;
}

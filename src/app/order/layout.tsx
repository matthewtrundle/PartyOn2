/**
 * @fileoverview Layout for Order page with SEO metadata
 * @module app/order/layout
 */

import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Order | Party On Delivery - Your Bar, Delivered',
  description:
    'Your bar, delivered. Tap, add, party on. Fast alcohol delivery in Austin with one-tap ordering. Beer, wine, spirits, and cocktail kits delivered to your door.',
  alternates: {
    canonical: '/order',
  },
  openGraph: {
    title: 'Your Bar, Delivered | Party On Delivery',
    description: 'Tap. Add. Party On. Fast alcohol delivery in Austin.',
    url: 'https://partyondelivery.com/order',
    type: 'website',
  },
};

export default function OrderLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <>{children}</>;
}

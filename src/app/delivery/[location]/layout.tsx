import { Metadata } from 'next'

// Layout-level fallback metadata only. Per-location title/description/
// canonical are set by generateMetadata in page.tsx. Do NOT add
// alternates.canonical here — it cascades to every /delivery/<slug>
// and points them at /delivery-areas (the parent listing page).
export const metadata: Metadata = {
  title: 'Alcohol Delivery | Party On Delivery Austin',
  description: 'Premium alcohol delivery in Austin, TX. Same-day and scheduled delivery of spirits, wine, beer, and cocktail ingredients to your neighborhood.',
  keywords: 'alcohol delivery Austin, liquor delivery, wine delivery, beer delivery, spirits delivery, same-day alcohol delivery',
  openGraph: {
    title: 'Alcohol Delivery | Party On Delivery Austin',
    description: 'Premium alcohol delivery in Austin. Same-day and scheduled delivery to your neighborhood.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function DeliveryLocationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

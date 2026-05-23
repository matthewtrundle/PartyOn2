import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Austin Event Planning Blog - Cocktail Tips',
  description: 'Expert advice on event planning, cocktail recipes, party hosting, and alcohol selection. Tips for weddings, bachelorette parties, corporate events, and more in Austin.',
  keywords: 'event planning blog Austin, cocktail recipes, party planning tips, bachelorette party ideas, wedding alcohol planning, corporate event tips',
  // No alternates.canonical here. Per-post canonicals are set by
  // generateMetadata in [slug]/page.tsx; the index page sets its own
  // canonical in page.tsx. Setting it here cascades into child routes
  // that miss a generateMetadata path and points them at /blog.
  openGraph: {
    title: 'Blog | Event Planning & Cocktail Tips | Party On Delivery',
    description: 'Expert advice on event planning, cocktail recipes, and party hosting in Austin.',
    url: 'https://partyondelivery.com/blog',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

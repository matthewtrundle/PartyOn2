import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, Fraunces, Manrope } from 'next/font/google';
import dynamic from 'next/dynamic';
import "./globals.css";
import AgeVerification from "@/components/AgeVerification";
import { CartProvider } from "@/contexts/CartContext";
import { CustomerProvider } from "@/contexts/CustomerContext";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { structuredData } from "./structured-data";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MetaPixel from "@/components/MetaPixel";
import ClarityInit from "@/components/ClarityInit";
import AttributionTracker from "@/components/AttributionTracker";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Lazy load GroupOrderProvider - only needed on specific pages
const GroupOrderProvider = dynamic(
  () => import('@/contexts/GroupOrderContext').then(mod => mod.GroupOrderProvider),
  { ssr: true }
);

// Visitor pixel + returning-visitor bubble scaffold (Brian's Stuff → Leads).
// Imported as a regular client component — App Router doesn't allow
// `dynamic({ ssr: false })` inside Server Components (this layout is one).
import PixelMount from '@/components/leads/PixelMount';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://partyondelivery.com'),
  title: "Alcohol Delivery Austin | Party On Delivery",
  description: "Beer, wine, liquor, kegs & party supplies delivered in Austin TX. Same-day delivery for weddings, lake parties & events. Order online now.",
  keywords: "alcohol delivery austin, alcohol delivery near me, alcohol delivery service, wedding bar service, lake travis boat party, austin party delivery, beer delivery austin, liquor delivery austin",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Alcohol Delivery Austin | Party On Delivery",
    description: "Beer, wine, liquor, kegs & party supplies delivered in Austin TX. Same-day delivery for weddings, lake parties & events. Order online now.",
    url: "https://partyondelivery.com",
    siteName: "Party On Delivery",
    images: [
      {
        url: "/images/og-image.png",
        width: 2659,
        height: 1536,
        alt: "Party On Delivery - Austin Premium Alcohol Delivery",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alcohol Delivery Austin | Party On Delivery",
    description: "Beer, wine, liquor, kegs & party supplies delivered in Austin TX. Same-day delivery for weddings, lake parties & events. Order online now.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains for faster resource loading */}
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        <GoogleAnalytics />
        <MetaPixel />
        <AttributionTracker />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.variable} ${barlowCondensed.variable} ${fraunces.variable} ${manrope.variable} antialiased bg-white text-gray-900`}>
        <CustomerProvider>
          <CartProvider>
            <GroupOrderProvider>
              <AgeVerification />
              <PixelMount />
              <ClientLayoutWrapper>
                {children}
              </ClientLayoutWrapper>
            </GroupOrderProvider>
          </CartProvider>
        </CustomerProvider>
        <ClarityInit />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

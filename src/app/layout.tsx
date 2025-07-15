import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AgeVerification from "@/components/AgeVerification";

export const metadata: Metadata = {
  title: "Party On Delivery - Austin's Premier Alcohol Delivery Service",
  description: "Premium alcohol delivery for weddings, boat parties, and events in Austin. From Lake Travis to downtown, we bring the party to you. Licensed, insured, and ready in 30 minutes.",
  keywords: "alcohol delivery austin, wedding bar service, lake travis boat party, austin party delivery, premium spirits delivery",
  openGraph: {
    title: "Party On Delivery - Austin's Premier Alcohol Delivery Service",
    description: "Premium alcohol delivery for weddings, boat parties, and events in Austin. Licensed, insured, and ready in 30 minutes.",
    url: "https://partyondelivery.com",
    siteName: "Party On Delivery",
    images: [
      {
        url: "/images/hero/lake-travis-sunset.webp",
        width: 1200,
        height: 630,
        alt: "Party On Delivery - Austin Premium Alcohol Delivery",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Party On Delivery - Austin's Premier Alcohol Delivery Service",
    description: "Premium alcohol delivery for weddings, boat parties, and events in Austin.",
    images: ["/images/hero/lake-travis-sunset.webp"],
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
      <body className="antialiased bg-white text-navy-900">
        <AgeVerification />
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

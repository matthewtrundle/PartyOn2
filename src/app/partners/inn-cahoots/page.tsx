'use client';

import { useState, Suspense, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import JoinOrderModal from '@/components/partners/JoinOrderModal';
import InnCahootsHero from '@/components/partners/InnCahootsHero';
import LazyVideo from '@/components/partners/LazyVideo';

// Real Google reviews pulled from GbpReview table (synced via Places API).
// Selected for relevance to Inn Cahoots' BnB / lodging / event-venue use case.
const TESTIMONIALS = [
  {
    reviewer: 'Austin Bach Babes',
    rating: 5,
    text: 'Party On Delivery made our weekend absolutely effortless and so much fun! They brought all our alcohol right to our Airbnb! No stress, no running around, just pure convenience! We added the Skinnyrita drink package and it even came with a dispenser so our group could keep the drinks flowing. If you want that luxury, full-service party vibe brought to you anywhere... pool, lake, backyard, you name it — this is the team to call!',
  },
  {
    reviewer: 'Qiana Valentine',
    rating: 5,
    text: 'Party On Delivery was amazing! Took one big part off of my plate for my sister\'s bachelorette weekend. I didn\'t have to worry about drinks at all. Highly recommend them for all needs. Ordering online in advance and having what we needed waiting for us was perfect! 10/10',
  },
  {
    reviewer: 'Mary H.',
    rating: 5,
    text: 'Party on Delivery did a great job helping me plan drinks for my son\'s wedding reception, setting us up with a good bartender, delivering the drinks as ordered and refunding unopened cases afterwards. It was a pleasure working with Allan, who made the whole process so easy for me.',
  },
  {
    reviewer: 'Jodi Hiller',
    rating: 5,
    text: 'Party On Delivery was amazing to work with! They had ample availability for delivery time slots, were communicative throughout the whole process, and got us everything we needed right to our door. It\'s great that they have mixers, alcohol, hydration packets, and food! All in one spot. Can\'t recommend enough!',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How does delivery to Inn Cahoots work?',
    a: 'Place your order online and select your check-in date and time. We\'ll deliver everything to Inn Cahoots and stock your fridge before you arrive. It\'s that simple.',
  },
  {
    q: 'Can you stock the fridge before we check in?',
    a: 'Absolutely — that\'s our specialty. Just let us know your check-in time and we\'ll coordinate with the hotel to have your drinks cold and ready when you walk in.',
  },
  {
    q: 'What\'s the ordering deadline?',
    a: 'We recommend ordering at least 24 hours before your check-in. Same-day delivery may be available depending on our schedule — text us at 737-371-9700 to check.',
  },
  {
    q: 'Can our group split the order?',
    a: 'Yes! Start a group order and share the link with your crew. Everyone adds what they want and pays for their own items. One delivery, zero Venmo math.',
  },
  {
    q: 'Do you deliver ice, cups, and mixers too?',
    a: 'We sure do. Beer, wine, spirits, seltzers, mixers, ice, cups, shot glasses — everything you need for a good time.',
  },
  {
    q: 'Is there an age requirement for delivery?',
    a: 'Yes. Someone 21+ must be present to receive the delivery. We check IDs — it\'s a TABC thing, and we take it seriously.',
  },
];

/**
 * Inn Cahoots - Drink Delivery Service Landing Page
 * Boutique hotel + event venue on East 6th Street, Austin
 */
function InnCahootsPageContent(): ReactElement {
  const searchParams = useSearchParams();
  void searchParams;

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-white min-h-screen">
      {/* Navigation - Always hidden on this partner page */}
      <Navigation hidden />

      {/* HERO SECTION */}
      <InnCahootsHero />

      {/* INFO CARD SECTION */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <h2 className="font-heading text-2xl md:text-3xl text-gray-900 text-center mb-8">
            Inn Cahoots
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Address</p>
                  <p className="text-gray-600 text-sm">1221 E 6th St<br />Austin, TX 78702</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Phone</p>
                  <a href="tel:5129432175" className="text-brand-blue hover:text-brand-blue/80 text-sm">(512) 943-2175</a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Email</p>
                  <a href="mailto:mischief@inncahoots.com" className="text-brand-blue hover:text-brand-blue/80 text-sm">mischief@inncahoots.com</a>
                </div>
              </div>

              {/* Website */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Website</p>
                  <a href="https://inncahoots.com" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:text-brand-blue/80 text-sm">inncahoots.com</a>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=1221+E+6th+St+Austin+TX+78702"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-blue text-white font-semibold text-sm rounded-lg px-5 py-2.5 hover:bg-brand-blue/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Get Directions
              </a>
              <a
                href="https://inncahoots.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-blue/80 font-semibold text-sm transition-colors"
              >
                Visit Hotel Website
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO + WHAT'S INCLUDED SECTION */}
      <section className="py-12 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-2">
              How It Works
            </p>
            <h2 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-wide">
              Drinks Delivered to Your Room
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
            {/* Trust Video - Takes 3 columns on desktop */}
            <div className="lg:col-span-3 flex justify-center">
              <div className="w-full max-w-[400px] rounded-xl overflow-hidden shadow-2xl bg-gray-900 aspect-[9/16]">
                <LazyVideo
                  src="/videos/inn-cahoots-reel.mp4"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* What's Included - Takes 2 columns on desktop */}
            <div className="lg:col-span-2 bg-gray-50 rounded-xl p-8 shadow-lg flex flex-col">
              <p className="text-gray-500 tracking-[0.1em] uppercase text-base mb-2 text-center">
                Once You&apos;re In, You&apos;re Inn ;)
              </p>
              <h3 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-wide mb-6 text-center">
                Every Order Includes
              </h3>
              <div className="space-y-4 flex-grow">
                {[
                  { item: 'FREE delivery to Inn Cahoots', value: '$50' },
                  { item: 'Fridge stocked before check-in', value: '$25' },
                  { item: 'Group ordering with split payments', value: 'FREE' },
                  { item: 'Drinks ready when you arrive', value: 'FREE' },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0"
                  >
                    <span className="flex items-center gap-3 text-gray-900 text-base">
                      <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {row.item}
                    </span>
                    <span className="text-gray-900 font-semibold text-base">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center">
                <span className="font-heading text-lg text-gray-900">Total Value</span>
                <span className="font-heading text-xl text-gray-900 font-semibold">$75+ FREE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-16 px-6 md:px-12 bg-gray-100 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-3">
              Real Reviews
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-wide mb-4">
              What Our Customers Say
            </h2>
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-medium text-gray-900">4.9 · 94+ reviews on Google</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {TESTIMONIALS.map((review, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">&quot;{review.text}&quot;</p>
                <p className="font-medium text-gray-900">&mdash; {review.reviewer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-20 px-6 md:px-12 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 lg:gap-12 items-center justify-center">
            {/* LEFT: Video */}
            <div className="flex justify-center">
              <div className="relative w-48 md:w-56 rounded-2xl overflow-hidden bg-gray-800 shadow-2xl aspect-[9/16]">
                <LazyVideo
                  src="/videos/trust-section.mp4"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>

            {/* RIGHT: Logo + Title + Paragraph */}
            <div className="flex flex-col text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <Image
                  src="/images/pod-logo-2025.svg"
                  alt="Party On Delivery"
                  width={180}
                  height={180}
                  className="w-32 h-32 md:w-44 md:h-44"
                />
              </div>

              <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-6">
                Austin-Born. Fully Licensed. Always On Time.
              </h2>

              <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
                Howdy! We&apos;re Allan and Brian, owners of Party On Delivery. Austin natives with 15+ years in events and hospitality, we built this business around one thing: taking care of people. We pride ourselves on clear communication, on-time delivery, and showing people the best of our great city. Our goal is simple - make your weekend easy, safe, and fun.
              </p>
              <p className="text-brand-yellow text-xl md:text-2xl font-heading mt-6 tracking-wide">
                PARTY ON Y&apos;ALL
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-3">
              Got Questions?
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-wide">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-base pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 text-base leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 px-6 md:px-12 bg-gradient-to-br from-yellow-500 to-brand-yellow">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-wide">
            Ready for Your Stay?
          </h2>
          <p className="text-gray-800 text-lg mb-8 max-w-2xl mx-auto">
            Get your drinks delivered before you check in. Free delivery. Easy group ordering. Zero hassle.
          </p>

          <div className="flex flex-col items-center gap-3 mb-6">
            <Link
              href="/order?ref=MISCHIEF"
              className="px-10 py-4 bg-gray-900 text-white hover:bg-gray-800 font-semibold tracking-wider transition-colors rounded-lg"
            >
              Start an Order
            </Link>
          </div>

          <p className="text-gray-700">
            Questions? Call us:{' '}
            <a href="tel:7373719700" className="font-semibold underline">
              737.371.9700
            </a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* MODALS */}
      <JoinOrderModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}

/**
 * Page wrapper with Suspense boundary for useSearchParams
 */
export default function InnCahootsPage(): ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <InnCahootsPageContent />
    </Suspense>
  );
}

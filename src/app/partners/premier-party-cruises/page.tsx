'use client';

import { useState, Suspense, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import HouseTabUpsell from '@/components/partners/HouseTabUpsell';
import PremierHero from '@/components/partners/PremierHero';
import PremierHeroStickyCTA from '@/components/partners/PremierHeroStickyCTA';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

/** Real Google reviews for boat parties */
const TESTIMONIALS = [
  {
    reviewer: 'Kirby Parsons',
    tag: 'Drinks were iced + ready',
    text: 'Must do if going on premier disco cruise in ATX!!! So easy, didn\'t have to bring anything with us and it was all set up by the time we even arrived. Needed no communication with company on day of they just know what they\'re doing!',
  },
  {
    reviewer: 'Chop Choplin',
    tag: '50-person party handled',
    text: 'Working with Party on Delivery for our 50 person boat party was a massive game changer. They had everything we could possibly need to order and communication was on point! Having everything delivered to the boat, drinks iced, and ready to go when we got there was such a pleasure.',
  },
  {
    reviewer: 'Casey Ancar',
    tag: 'Didn\'t carry anything',
    text: 'I booked Premier Party for my 30th birthday and it was a blast! My party of 14 booked The 25 ppl boat to have more space. The Party On delivery service was soooo convenient. They delivered my drink order straight to the boat along with ice and cups.',
  },
  {
    reviewer: 'Nikita Patel',
    tag: 'Cooler labeled with our name',
    text: 'We picked them for delivery when we did the ATX Party Boats. We got on board, our drinks were in a cooler with our name on it, on ice. My group and I did not have to worry about lugging anything to the boat in the Texan heat.',
  },
];

/** Boat-specific FAQ questions */
const BOAT_FAQS = [
  {
    question: 'When do you deliver to the marina?',
    answer: 'We deliver 30-60 minutes before your scheduled departure time so everything is iced and ready when you board.',
  },
  {
    question: "What's the ordering deadline?",
    answer: 'We recommend placing your order at least 24 hours in advance. Same-day orders may be available depending on our delivery schedule.',
  },
  {
    question: 'What do you need from me (boat name / captain / time)?',
    answer: 'We just need your boat name or booking reference, captain name, departure time, and the marina dock location. You can add these details during checkout.',
  },
  {
    question: 'ID requirements?',
    answer: 'We are TABC licensed and require a valid ID from the person receiving the delivery. All recipients must be 21+.',
  },
  {
    question: 'Do you include ice and cups?',
    answer: 'Yes! Every order includes a cooler stocked with ice and cups at no extra charge.',
  },
  {
    question: 'What if something is out of stock?',
    answer: "We'll text you right away with similar alternatives. You can approve the swap or remove the item — we never substitute without your OK.",
  },
];

/** House delivery FAQ questions */
const HOUSE_FAQS = [
  {
    question: 'How does the House Tab work?',
    answer: 'Add a house delivery to your group order. Everyone uses the same group link to pick drinks for the house — we deliver separately to your rental before you arrive.',
  },
  {
    question: 'Can people pay separately on the House Tab too?',
    answer: 'Yes! Same split-payment system. Each person checks out their own items — boat drinks and house drinks stay on one group link.',
  },
  {
    question: 'Can you fridge-stock our rental?',
    answer: 'Absolutely. If someone at the rental can receive the delivery (21+ with valid ID), we\'ll stock the fridge, fill the cooler, and have everything ready when your group walks in.',
  },
  {
    question: 'Can we schedule a specific delivery time?',
    answer: 'Yes — just add your preferred delivery window during checkout. We\'ll confirm the time via text and deliver within that window.',
  },
];

/**
 * Premier Party Cruises - Drink Delivery Service Landing Page
 * Optimized for customers who have already booked their boat
 */
function PremierPartyCruisesPageContent(): ReactElement {
  const [openBoatFaq, setOpenBoatFaq] = useState<number | null>(0);
  const [openHouseFaq, setOpenHouseFaq] = useState<number | null>(0);

  return (
    <div className="bg-white min-h-screen">
      {/* Navigation - Always hidden on this partner page */}
      <Navigation hidden />

      {/* ============================================ */}
      {/* SECTION 1: HERO                              */}
      {/* ============================================ */}
      <PremierHero />

      {/* ============================================ */}
      {/* SECTIONS 2+3: VALUE STACK + HOW IT WORKS     */}
      {/* Combined two-column on desktop               */}
      {/* ============================================ */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* LEFT: Every Order Includes */}
            <div>
              <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2 text-center md:text-left">
                Boat Day = Handled
              </p>
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-6 text-center md:text-left">
                Every Order Includes
              </h2>

              <div className="space-y-1">
                {[
                  { item: 'FREE delivery to Premier Party Cruises marina', struck: '$50', label: 'FREE' },
                  { item: 'Cooler stocked with ice', struck: '$25', label: 'FREE' },
                  { item: 'Group ordering with split payments', struck: null, label: 'FREE' },
                  { item: 'Private reserved cooler on Disco Cruise', struck: null, label: 'FREE' },
                ].map((row, idx) => (
                  <ScrollRevealCSS key={idx} delay={idx * 80}>
                    <div className="flex items-center gap-3 py-3 border-b border-gray-200 last:border-0">
                      <svg className="w-6 h-6 text-brand-blue flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-900 font-semibold flex-1">{row.item}</span>
                      <span className="flex items-center gap-2">
                        {row.struck && (
                          <span className="text-gray-500 line-through text-sm">{row.struck}</span>
                        )}
                        <span className="text-brand-blue font-bold">{row.label}</span>
                      </span>
                    </div>
                  </ScrollRevealCSS>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-300 text-center md:text-left">
                <span className="text-gray-700 font-sans">
                  Premier guest perks: <strong className="text-gray-900">$75+ value included</strong>
                </span>
              </div>

              <div className="mt-6 text-center md:text-left">
                <Button variant="cart" size="md" href="/order?ref=PREMIER&p=boat&d=boat">
                  Order Your Drinks
                </Button>
              </div>
            </div>

            {/* RIGHT: How It Works */}
            <div>
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-6 text-center md:text-left">
                How group ordering works
              </h2>

              <div className="space-y-4">
                {[
                  { step: 1, title: 'Start the group', desc: 'Get a share link + code' },
                  { step: 2, title: 'Friends add what they want', desc: 'Each person checks out separately' },
                  { step: 3, title: 'We deliver one combined order', desc: 'Iced and ready at the marina' },
                ].map((s, idx) => (
                  <ScrollRevealCSS key={s.step} delay={idx * 100}>
                    <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="w-10 h-10 rounded-lg bg-brand-blue text-white font-heading font-bold flex items-center justify-center flex-shrink-0 text-lg">
                        {s.step}
                      </div>
                      <div>
                        <h3 className="font-heading text-base text-gray-900 font-bold">{s.title}</h3>
                        <p className="font-sans text-gray-600 text-sm mt-1">{s.desc}</p>
                      </div>
                    </div>
                  </ScrollRevealCSS>
                ))}
              </div>

              {/* Callout box */}
              <div className="mt-4 bg-brand-yellow/10 border-l-4 border-brand-yellow rounded-lg p-4">
                <p className="text-gray-900 font-semibold text-sm">
                  Hosts love this: everyone pays their portion. No collecting money.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 4: HOUSE TAB UPSELL                  */}
      {/* ============================================ */}
      <HouseTabUpsell />

      {/* ============================================ */}
      {/* SECTION 4b: WEDDING VENUE PACKAGES           */}
      {/* Cross-link to /austin-wedding-venue-boats —  */}
      {/* Premier boats double as a wedding venue.     */}
      {/* ============================================ */}
      <section className="bg-white py-16 md:py-24 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2">
              Wedding Venue Packages
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4">
              Getting married on the lake?
            </h2>
            <p className="text-base text-gray-700 max-w-2xl mx-auto">
              Premier boats also serve as a small, intimate wedding venue —
              ceremony on the deck, rehearsal dinner the night before, brunch
              cruise the morning after. 20-80 guests. We handle the bar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                title: 'Ceremony On The Lake',
                price: 'From $1,899',
                blurb: 'Elopements, micro-weddings, vow renewals. 20-30 guests.',
              },
              {
                title: 'Wedding Weekend',
                price: 'From $5,999',
                blurb: 'Rehearsal + ceremony + brunch. One boat, one weekend.',
              },
              {
                title: 'Photography Cruise',
                price: '$1,499',
                blurb: '90-min sunset cruise for photos + the wedding party.',
              },
            ].map((card) => (
              <div key={card.title} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-heading text-lg font-bold tracking-[0.05em] text-gray-900 mb-1">
                  {card.title}
                </h3>
                <p className="text-sm font-semibold text-brand-blue mb-2">{card.price}</p>
                <p className="text-sm text-gray-700">{card.blurb}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="primary" size="lg" href="/austin-wedding-venue-boats">
              See Wedding Venue Packages
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 5: EXPERIENCE PROOF (Video)          */}
      {/* ============================================ */}
      <section id="experience-proof" className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-8">
            What a boat day looks like
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Video - left column */}
            <ScrollRevealCSS className="md:col-span-3">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl bg-gray-900">
                <iframe
                  src="https://www.youtube.com/embed/4-Yx24Y6oro?rel=0&modestbranding=1"
                  title="Premier Party Cruises boat party experience"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </ScrollRevealCSS>

            {/* Right column - recap + CTA */}
            <ScrollRevealCSS delay={200} className="md:col-span-2 flex flex-col justify-center">
              <h3 className="font-heading text-xl text-gray-900 font-bold mb-4">Every order includes:</h3>
              <ul className="space-y-3 mb-6">
                {[
                  'Free marina delivery',
                  'Cooler stocked with ice',
                  'Group ordering with split payments',
                  'Private reserved cooler on Disco Cruise',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 font-sans">
                    <svg className="w-5 h-5 text-brand-blue flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="cart" size="lg" href="/order?ref=PREMIER&p=boat&d=boat">
                Order Your Drinks
              </Button>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 6: REVIEWS (Social Proof)            */}
      {/* ============================================ */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue text-center mb-2">
            Real Reviews
          </p>
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 text-center mb-10">
            What Premier guests say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((review, idx) => (
              <ScrollRevealCSS key={idx} delay={idx * 100}>
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:-translate-y-1 transition-all duration-200 hover:shadow-lg">
                  {/* Outcome tag */}
                  <span className="inline-block bg-brand-blue/10 text-brand-blue text-xs font-semibold rounded-lg px-2 py-1 mb-3">
                    {review.tag}
                  </span>
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="font-sans text-gray-600 text-sm mb-4 leading-relaxed">&quot;{review.text}&quot;</p>
                  <p className="font-heading text-gray-900 font-bold">&mdash; {review.reviewer}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="cart" size="lg" href="/order?ref=PREMIER&p=boat&d=boat">
              Order Your Drinks
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 7: FAQ (Two-Column)                  */}
      {/* ============================================ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4">
              FAQs
            </h2>
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Boat Delivery FAQs */}
            <div>
              <h3 className="font-heading text-xl text-gray-900 font-bold mb-4">Boat Delivery</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                {BOAT_FAQS.map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-b-0">
                    <button
                      onClick={() => setOpenBoatFaq(openBoatFaq === index ? null : index)}
                      className="w-full py-5 flex items-center justify-between text-left group"
                      aria-expanded={openBoatFaq === index}
                    >
                      <span className="font-sans font-medium text-gray-900 group-hover:text-brand-blue transition-colors pr-4">
                        {faq.question}
                      </span>
                      <motion.span
                        animate={{ rotate: openBoatFaq === index ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 text-gray-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {openBoatFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="pb-5 text-gray-600 leading-relaxed">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* House Delivery FAQs */}
            <div>
              <h3 className="font-heading text-xl text-gray-900 font-bold mb-4">House Delivery</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                {HOUSE_FAQS.map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-b-0">
                    <button
                      onClick={() => setOpenHouseFaq(openHouseFaq === index ? null : index)}
                      className="w-full py-5 flex items-center justify-between text-left group"
                      aria-expanded={openHouseFaq === index}
                    >
                      <span className="font-sans font-medium text-gray-900 group-hover:text-brand-blue transition-colors pr-4">
                        {faq.question}
                      </span>
                      <motion.span
                        animate={{ rotate: openHouseFaq === index ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 text-gray-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {openHouseFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="pb-5 text-gray-600 leading-relaxed">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 8: ABOUT / TRUST                    */}
      {/* ============================================ */}
      <section className="bg-gray-900 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Video */}
            <ScrollRevealCSS className="flex justify-center">
              <div className="relative w-48 md:w-56 lg:w-full lg:max-w-xs rounded-lg overflow-hidden bg-gray-800 shadow-2xl aspect-[9/16] lg:aspect-auto lg:h-full">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                >
                  <source src="/videos/trust-section.mp4" type="video/mp4" />
                </video>
              </div>
            </ScrollRevealCSS>

            {/* Right: About */}
            <ScrollRevealCSS delay={200}>
              <h2 className="font-heading text-3xl md:text-4xl text-white mb-6">
                Austin-Born. Fully Licensed. Always On Time.
              </h2>
              <p className="font-sans text-white/80 mb-6 leading-relaxed">
                Howdy! We&apos;re Allan and Brian, owners of Party On Delivery. Austin natives with 15+ years in events and hospitality, we built this business around one thing: taking care of people.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'TABC licensed + compliant ID checks',
                  'Local team, fast communication',
                  'Thousands of successful deliveries',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <svg className="w-5 h-5 text-brand-yellow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="sms:7373719700"
                className="text-brand-yellow hover:text-brand-yellow/80 underline font-sans text-sm"
              >
                Text us your details &rarr; we&apos;ll help you build the cart
              </a>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 9: FINAL CTA (Strong Close)         */}
      {/* ============================================ */}
      <section className="bg-brand-yellow py-16 md:py-24">
        <ScrollRevealCSS>
          <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-5xl text-gray-900 mb-4">
              Ready for the lake?
            </h2>
            <p className="font-sans text-gray-900/80 mb-8">
              Free marina delivery. Easy group ordering. Zero hassle.
            </p>

            <div className="flex flex-col items-center gap-3 mb-6">
              <Button variant="primary" size="lg" href="/order?ref=PREMIER&p=boat&d=boat">
                Order Your Drinks
              </Button>
            </div>

            <p className="text-gray-900/60 text-sm font-sans">
              Questions? Text us:{' '}
              <a href="tel:7373719700" className="font-semibold underline">
                737-371-9700
              </a>
            </p>
          </div>
        </ScrollRevealCSS>
      </section>

      {/* ============================================ */}
      {/* SECTION 10: FOOTER                           */}
      {/* ============================================ */}
      <div className="pb-24 md:pb-20">
        <Footer />
      </div>

      {/* Mobile Sticky CTA - only visible on mobile */}
      <PremierHeroStickyCTA />

    </div>
  );
}

/**
 * Page wrapper with Suspense boundary for useSearchParams
 * Required by Next.js 15 for client components using search params
 */
export default function PremierPartyCruisesPage(): ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PremierPartyCruisesPageContent />
    </Suspense>
  );
}

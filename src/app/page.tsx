import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import Navigation from "@/components/Navigation";
import HeroSectionExperimental from '@/components/homepage/HeroSectionExperimental';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { generateFAQSchema } from '@/lib/seo/schemas';
import TrackedLink from '@/components/analytics/TrackedLink';
import HomepageTracking from '@/components/analytics/HomepageTracking';

export default function HomePage() {
  // Homepage FAQ data for schema markup
  const homepageFAQs = [
    {
      question: "Do you deliver to venues, Airbnbs, offices, or boats?",
      answer: "Yes—coordinated handoff so you're not waiting around."
    },
    {
      question: "How far ahead should I book?",
      answer: "72 hours recommended; peak dates fill fast so book early."
    },
    {
      question: "Can you staff bartenders?",
      answer: "Yes via vetted TABC-certified partners for full-service events."
    },
    {
      question: "Do you bring ice and disposables?",
      answer: "Yes—add cups, napkins, stirrers, and ice to your cart."
    },
    {
      question: "Refunds on unopened items for weddings?",
      answer: "100% refund policy—we want your day perfect, not wasteful."
    },
    {
      question: "Are you licensed and insured?",
      answer: "Yes—TABC certified + $2M insurance. Fully licensed operation."
    }
  ];

  const faqSchema = generateFAQSchema(homepageFAQs);

  return (
    <div className="bg-white">
      {/* GA4 Scroll Tracking */}
      <HomepageTracking />

      {/* FAQ Schema for Homepage */}
      <Script
        id="homepage-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Navigation />

      {/* Hero Section - Client Component with A/B Testing */}
      <HeroSectionExperimental />

      {/* Seasonal: 4th of July landing-page CTA (sits directly under the hero) */}
      <section className="bg-white py-8 border-b border-gray-100">
        <div className="container-custom flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <span aria-hidden="true" className="hidden h-8 w-1.5 rounded-full bg-gradient-to-b from-red-600 via-white to-blue-600 sm:block" />
          <p className="text-sm font-semibold tracking-[0.08em] text-gray-700">HOSTING FOR THE FOURTH?</p>
          <TrackedLink href="/austin-4th-of-july-delivery" section="choose_path" buttonText="4th of July Drinks">
            <button className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-8 py-4 text-sm font-semibold tracking-[0.08em] text-white transition-colors hover:bg-blue-700">
              4th of July Drinks
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </TrackedLink>
        </div>
      </section>

      {/* Start Order CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800} y={30}>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Build your cart in minutes
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-4" />
            <p className="text-gray-600 mb-8 tracking-[0.05em]">
              Beer, spirits, cocktail kits, ice & disposables — everything arrives cold with coordinated handoff
            </p>
            <TrackedLink href="/order" section="choose_path" buttonText="START ORDER">
              <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm">
                START ORDER
              </button>
            </TrackedLink>
            <p className="text-gray-500 text-sm mt-6 tracking-[0.05em]">
              Austin locals serving Downtown to Lake Travis since 2023
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Group Order / Split-Pay callout */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="max-w-6xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2 text-center md:text-left">
                <p className="text-gold text-sm tracking-[0.2em] uppercase mb-3">
                  Split-pay group ordering
                </p>
                <h2 className="font-heading text-3xl md:text-4xl text-white mb-3 tracking-[0.05em] leading-tight">
                  Planning with a group? Build one order. Everyone pays their share.
                </h2>
                <p className="text-white/70 text-base md:text-lg leading-relaxed">
                  Built for bach weekends, lake days, Airbnbs, and corporate events — invite your group, let everyone add what they want, and check out separately.
                </p>
              </div>
              <div className="flex flex-col items-center md:items-end gap-3">
                <TrackedLink href="/group/create" section="group_order_strip" buttonText="START A GROUP ORDER">
                  <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-semibold">
                    START A GROUP ORDER
                  </button>
                </TrackedLink>
                <a href="#how-it-works" className="text-white/70 hover:text-white text-sm tracking-[0.05em] underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors">
                  How it works
                </a>
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Why Austin Books Party On */}
      <section id="experience" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
                Why Austin books Party On
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "On-time, cold delivery",
                description: "Ice, cups, mixers handled so you don't stress",
                gradient: "from-blue-50 to-gray-50",
                icon: (
                  <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                title: "Local concierge",
                description: "We know venues, marinas, and event planners personally",
                gradient: "from-amber-50 to-gray-50",
                icon: (
                  <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                )
              },
              {
                title: "Licensed & insured",
                description: "TABC-certified service you can trust completely",
                gradient: "from-green-50 to-gray-50",
                icon: (
                  <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              },
              {
                title: "No overbuy anxiety",
                description: "Weddings: 100% refund on unopened",
                gradient: "from-rose-50 to-gray-50",
                icon: (
                  <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
            ].map((feature, index) => (
              <ScrollRevealCSS key={feature.title} duration={800} delay={index * 100} y={20}>
                <div className={`relative overflow-hidden rounded-lg group cursor-pointer transform hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br ${feature.gradient} border border-gray-200`}>
                  <div className="relative p-8 text-center">
                    <div className="mb-6">{feature.icon}</div>
                    <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  {/* Subtle gold shimmer on hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-yellow/0 via-brand-yellow/5 to-brand-yellow/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Signature Services */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
                For whatever you&apos;re planning, get the perfect drink menu on easy mode
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            </div>
          </ScrollRevealCSS>

          {/* Service 1: Weddings */}
          <ScrollRevealCSS duration={800} delay={100} y={30}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="relative h-96 overflow-hidden">
              <Image
                src="/images/services/weddings/outdoor-bar-setup.webp"
                alt="Wedding Bar Service"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                loading="lazy"
                quality={60}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 to-transparent" />
            </div>
            <div className="lg:pl-12">
              <h3 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                Weddings
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Make your special day stress-free with coordinated bar service and setup.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <TrackedLink href="/weddings" section="services" buttonText="START WEDDING ORDER">
                  <button className="px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm">
                    START WEDDING ORDER
                  </button>
                </TrackedLink>
              </div>
            </div>
            </div>
          </ScrollRevealCSS>

          {/* Service 2: Boat Parties */}
          <ScrollRevealCSS duration={800} delay={200} y={30}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="lg:pr-12 order-2 lg:order-1">
              <h3 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                Boat Parties
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lake Travis essentials delivered dockside—drinks, ice, and coolers ready to go.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <TrackedLink href="/boat-parties" section="services" buttonText="START LAKE DAY ORDER">
                  <button className="px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm">
                    START LAKE DAY ORDER
                  </button>
                </TrackedLink>
              </div>
            </div>
            <div className="relative h-96 overflow-hidden order-1 lg:order-2">
              <Image
                src="/images/services/boat-parties/luxury-yacht-deck.webp"
                alt="Boat Party Service"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                loading="lazy"
                quality={60}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent" />
            </div>
            </div>
          </ScrollRevealCSS>

          {/* Service 3: Corporate Events */}
          <ScrollRevealCSS duration={800} delay={300} y={30}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 overflow-hidden">
              <Image
                src="/images/services/corporate/penthouse-suite-setup.webp"
                alt="Corporate Event Service"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                loading="lazy"
                quality={60}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 to-transparent" />
            </div>
            <div className="lg:pl-12">
              <h3 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                Corporate
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Professional office bars and team events with invoice billing available.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <TrackedLink href="/austin-corporate-event-delivery" section="services" buttonText="START CORPORATE ORDER">
                  <button className="px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm">
                    START CORPORATE ORDER
                  </button>
                </TrackedLink>
              </div>
            </div>
            </div>
          </ScrollRevealCSS>

          {/* More event types — compact cards */}
          <ScrollRevealCSS duration={800} delay={150} y={30}>
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Bachelor Parties */}
              <div className="group bg-gradient-to-br from-blue-50 to-gray-50 border border-gray-200 rounded-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <svg className="w-12 h-12 text-brand-yellow mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.1em]">
                  Bachelor Parties
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Lake Travis, Rainey Street, Airbnb — multi-stop drinks coordinated for the whole weekend.
                </p>
                <TrackedLink href="/austin-bachelor-party-delivery" section="services" buttonText="START BACHELOR ORDER">
                  <button className="px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm">
                    START BACHELOR ORDER
                  </button>
                </TrackedLink>
              </div>

              {/* Bachelorette Parties */}
              <div className="group bg-gradient-to-br from-rose-50 to-gray-50 border border-gray-200 rounded-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <svg className="w-12 h-12 text-brand-yellow mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.1em]">
                  Bachelorette Parties
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Pontoon, hotel suite, brunch — cocktail and mocktail kits delivered to every stop on the itinerary.
                </p>
                <TrackedLink href="/austin-bachelorette-party-delivery" section="services" buttonText="START BACHELORETTE ORDER">
                  <button className="px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm">
                    START BACHELORETTE ORDER
                  </button>
                </TrackedLink>
              </div>

              {/* Airbnbs / House Parties */}
              <div className="group bg-gradient-to-br from-amber-50 to-gray-50 border border-gray-200 rounded-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <svg className="w-12 h-12 text-brand-yellow mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.1em]">
                  Airbnbs &amp; House Parties
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Stock the fridge before guests arrive — alcohol, mixers, ice, and extras delivered to the door code.
                </p>
                <TrackedLink href="/order" section="services" buttonText="START HOUSE PARTY ORDER">
                  <button className="px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm">
                    START HOUSE PARTY ORDER
                  </button>
                </TrackedLink>
              </div>
            </div>
          </ScrollRevealCSS>

          {/* Get Event Help anchor */}
          <ScrollRevealCSS duration={800} delay={250} y={20}>
            <div className="mt-12 text-center">
              <TrackedLink href="/contact" section="services" buttonText="GET EVENT HELP">
                <span className="inline-flex items-center gap-2 text-gray-700 hover:text-brand-blue text-base tracking-[0.05em] underline underline-offset-4 decoration-gray-300 hover:decoration-brand-blue transition-colors">
                  Not sure which path? Get Event Help
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </TrackedLink>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Austin Coverage */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
                Serving Austin&apos;s Finest
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                From Lake Travis to Downtown, we deliver excellence to every corner of Austin
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <ScrollRevealCSS duration={800} delay={100} y={30}>
              <div>
              <h3 className="font-heading text-2xl text-gray-900 mb-6 tracking-[0.1em]">
                Downtown & Central
              </h3>
              <ul className="space-y-3">
                {['Rainey Street', '6th Street', 'The Domain', 'Hyde Park', 'South Congress', 'East Austin'].map((area) => (
                  <li key={area} className="flex items-center text-gray-700">
                    <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {area}
                  </li>
                ))}
              </ul>
              </div>
            </ScrollRevealCSS>
            <ScrollRevealCSS duration={800} delay={200} y={30}>
              <div>
              <h3 className="font-heading text-2xl text-gray-900 mb-6 tracking-[0.1em]">
                Lake & Hills
              </h3>
              <ul className="space-y-3">
                {['Lake Travis', 'Westlake Hills', 'Bee Cave', 'Dripping Springs', 'Lakeway', 'Spicewood'].map((area) => (
                  <li key={area} className="flex items-center text-gray-700">
                    <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {area}
                  </li>
                ))}
              </ul>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
                Client Testimonials
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="max-w-4xl mx-auto space-y-12">
            {[
              {
                text: "Party On saved our wedding weekend. Everything was perfectly chilled and the setup was flawless.",
                author: "Sarah M.",
                role: "Austin Wedding, October"
              },
              {
                text: "Best boat party delivery on Lake Travis. They know exactly where to find us.",
                author: "Mike T.",
                role: "Lake Travis Regular, Summer"
              }
            ].map((testimonial, index) => (
              <ScrollRevealCSS key={index} duration={800} delay={index * 100} y={30}>
                <div className="text-center">
                  <p className="text-xl text-gray-700 italic mb-6 leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <p className="text-gray-900 font-light tracking-[0.1em]">
                    {testimonial.author}
                  </p>
                  <p className="text-brand-yellow text-sm tracking-[0.1em]">
                    {testimonial.role}
                  </p>
                  {index < 1 && <div className="w-24 h-px bg-gray-300 mx-auto mt-12" />}
                </div>
              </ScrollRevealCSS>
            ))}

            <ScrollRevealCSS duration={800} delay={300} y={30}>
              <div className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-600 tracking-[0.05em]">
                Open since 2023 • Thousands served • 5.0★ on Google
              </p>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
                How it works
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Tell us date & drop-off window",
                description: "Quick availability check"
              },
              {
                step: "2",
                title: "Choose Delivery Now or Plan an Event",
                description: "Fast order or full coordination"
              },
              {
                step: "3",
                title: "Invite your group, split the bill",
                description: "Everyone adds drinks; pay your share via split-pay group ordering"
              },
              {
                step: "4",
                title: "Everything arrives cold",
                description: "Celebrate stress-free"
              }
            ].map((item, index) => (
              <ScrollRevealCSS key={item.step} duration={800} delay={index * 100} y={30}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center text-xl font-light mx-auto mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {item.description}
                  </p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas - Logistics Help */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
                We Handle the Logistics
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-gray-600 max-w-2xl mx-auto">
                Austin, Lake Travis, Hill Country coverage with specialized delivery expertise
              </p>
            </div>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={800} delay={100} y={30}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              {
                title: "Hotel bell desk handoff",
                description: "No waiting in lobby; we coordinate with staff"
              },
              {
                title: "Airbnb door code coordination",
                description: "Seamless check-in delivery timing"
              },
              {
                title: "Dockside or cove handoff",
                description: "Lake Travis marina and boat delivery expertise"
              },
              {
                title: "Office load-in / invoice billing",
                description: "Corporate-friendly logistics and payment"
              }
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start space-x-4"
              >
                <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Rich Content Section for SEO */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="prose prose-lg max-w-none">
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-6 tracking-[0.1em] text-center">
                Austin&apos;s Premier Alcohol Delivery & Event Bar Service
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-8" />

              <p className="text-gray-700 leading-relaxed mb-6">
                Since 2023, Party On Delivery has been Austin&apos;s trusted partner for premium alcohol delivery and full-service bar coordination. Whether you&apos;re planning an intimate gathering, a <Link href="/austin-corporate-event-delivery" className="text-brand-yellow hover:text-yellow-600 underline">corporate celebration</Link>, or a grand <Link href="/weddings" className="text-brand-yellow hover:text-yellow-600 underline">wedding reception</Link>, we provide the expertise, selection, and seamless execution that elevates every occasion.
              </p>

              <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
                Comprehensive Beverage Selection
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                Our <Link href="/order" className="text-brand-yellow hover:text-yellow-600 underline">curated catalog</Link> features everything from local Austin craft breweries to premium imported spirits. We stock an extensive selection of beer (domestic, craft, and imported), wine (red, white, rosé, and sparkling), and spirits (vodka, whiskey, tequila, rum, gin, and more). Looking for something special? We can source unique selections from Central Texas distributors to match your event&apos;s exact vision.
              </p>

              <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
                Full-Service Event Coordination
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                Planning a <Link href="/weddings" className="text-brand-yellow hover:text-yellow-600 underline">wedding at a Lake Travis vineyard</Link>? Hosting a <Link href="/austin-corporate-event-delivery" className="text-brand-yellow hover:text-yellow-600 underline">corporate retreat in the Hill Country</Link>? Throwing a <Link href="/austin-bachelor-party-delivery" className="text-brand-yellow hover:text-yellow-600 underline">bachelor party on Rainey Street</Link>? Our team coordinates directly with your venue to ensure flawless delivery timing, proper temperature control, and professional setup. We handle the logistics so you can focus on enjoying your event. Optional TABC-certified bartender staffing is available through our vetted partner network for full-service experiences.
              </p>

              <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
                Why Austin Events Choose Party On Delivery
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our success comes from understanding Austin&apos;s unique event landscape. We know the venues, from The Driskill Hotel downtown to ranch properties in Dripping Springs. We understand Texas regulations and maintain full TABC licensing with comprehensive insurance coverage. Most importantly, we treat every event—whether it&apos;s serving 20 guests or 500—with the same attention to detail and commitment to excellence.
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                Our 72-hour advance booking recommendation ensures we can source specialty items and coordinate complex logistics, though we always try to accommodate shorter timelines when possible. <Link href="/delivery-areas" className="text-brand-yellow hover:text-yellow-600 underline">Delivery zones</Link> include all of Austin, Lake Travis, Westlake Hills, Bee Cave, Lakeway, and surrounding Hill Country communities. View our <Link href="/faqs" className="text-brand-yellow hover:text-yellow-600 underline">frequently asked questions</Link> or <Link href="/contact" className="text-brand-yellow hover:text-yellow-600 underline">contact our team</Link> for personalized guidance.
              </p>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Mini-FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
                Quick Questions
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="space-y-8">
            {homepageFAQs.map((faq, index) => (
              <ScrollRevealCSS key={index} duration={800} delay={index * 80} y={20}>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800} y={30}>
            <div>
              <h2 className="font-heading font-light text-4xl md:text-5xl text-white mb-6 tracking-[0.1em]">
                Ready to stock your party?
              </h2>
              <p className="text-gray-300 text-lg mb-12 tracking-[0.05em]">
                2-minute order • Fast availability check • (737) 371-9700
              </p>
              <TrackedLink href="/order" section="footer_cta" buttonText="START ORDER">
                <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm">
                  START ORDER
                </button>
              </TrackedLink>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img
                src="/images/pod-logo-2025.svg"
                alt="Party On Delivery"
                className="h-16 w-auto mb-4"
                width="64"
                height="64"
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Austin&apos;s premier alcohol delivery and event service since 2023.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Weddings</Link></li>
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/austin-bachelor-party-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Celebrations</Link></li>
                <li><Link href="/austin-corporate-event-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corporate</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">COMPANY</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">About</Link></li>
                <li><Link href="/blog" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Blog</Link></li>
                <li><Link href="/delivery-areas" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Delivery Areas</Link></li>
                <li><Link href="/faqs" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">FAQs</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Hours: 10AM - 9PM (except Sundays)</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2025 Party On Delivery. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import Navigation from "@/components/Navigation";
import LuxuryCard from '@/components/LuxuryCard';
import { generateFAQSchema, generateServiceSchema } from '@/lib/seo/schemas';

export default function AustinAlcoholDeliveryPage() {
  // FAQ data for schema
  const faqs = [
    {
      question: 'What areas of Austin do you deliver to?',
      answer: 'We deliver throughout the greater Austin area, including Downtown, South Austin, East Austin, West Austin, Lake Travis, Round Rock, Cedar Park, and Pflugerville. Enter your address at checkout to confirm delivery availability.'
    },
    {
      question: 'Do you offer same-day delivery?',
      answer: 'Yes! We offer same-day delivery throughout Austin. You can also schedule deliveries in advance for upcoming events.'
    },
    {
      question: 'What is your delivery fee?',
      answer: 'Delivery fees vary by location and order size. Enter your delivery address at checkout for exact pricing.'
    },
    {
      question: 'Do I need to be present for delivery?',
      answer: 'Yes, someone 21 or older must be present to receive the delivery and show valid government-issued ID.'
    },
    {
      question: 'Can you deliver to event venues and hotels?',
      answer: 'Absolutely! We regularly deliver to wedding venues, corporate event spaces, hotels, and other locations throughout Austin.'
    },
    {
      question: 'Do you offer keg delivery?',
      answer: 'Yes! We deliver beer kegs in all sizes (1/2 barrel, 1/4 barrel, 1/6 barrel) with tap rental options available.'
    },
    {
      question: 'How do I schedule a delivery for a specific date/time?',
      answer: 'When placing your order online, you can select a preferred delivery date and time window. For precise timing coordination, call us directly at (737) 371-9700.'
    }
  ];

  const faqSchema = generateFAQSchema(faqs);
  const serviceSchema = generateServiceSchema();

  return (
    <>
      <Navigation />

      {/* Schema.org Structured Data */}
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="service-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 to-gray-900/50 z-10" />
          <Image
            src="/images/hero/lake-travis-yacht-sunset.webp"
            alt="Austin Alcohol Delivery Service"
            fill
            className="object-cover"
            priority
            quality={90}
          />

          <div className="relative z-20 text-center px-4 md:px-8 max-w-5xl mx-auto">
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl text-white mb-6 tracking-[0.08em] scroll-reveal">
              AUSTIN ALCOHOL DELIVERY
            </h1>
            <h2 className="font-heading text-2xl md:text-3xl text-brand-yellow mb-8 tracking-[0.1em] scroll-reveal">
              Weddings • Events • Parties
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed scroll-reveal">
              Austin&apos;s premier alcohol delivery service for weddings, corporate events, bachelorette parties, and special occasions.
              Beer kegs, wine, champagne, spirits, and party supplies delivered throughout the greater Austin area.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center scroll-reveal">
              <Link
                href="/order"
                className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium rounded"
              >
                SHOP NOW
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors tracking-[0.1em] text-sm font-medium rounded border border-white/30"
              >
                CONTACT US
              </Link>
            </div>
          </div>
        </section>

        {/* Introduction Section */}
        <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center scroll-reveal">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              Party On Delivery is Austin&apos;s premier alcohol delivery service, specializing in weddings, corporate events,
              bachelorette parties, and special occasions. We deliver beer kegs, wine, champagne, spirits, and party supplies
              throughout the greater Austin area with professional service and reliable timing.
            </p>
          </div>
        </section>

        {/* Delivery Areas Section */}
        <section className="py-16 md:py-24 px-4 md:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl text-center text-gray-900 mb-4 tracking-[0.08em] scroll-reveal">
              WE DELIVER THROUGHOUT AUSTIN
            </h2>
            <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto scroll-reveal">
              Same-day and scheduled delivery available to all Austin neighborhoods and surrounding areas
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: 'Downtown Austin',
                  description: 'Fast delivery to downtown apartments, condos, hotels, and event venues. Perfect for corporate events, weddings, and celebrations.',
                  icon: (
                    <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )
                },
                {
                  title: 'South Austin',
                  description: 'Serving South Lamar, South Congress, Zilker, Barton Hills, and surrounding neighborhoods. Ideal for backyard parties and events.',
                  icon: (
                    <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )
                },
                {
                  title: 'East Austin',
                  description: 'Delivery to East Austin neighborhoods, wedding venues, and event spaces. Supporting local celebrations and gatherings.',
                  icon: (
                    <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )
                },
                {
                  title: 'Lake Travis Area',
                  description: 'Delivering to lake houses, vacation rentals, boat docks, and lakeside venues. Perfect for weekend getaways, boat parties, and lakeside weddings.',
                  icon: (
                    <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  )
                },
                {
                  title: 'North Austin',
                  description: 'Serving Round Rock, Cedar Park, Pflugerville, and North Austin. Corporate events, weddings, and party delivery.',
                  icon: (
                    <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )
                },
                {
                  title: 'West Austin',
                  description: 'Delivery to West Austin, Westlake, and surrounding areas. Supporting upscale events and celebrations.',
                  icon: (
                    <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  )
                }
              ].map((area, index) => (
                <LuxuryCard key={index} index={index}>
                  <div className="p-6">
                    <div className="mb-4">{area.icon}</div>
                    <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.1em]">
                      {area.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {area.description}
                    </p>
                  </div>
                </LuxuryCard>
              ))}
            </div>
          </div>
        </section>

        {/* What We Deliver Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl text-center text-gray-900 mb-16 tracking-[0.08em] scroll-reveal">
              WHAT WE DELIVER
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: 'Beer Selection',
                  items: [
                    'Craft beer (200+ Texas and regional options)',
                    'Imported beer',
                    'Domestic favorites',
                    'Beer kegs (all sizes: 1/2 barrel, 1/4 barrel, 1/6 barrel)',
                    'Non-alcoholic options'
                  ]
                },
                {
                  title: 'Wine & Champagne',
                  items: [
                    'Red wine',
                    'White wine',
                    'Rosé',
                    'Sparkling wine & Champagne',
                    'Dessert wine'
                  ]
                },
                {
                  title: 'Spirits',
                  items: [
                    'Vodka',
                    'Whiskey & Bourbon',
                    'Tequila & Mezcal',
                    'Rum',
                    'Gin',
                    'Liqueurs & cordials'
                  ]
                },
                {
                  title: 'Party Essentials',
                  items: [
                    'Mixers & sodas',
                    'Ice',
                    'Party supplies',
                    'Glassware rental',
                    'Cocktail kits'
                  ]
                }
              ].map((category, index) => (
                <LuxuryCard key={index} index={index}>
                  <div className="p-6">
                    <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">
                      {category.title}
                    </h3>
                    <ul className="space-y-2">
                      {category.items.map((item, i) => (
                        <li key={i} className="text-gray-600 flex items-start">
                          <svg className="w-5 h-5 text-brand-yellow mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </LuxuryCard>
              ))}
            </div>
          </div>
        </section>

        {/* Event Types Section */}
        <section className="py-16 md:py-24 px-4 md:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl text-center text-gray-900 mb-4 tracking-[0.08em] scroll-reveal">
              PERFECT FOR YOUR AUSTIN EVENT
            </h2>
            <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto scroll-reveal">
              Professional alcohol delivery service for every occasion
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: 'Weddings & Receptions',
                  description: 'Make your Austin wedding unforgettable with our curated selection of beer kegs, wine, champagne, and spirits. We work with wedding planners and venues throughout Austin to ensure seamless delivery and setup.',
                  link: '/weddings',
                  linkText: 'Wedding Services'
                },
                {
                  title: 'Bachelorette Parties',
                  description: "Planning an Austin bachelorette weekend? We deliver everything you need for an epic celebration. From champagne and wine to party supplies and decorations, we've got you covered.",
                  link: '/bach-parties',
                  linkText: 'Bachelorette Packages'
                },
                {
                  title: 'Corporate Events',
                  description: 'Impress clients and employees with professional alcohol delivery for your corporate events. We offer invoice billing, bulk pricing, and reliable service for Austin businesses.',
                  link: '/austin-corporate-event-delivery',
                  linkText: 'Corporate Solutions'
                },
                {
                  title: 'Boat Parties on Lake Travis',
                  description: 'Delivering to boat docks and lakeside locations throughout the Lake Travis area. Perfect for weekend boat parties, summer celebrations, and lake house gatherings.',
                  link: '/boat-parties',
                  linkText: 'Lake Travis Delivery'
                }
              ].map((event, index) => (
                <LuxuryCard key={index} index={index}>
                  <div className="p-8">
                    <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {event.description}
                    </p>
                    <Link
                      href={event.link}
                      className="inline-flex items-center text-brand-yellow hover:text-yellow-600 font-medium tracking-[0.1em]"
                    >
                      {event.linkText}
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </LuxuryCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl text-center text-gray-900 mb-16 tracking-[0.08em] scroll-reveal">
              HOW IT WORKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  number: '1',
                  title: 'Browse Our Selection',
                  description: 'Explore our extensive catalog of beer, wine, spirits, and party supplies online.'
                },
                {
                  number: '2',
                  title: 'Place Your Order',
                  description: 'Order online, by phone, or by text. Schedule delivery or choose same-day service.'
                },
                {
                  number: '3',
                  title: 'We Deliver',
                  description: "Professional delivery to your location throughout Austin. We&apos;ll coordinate with your event timeline."
                }
              ].map((step, index) => (
                <div key={index} className="text-center scroll-reveal">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-yellow text-gray-900 font-heading text-2xl mb-6">
                    {step.number}
                  </div>
                  <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 px-4 md:px-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl text-center text-gray-900 mb-16 tracking-[0.08em] scroll-reveal">
              FREQUENTLY ASKED QUESTIONS
            </h2>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <LuxuryCard key={index} index={index}>
                  <div className="p-6">
                    <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </LuxuryCard>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-5xl text-gray-900 mb-6 tracking-[0.08em] scroll-reveal">
              READY TO ORDER FOR YOUR AUSTIN EVENT?
            </h2>
            <p className="text-lg text-gray-600 mb-10 scroll-reveal">
              Browse our selection and place your order today. Same-day and scheduled delivery available throughout Austin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center scroll-reveal">
              <Link
                href="/order"
                className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium rounded"
              >
                SHOP NOW
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors tracking-[0.1em] text-sm font-medium rounded"
              >
                CONTACT US
              </Link>
            </div>
          </div>
        </section>

        {/* SEO Footer Text */}
        <section className="py-12 px-4 md:px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <p className="text-sm text-gray-500 text-center italic leading-relaxed">
              Party On Delivery is Austin&apos;s premier alcohol delivery service, providing beer kegs, wine, champagne, spirits,
              and party supplies for weddings, corporate events, bachelorette parties, and special occasions throughout the
              greater Austin area including Downtown, South Austin, Lake Travis, and surrounding communities.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

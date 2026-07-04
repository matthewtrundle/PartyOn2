import { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { generateFAQSchema, generateServiceSchema } from '@/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Event Rentals Austin | Chairs, Tables, Coolers & Party Equipment',
  description: 'Rent event equipment in Austin. White folding chairs, cocktail tables, coolers, and party supplies delivered. Perfect for weddings, corporate events, and parties. Same-day delivery available.',
  keywords: 'event rentals austin, chair rentals austin, table rentals austin, party equipment rental, wedding rentals austin, event supplies austin',
  openGraph: {
    title: 'Event Rentals Austin | Party Equipment & Supplies',
    description: 'Complete event rental solutions in Austin. Chairs, tables, coolers, and party equipment delivered for weddings, corporate events, and celebrations.',
    url: 'https://partyondelivery.com/rentals',
    images: ['/images/hero/lake-travis-sunset.webp'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Event Rentals Austin | Party Equipment Delivery',
    description: 'Event rental equipment delivered throughout Austin. Same-day delivery available.',
    images: ['/images/hero/lake-travis-sunset.webp'],
  },
  alternates: {
    canonical: '/rentals',
  },
};

export default function RentalsHubPage() {
  const faqs = [
    {
      question: 'What areas of Austin do you deliver event rentals to?',
      answer: 'We deliver event rental equipment throughout the greater Austin area including Downtown, Lake Travis, South Austin, West Austin, Round Rock, Cedar Park, and all surrounding areas. Delivery fees vary by location.',
    },
    {
      question: 'How far in advance should I book event rentals?',
      answer: 'We recommend booking at least 72 hours in advance, especially for weekends and peak event season (April-October). For large events or weddings, booking 2-4 weeks ahead ensures availability.',
    },
    {
      question: 'Do you offer setup and pickup services?',
      answer: 'Yes! We offer setup service for an additional fee. Our team will arrange chairs, set up tables, and position equipment according to your specifications. Pickup is scheduled after your event.',
    },
    {
      question: 'Can I combine event rentals with alcohol delivery?',
      answer: 'Absolutely! Most Austin events order both rental equipment and beverages together. We coordinate delivery timing so everything arrives when you need it.',
    },
  ];

  const faqSchema = generateFAQSchema(faqs);
  const serviceSchema = generateServiceSchema();

  return (
    <>
      {/* FAQ Schema */}
      <Script
        id="rentals-hub-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Service Schema */}
      <Script
        id="rentals-hub-service-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <main className="bg-white">
        {/* Hero Section */}
        <section className="relative pt-32 md:pt-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white pb-24">
          <div className="max-w-6xl mx-auto px-8">
            <nav className="mb-8" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-gray-300">
                <li>
                  <Link href="/" className="hover:text-brand-yellow transition-colors">
                    Home
                  </Link>
                </li>
                <li>›</li>
                <li className="text-white">Rentals</li>
              </ol>
            </nav>

            <h1 className="font-heading text-5xl md:text-6xl mb-6 tracking-[0.08em]">
              EVENT RENTALS AUSTIN
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
              Complete event rental solutions delivered throughout Austin. Chairs, tables, coolers,
              and party equipment for weddings, corporate events, and celebrations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact">
                <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                  REQUEST QUOTE
                </button>
              </Link>
              <a href="tel:7373719700">
                <button className="px-8 py-4 border-2 border-brand-yellow text-white hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium">
                  CALL (737) 371-9700
                </button>
              </a>
            </div>
          </div>
        </section>

        {/* Rental Categories */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.08em]">
                RENTAL CATEGORIES
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Chair Rentals */}
              <Link href="/rentals/chair-rentals-austin">
                <div className="group cursor-pointer">
                  <div className="relative h-80 mb-6 overflow-hidden rounded-lg bg-gray-100">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent z-10" />
                    <div className="absolute bottom-6 left-6 z-20">
                      <h3 className="font-heading text-3xl text-white tracking-[0.1em]">
                        CHAIR RENTALS
                      </h3>
                    </div>
                    <div className="absolute inset-0 bg-brand-yellow/0 group-hover:bg-brand-yellow/10 transition-all duration-300" />
                  </div>
                  <p className="text-gray-600 mb-4">
                    White folding chairs perfect for weddings, corporate events, and outdoor parties.
                    Delivered and set up throughout Austin.
                  </p>
                  <div className="flex items-center text-brand-yellow font-medium">
                    <span className="tracking-[0.1em] text-sm">VIEW DETAILS</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Cocktail Table Rentals */}
              <Link href="/rentals/cocktail-table-rentals-austin">
                <div className="group cursor-pointer">
                  <div className="relative h-80 mb-6 overflow-hidden rounded-lg bg-gray-100">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent z-10" />
                    <div className="absolute bottom-6 left-6 z-20">
                      <h3 className="font-heading text-3xl text-white tracking-[0.1em]">
                        TABLE RENTALS
                      </h3>
                    </div>
                    <div className="absolute inset-0 bg-brand-yellow/0 group-hover:bg-brand-yellow/10 transition-all duration-300" />
                  </div>
                  <p className="text-gray-600 mb-4">
                    Cocktail tables, banquet tables, and specialty tables for Austin events.
                    Perfect for weddings, corporate mixers, and receptions.
                  </p>
                  <div className="flex items-center text-brand-yellow font-medium">
                    <span className="tracking-[0.1em] text-sm">VIEW DETAILS</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Cooler Rentals */}
              <Link href="/rentals/cooler-rentals-austin">
                <div className="group cursor-pointer">
                  <div className="relative h-80 mb-6 overflow-hidden rounded-lg bg-gray-100">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent z-10" />
                    <div className="absolute bottom-6 left-6 z-20">
                      <h3 className="font-heading text-3xl text-white tracking-[0.1em]">
                        COOLER RENTALS
                      </h3>
                    </div>
                    <div className="absolute inset-0 bg-brand-yellow/0 group-hover:bg-brand-yellow/10 transition-all duration-300" />
                  </div>
                  <p className="text-gray-600 mb-4">
                    Large coolers and ice tubs for Lake Travis boat parties, outdoor weddings,
                    and Austin summer events. Keep drinks ice cold.
                  </p>
                  <div className="flex items-center text-brand-yellow font-medium">
                    <span className="tracking-[0.1em] text-sm">VIEW DETAILS</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Why Choose Party On */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.08em]">
                WHY CHOOSE PARTY ON DELIVERY
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.05em]">
                    Professional Setup Available
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our team can arrange chairs, position tables, and set up equipment exactly how you need it.
                    No lifting, no hassle—just show up and enjoy your event.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.05em]">
                    Same-Day Delivery
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Need rental equipment fast? We offer same-day delivery throughout Austin based on availability.
                    Perfect for last-minute events and emergencies.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.05em]">
                    Clean & Well-Maintained
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    All rental equipment is professionally cleaned and inspected before delivery.
                    White chairs, sturdy tables, and reliable coolers—ready for your event.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.05em]">
                    Competitive Pricing
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Transparent pricing with no hidden fees. Bulk discounts available for large events.
                    Combine with alcohol delivery for package savings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center mb-12">
              <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.08em]">
                FREQUENTLY ASKED QUESTIONS
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl mb-6 tracking-[0.08em]">
              READY TO RENT EQUIPMENT?
            </h2>
            <p className="text-xl text-gray-300 mb-12">
              Get a quote in minutes • Same-day delivery available • (737) 371-9700
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <Link href="/contact">
                <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                  REQUEST QUOTE
                </button>
              </Link>
              <Link href="/order">
                <button className="px-10 py-4 border-2 border-brand-yellow text-white hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium">
                  BROWSE PRODUCTS
                </button>
              </Link>
            </div>
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
                  Austin&apos;s premier event rental and alcohol delivery service since 2023.
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
                  <li>Hours: 10AM - 9PM</li>
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
      </main>
    </>
  );
}

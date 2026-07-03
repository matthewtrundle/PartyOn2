'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function LuxuryGoyardPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Heritage Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero/austin-skyline-golden-hour.webp"
            alt="Austin Heritage"
            fill
            className="object-cover opacity-40"
            priority
          />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
          <div className="hero-fade-in">
            <p className="text-sm tracking-[0.1em] text-gray-700 mb-8">ESTABLISHED 2016</p>
            <h1 className="text-6xl md:text-8xl font-heading text-gray-900 mb-6">Classic Gin Martini Recipe</h1>
            <p className="text-xl text-gray-700 tracking-[0.1em] mb-12 max-w-2xl mx-auto">
              Austin&apos;s Premier Alcohol Delivery Service
            </p>
            <div className="flex justify-center space-x-8">
              <Link href="/heritage">
                <button className="text-sm tracking-[0.1em] text-gray-700 hover:text-gray-900 transition-colors">
                  OUR HERITAGE
                </button>
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/services">
                <button className="text-sm tracking-[0.1em] text-gray-700 hover:text-gray-900 transition-colors">
                  SERVICES
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FAFAF8] to-transparent" />
      </section>

      {/* The Story */}
      <section className="py-32">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-5xl font-heading text-gray-900 mb-8">The Craft of Excellence</h2>
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Since 2016, Party On has revolutionized alcohol delivery in Austin, 
                  bringing premium spirits and craft cocktails directly to your door 
                  with unmatched speed and sophistication.
                </p>
                <p>
                  Our curated selection includes rare whiskeys, vintage champagnes, 
                  craft cocktails, and complete party packages. Every delivery arrives 
                  within 2 hours, temperature-controlled and professionally presented.
                </p>
                <p>
                  From last-minute corporate gatherings to planned celebrations, 
                  we deliver across Austin 7 days a week, ensuring your bar is always 
                  stocked with the finest selections.
                </p>
              </div>
              <div className="mt-12">
                <Link href="/about">
                  <button className="text-sm tracking-[0.1em] border-b-2 border-gray-900 pb-2 hover:pb-3 transition-all">
                    DISCOVER OUR STORY
                  </button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative h-[600px] border-8 border-gray-200">
                <Image
                  src="/images/gallery/headquarters-entrance.webp"
                  alt="Heritage"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 border-4 border-gray-300" />
            </div>
          </div>
        </div>
      </section>

      {/* Service Excellence */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-heading text-gray-900 mb-6">Savoir-Faire</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Premium alcohol delivery perfected through years of serving Austin&apos;s most discerning clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-heading text-gray-700">I</span>
                </div>
              </div>
              <h3 className="text-2xl font-heading mb-4">Selection</h3>
              <p className="text-gray-600 leading-relaxed">
                Top-shelf spirits, rare finds, craft cocktails, and party essentials. 
                Expert recommendations available 24/7.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-heading text-gray-700">II</span>
                </div>
              </div>
              <h3 className="text-2xl font-heading mb-4">Delivery</h3>
              <p className="text-gray-600 leading-relaxed">
                2-hour delivery across Austin. Temperature-controlled vehicles, 
                professional presentation, and white-glove service.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-heading text-gray-700">III</span>
                </div>
              </div>
              <h3 className="text-2xl font-heading mb-4">Experience</h3>
              <p className="text-gray-600 leading-relaxed">
                Cocktail consultations, party planning, and custom orders. 
                Your personal sommelier and mixologist on demand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <div className="mb-12">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          <blockquote className="text-2xl font-heading text-gray-800 mb-8 leading-relaxed">
            Party On has transformed how we entertain. Their 2-hour delivery of 
            premium spirits and cocktail kits means we&apos;re always prepared for 
            clients and celebrations. Simply exceptional service.
          </blockquote>
          <cite className="text-gray-600">
            <span className="font-semibold">Michael Laurent</span>
            <span className="block text-sm mt-1">Chief Executive Officer, Laurent Enterprises</span>
          </cite>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-5xl font-heading mb-8">Begin Your Journey</h2>
          <p className="text-xl mb-12 text-gray-300 max-w-2xl mx-auto">
            Experience Austin&apos;s premier alcohol delivery service. Premium spirits, 
            craft cocktails, and party essentials delivered in 2 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/consultation">
              <button className="px-12 py-4 bg-white text-gray-900 hover:bg-gray-100 transition-colors tracking-[0.1em]">
                PRIVATE CONSULTATION
              </button>
            </Link>
            <Link href="/membership">
              <button className="px-12 py-4 border border-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.1em]">
                EXCLUSIVE MEMBERSHIP
              </button>
            </Link>
            <Link href="/order-now">
              <button className="px-12 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em]">
                ORDER NOW
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Refined Footer */}
      <footer className="py-16 bg-[#FAFAF8] border-t">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-heading mb-4">PARTY ON</h3>
              <p className="text-gray-600 max-w-sm">
                Austin&apos;s premier alcohol delivery service. Premium spirits, 
                cocktail kits, and party packages delivered in 2 hours.
              </p>
            </div>
            <div>
              <h4 className="font-heading text-lg mb-4">Services</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/austin-corporate-event-delivery" className="hover:text-gray-900 transition-colors">Corporate Delivery</Link></li>
                <li><Link href="/cocktails" className="hover:text-gray-900 transition-colors">Cocktail Kits</Link></li>
                <li><Link href="/packages" className="hover:text-gray-900 transition-colors">Party Packages</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-lg mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Austin, Texas</li>
                <li><a href="tel:5125550100" className="hover:text-gray-900 transition-colors">(512) 555-0100</a></li>
                <li><Link href="/appointments" className="hover:text-gray-900 transition-colors">Book Appointment</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
            <p>&copy; 2024 Party On. A tradition of excellence since 2016.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
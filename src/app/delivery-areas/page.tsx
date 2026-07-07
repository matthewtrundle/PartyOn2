'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

export default function DeliveryAreasPage() {
  // Track page view on mount
  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_DELIVERY_AREAS, '/delivery-areas', 'Delivery Areas');
  }, []);
  const [activeArea, setActiveArea] = useState('downtown');

  const areas = {
    downtown: {
      name: 'Downtown & Central',
      neighborhoods: [
        { name: 'Rainey Street', description: 'Historic district with trendy bars and restaurants' },
        { name: '6th Street', description: 'Austin\'s famous entertainment district' },
        { name: 'South Congress', description: 'Eclectic shops and dining south of Lady Bird Lake' },
        { name: 'Downtown Core', description: 'Business district and luxury hotels' },
        { name: 'Warehouse District', description: 'Nightlife hub with upscale clubs' },
        { name: 'Red River', description: 'Live music venues and cultural district' }
      ]
    },
    central: {
      name: 'Central Austin',
      neighborhoods: [
        { name: 'Hyde Park', description: 'Historic neighborhood with charming homes' },
        { name: 'Clarksville', description: 'Tree-lined streets and local favorites' },
        { name: 'Tarrytown', description: 'Upscale residential with scenic views' },
        { name: 'Rosedale', description: 'Family-friendly with parks and cafes' },
        { name: 'Allandale', description: 'Established neighborhood with local gems' },
        { name: 'North Loop', description: 'Vintage shops and neighborhood bars' }
      ]
    },
    east: {
      name: 'East Austin',
      neighborhoods: [
        { name: 'East 6th', description: 'Food trucks and dive bars' },
        { name: 'Holly', description: 'Artist community with galleries' },
        { name: 'Mueller', description: 'Modern development with parks' },
        { name: 'East Cesar Chavez', description: 'Trendy restaurants and breweries' },
        { name: 'Cherrywood', description: 'Quirky neighborhood with local coffee' },
        { name: 'East 11th', description: 'Historic cultural district' }
      ]
    },
    domain: {
      name: 'North Austin',
      neighborhoods: [
        { name: 'The Domain', description: 'Upscale shopping and dining destination' },
        { name: 'Arboretum', description: 'Shopping center with fine dining' },
        { name: 'Great Hills', description: 'Professional district with hotels' },
        { name: 'Northwest Hills', description: 'Established residential area' },
        { name: 'Research Boulevard', description: 'Tech corridor with corporate venues' },
        { name: 'Anderson Mill', description: 'Family communities with event spaces' }
      ]
    },
    lake: {
      name: 'Lake Travis & Hills',
      neighborhoods: [
        { name: 'Lake Travis', description: 'Waterfront venues and marinas' },
        { name: 'Westlake Hills', description: 'Luxury homes and country clubs' },
        { name: 'Bee Cave', description: 'Hill Country shopping and dining' },
        { name: 'Lakeway', description: 'Resort community on the lake' },
        { name: 'Dripping Springs', description: 'Wedding capital of Texas' },
        { name: 'Spicewood', description: 'Vineyards and ranch venues' }
      ]
    },
    south: {
      name: 'South Austin',
      neighborhoods: [
        { name: 'Zilker', description: 'Park adjacent with local favorites' },
        { name: 'Travis Heights', description: 'Historic homes near downtown' },
        { name: 'Barton Hills', description: 'Greenbelt access and nature' },
        { name: 'South Lamar', description: 'Trendy corridor with restaurants' },
        { name: 'Sunset Valley', description: 'Business district with event spaces' },
        { name: 'Circle C', description: 'Master-planned community venues' }
      ]
    }
  };

  return (
    <div className="bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] mt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/hero/austin-skyline-golden-hour.webp"
          alt="Austin Aerial View"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />

        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            DELIVERY AREAS
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto" />
        </div>
      </section>

      {/* Introduction */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800}>
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
              Serving Greater Austin
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              From the vibrant streets of downtown to the serene shores of Lake Travis,
              we deliver premium spirits and exceptional service throughout the Austin
              metropolitan area. Our extensive coverage ensures that wherever your
              celebration takes place, Party On is there to serve you.
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Area Selector */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} className="text-center mb-16">
            <h2 className="font-heading font-light text-3xl text-gray-900 mb-4 tracking-[0.1em]">
              Select Your Area
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          {/* Area Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {Object.entries(areas).map(([key, area]) => (
              <button
                key={key}
                onClick={() => setActiveArea(key)}
                className={`px-6 py-3 tracking-[0.1em] text-sm transition-all duration-300 ${
                  activeArea === key
                    ? 'bg-brand-yellow text-gray-900'
                    : 'border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900'
                }`}
              >
                {area.name.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Neighborhoods Grid */}
          <div
            key={activeArea}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{
              animation: 'result-fade-in 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards'
            }}
          >
            {areas[activeArea as keyof typeof areas].neighborhoods.map((neighborhood, index) => (
              <div
                key={neighborhood.name}
                className="bg-gray-50 p-6"
                style={{
                  animation: `result-fade-in 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
                  animationDelay: `${index * 50}ms`,
                  opacity: 0
                }}
              >
                <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">
                  {neighborhood.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {neighborhood.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Details */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} className="text-center mb-16">
            <h2 className="font-heading font-light text-3xl text-gray-900 mb-4 tracking-[0.1em]">
              Delivery Information
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <ScrollRevealCSS duration={800} className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                72-Hour Notice
              </h3>
              <p className="text-gray-600">
                All orders require 72-hour advance booking to ensure availability and proper preparation
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={100} className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Professional Delivery
              </h3>
              <p className="text-gray-600">
                Our trained team arrives on time with everything needed for your event&apos;s success
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={200} className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Licensed & Insured
              </h3>
              <p className="text-gray-600">
                TABC certified with comprehensive insurance for your peace of mind
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Special Services */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} className="text-center mb-16">
            <h2 className="font-heading font-light text-3xl text-gray-900 mb-4 tracking-[0.1em]">
              Venue Partnerships
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-8" />
            <p className="text-gray-600 max-w-2xl mx-auto">
              We maintain partnerships with Austin&apos;s premier venues to ensure seamless service
              at your chosen location
            </p>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              'Hotels & Resorts',
              'Country Clubs',
              'Event Venues',
              'Private Estates',
              'Yacht Clubs',
              'Ranch Properties',
              'Rooftop Spaces',
              'Historic Sites'
            ].map((venue, index) => (
              <ScrollRevealCSS
                key={venue}
                duration={500}
                delay={index * 50}
                className="bg-white p-4 text-center border border-gray-200"
              >
                <p className="text-gray-700 font-light tracking-[0.1em]">
                  {venue}
                </p>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800}>
            <h2 className="font-heading font-light text-4xl md:text-5xl text-white mb-6 tracking-[0.1em]">
              Ready to Celebrate?
            </h2>
            <p className="text-gray-300 text-lg mb-12 tracking-[0.05em]">
              Check if we deliver to your location
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <Link href="/contact">
                <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm">
                  CHECK AVAILABILITY
                </button>
              </Link>
              <a href="tel:7373719700">
                <button className="px-10 py-4 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm">
                  CALL FOR DETAILS
                </button>
              </a>
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
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Delivering excellence across greater Austin since 2020.
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
                <li>Hours: 10AM - 9PM Mon-Sat (closed Sundays)</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2024 Party On Delivery. All rights reserved.</p>
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
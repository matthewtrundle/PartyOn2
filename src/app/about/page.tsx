'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

export default function AboutPage() {
  // Track page view on mount
  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_ABOUT, '/about', 'About Party On Delivery');
  }, []);
  const values = [
    {
      title: "Excellence",
      description: "Every delivery, every event, every interaction reflects our commitment to exceptional service"
    },
    {
      title: "Integrity",
      description: "Licensed, insured, and transparent in all our business practices"
    },
    {
      title: "Community",
      description: "Proudly serving Austin with deep local knowledge and genuine care"
    },
    {
      title: "Innovation",
      description: "Continuously elevating the standard for premium alcohol delivery"
    }
  ];

  const milestones = [
    { year: "2020", event: "Founded during challenging times with a vision to serve Austin" },
    { year: "2021", event: "Expanded to Lake Travis and Hill Country markets" },
    { year: "2022", event: "Launched premium wedding and corporate services" },
    { year: "2023", event: "Celebrated 1,000+ successful events delivered" },
    { year: "2024", event: "Recognized as Austin's premier alcohol delivery service" }
  ];

  return (
    <div className="bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] mt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/hero/austin-skyline-golden-hour.webp"
          alt="Austin Skyline"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/30 to-gray-900/50" />
        
        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            OUR STORY
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto" />
        </div>
      </section>

      {/* Introduction */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-8 tracking-[0.1em]">
              Elevating Austin Since 2020
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Party On Delivery was born from a simple vision: to bring premium spirits and
              exceptional service directly to Austin&apos;s most memorable moments. What started
              as a response to changing times has evolved into the city&apos;s most trusted
              name in luxury alcohol delivery and event services.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              From intimate gatherings in Westlake Hills to grand celebrations on Lake Travis,
              we&apos;ve had the privilege of serving thousands of satisfied customers across
              the greater Austin area. Our commitment to excellence, safety, and unforgettable
              experiences drives everything we do.
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <ScrollRevealCSS
              duration={800}
              y={20}
              className="text-center lg:text-left"
            >
              <h3 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed">
                To deliver more than premium spirits—to deliver peace of mind, exceptional
                moments, and the confidence that comes from working with Austin&apos;s most
                professional alcohol delivery service. We handle the details so you can
                focus on what matters most: celebrating life&apos;s special moments.
              </p>
            </ScrollRevealCSS>
            <ScrollRevealCSS
              duration={800}
              y={20}
              delay={100}
              className="text-center lg:text-left"
            >
              <h3 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                Our Vision
              </h3>
              <p className="text-gray-600 leading-relaxed">
                To set the gold standard for premium alcohol delivery and event services
                across Texas. We envision a future where every celebration, from backyard
                gatherings to black-tie galas, is elevated by our commitment to excellence,
                innovation, and genuine Austin hospitality.
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Our Team
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Austin&apos;s elite bartending professionals, committed to exceptional service
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS
            duration={1000}
            y={20}
            className="relative h-[500px] rounded-lg overflow-hidden mb-12"
          >
            <Image
              src="/images/about/professional-bartender-team.webp"
              alt="Party On Delivery Professional Team"
              fill
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover"
              onError={(e) => {
                // Fallback to hero image if team image doesn't exist yet
                e.currentTarget.src = '/images/hero/austin-skyline-golden-hour.webp';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h3 className="font-heading text-3xl mb-4 tracking-[0.1em]">Excellence in Every Pour</h3>
              <p className="text-lg max-w-2xl">
                Our team of licensed professionals brings years of experience from Austin&apos;s 
                finest establishments, ensuring your event receives five-star service.
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollRevealCSS
              duration={800}
              y={20}
              className="text-center"
            >
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">TABC Certified</h4>
              <p className="text-gray-600">Every team member is fully licensed and certified</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS
              duration={800}
              y={20}
              delay={100}
              className="text-center"
            >
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">10+ Years Experience</h4>
              <p className="text-gray-600">Seasoned professionals from luxury hospitality</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS
              duration={800}
              y={20}
              delay={200}
              className="text-center"
            >
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h5.015c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h5.014a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h4 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">500+ Events</h4>
              <p className="text-gray-600">Trusted by Austin&apos;s most discerning hosts</p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Operations Excellence */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Behind the Scenes
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              State-of-the-art facilities ensuring quality from warehouse to doorstep
            </p>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollRevealCSS
              duration={800}
              y={20}
            >
              <h3 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                Premium Storage Facility
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Our temperature-controlled warehouse maintains optimal conditions for every bottle
                in our collection. From rare whiskeys to delicate champagnes, each product is
                stored with meticulous care.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-brand-yellow mr-3">•</span>
                  <span className="text-gray-700">24/7 climate monitoring</span>
                </li>
                <li className="flex items-start">
                  <span className="text-brand-yellow mr-3">•</span>
                  <span className="text-gray-700">Professional inventory management</span>
                </li>
                <li className="flex items-start">
                  <span className="text-brand-yellow mr-3">•</span>
                  <span className="text-gray-700">Quality assurance protocols</span>
                </li>
              </ul>
            </ScrollRevealCSS>

            <ScrollRevealCSS
              duration={800}
              y={20}
              delay={100}
              className="relative h-96 rounded-lg overflow-hidden"
            >
              <Image
                src="/images/about/premium-warehouse-facility.webp"
                alt="Premium Storage Facility"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                onError={(e) => {
                  // Fallback image
                  e.currentTarget.src = '/images/products/premium-spirits-wall.webp';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 to-transparent" />
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Our Values
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <ScrollRevealCSS
                key={value.title}
                duration={800}
                y={20}
                delay={index * 100}
                className="text-center"
              >
                <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Our Journey
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <ScrollRevealCSS
                key={milestone.year}
                duration={800}
                y={20}
                className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className="w-1/3 text-right pr-8">
                  {index % 2 === 0 && (
                    <p className="text-gray-600">{milestone.event}</p>
                  )}
                </div>
                <div className="w-1/3 flex justify-center">
                  <div className="w-24 h-24 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center">
                    <span className="font-heading text-xl">{milestone.year}</span>
                  </div>
                </div>
                <div className="w-1/3 text-left pl-8">
                  {index % 2 !== 0 && (
                    <p className="text-gray-600">{milestone.event}</p>
                  )}
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              The Team Behind the Service
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-8" />
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Our success is built on the dedication of our exceptional team—from our
              professional bartenders to our logistics specialists, each member is
              committed to delivering excellence with every order.
            </p>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <ScrollRevealCSS
              duration={800}
              y={20}
              className="text-center"
            >
              <div className="mb-4">
                <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">
                Expert Bartenders
              </h3>
              <p className="text-gray-600 text-sm">
                TABC certified professionals with years of experience in luxury events
              </p>
            </ScrollRevealCSS>
            <ScrollRevealCSS
              duration={800}
              y={20}
              delay={100}
              className="text-center"
            >
              <div className="mb-4">
                <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">
                Delivery Specialists
              </h3>
              <p className="text-gray-600 text-sm">
                Punctual, professional, and knowledgeable about every Austin neighborhood
              </p>
            </ScrollRevealCSS>
            <ScrollRevealCSS
              duration={800}
              y={20}
              delay={200}
              className="text-center"
            >
              <div className="mb-4">
                <svg className="w-14 h-14 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">
                Event Coordinators
              </h3>
              <p className="text-gray-600 text-sm">
                Detail-oriented professionals ensuring flawless execution of every event
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS
            duration={800}
            y={20}
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-8 tracking-[0.1em]">
              Proudly Austin
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              We&apos;re more than a delivery service—we&apos;re part of the Austin community.
              From supporting local events to partnering with area venues, we&apos;re committed
              to giving back to the city that has given us so much.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-700">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-brand-yellow mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1000+ Deliveries, 5.0★
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-brand-yellow mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1,000+ Events Delivered
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-brand-yellow mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                72-Hour Guarantee
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS
            duration={800}
            y={20}
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-white mb-6 tracking-[0.1em]">
              Experience the Difference
            </h2>
            <p className="text-gray-300 text-lg mb-12 tracking-[0.05em]">
              Join thousands of satisfied customers who trust Party On for their celebrations
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <Link href="/order">
                <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm">
                  START YOUR ORDER
                </button>
              </Link>
              <Link href="/contact">
                <button className="px-10 py-4 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm">
                  GET IN TOUCH
                </button>
              </Link>
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
                Austin&apos;s premier alcohol delivery and event service since 2020.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Weddings</Link></li>
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/austin-bachelor-party-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Celebrations</Link></li>
                <li><Link href="/corporate" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corporate</Link></li>
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
                <li>Hours: 10AM - 9PM (except Sundays)</li>
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
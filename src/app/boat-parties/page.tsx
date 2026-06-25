'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion'; // Kept for carousel and sticky bar
import Navigation from "@/components/Navigation";
import LuxuryCard from '@/components/LuxuryCard';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import BoatPartiesSchemas from '@/components/seo/BoatPartiesSchemas';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import { useHeroExperiment } from '@/hooks/useHeroExperiment';
import { trackExperimentClick } from '@/hooks/useExperimentVariant';

export default function BoatPartiesPage() {
  const hero = useHeroExperiment('/boat-parties');
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track page view on mount
  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_BOAT_PARTIES, '/boat-parties', 'Boat Party Delivery Service');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('section');
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        setIsScrolled(window.scrollY > heroBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const heroImages = [
    {
      src: '/images/boat-heroes/boat-party-epic-sunset.webp',
      alt: 'Epic Lake Travis sunset party',
      fallback: '/images/services/boat-parties/luxury-yacht-deck.webp'
    },
    {
      src: '/images/boat-heroes/boat-party-epic-cove.webp',
      alt: 'Devils Cove party scene',
      fallback: '/images/services/boat-parties/multiple-yachts-party.webp'
    },
    {
      src: '/images/boat-heroes/boat-party-epic-night.webp',
      alt: 'Night yacht party on Lake Travis',
      fallback: '/images/gallery/sunset-champagne-pontoon.webp'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const packages = [
    {
      name: "Sunset Cruise",
      price: "From $399",
      description: "Intimate sunset experience on Lake Travis",
      features: [
        "Premium cooler selection",
        "Ice & mixers included",
        "Dock delivery service",
        "Up to 12 guests",
        "Perfect for small vessels",
        "Curated wine & beer selection"
      ],
      featured: false
    },
    {
      name: "Lake Life Luxury",
      price: "From $899",
      description: "Our signature package for unforgettable lake days",
      features: [
        "Multiple premium coolers",
        "Full bar setup on deck",
        "Water or dock delivery",
        "Up to 25 guests",
        "Professional setup crew",
        "Premium spirits & champagne",
        "Floating bar accessories"
      ],
      featured: true
    },
    {
      name: "Regatta Ready",
      price: "From $1,599",
      description: "Ultimate luxury for yacht parties and regattas",
      features: [
        "Complete yacht bar service",
        "Professional bartender",
        "Ultra-premium selections",
        "Up to 50 guests",
        "Custom cocktail menu",
        "Gold-standard service",
        "Captain coordination",
        "All-day provisions"
      ],
      featured: false
    }
  ];

  return (
    <div className="bg-white">
      {/* SEO Schemas - Server-rendered for crawlers */}
      <BoatPartiesSchemas />

      <Navigation />
      
      {/* Hero Section with Image Slider */}
      <section className="relative h-[90vh] pt-32 pb-32 md:pt-24 md:pb-24 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentHeroImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Image
              src={heroImages[currentHeroImage].src}
              alt={heroImages[currentHeroImage].alt}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              onError={(e) => {
                e.currentTarget.src = heroImages[currentHeroImage].fallback;
              }}
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/30 to-gray-900/50" />
        
        {/* Slider Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHeroImage(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentHeroImage 
                  ? 'bg-brand-yellow w-8' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8 mt-[120px] mb-[80px] md:mt-0 md:mb-0">
          <h1 className="sr-only">Lake Travis Boat Party Alcohol Delivery</h1>
          <h2 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            {hero.content?.headline ?? (
              <span>
                Cold Drinks to Your
                <span className="block text-brand-yellow mt-2">BOAT—ON TIME</span>
              </span>
            )}
          </h2>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg md:text-xl font-light tracking-[0.1em] text-gray-200 mb-8">
            {hero.content?.subhead ?? 'Dock and boat delivery with captain coordination—everything cold, stocked, and ready to pour.'}
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/order">
              <button
                onClick={() => {
                  const label = hero.content?.ctaText ?? 'ORDER NOW';
                  trackCTAClick(label, '/order', 'hero', hero.experimentId ?? undefined, hero.variantId ?? undefined);
                  if (hero.experimentId && hero.variantId) trackExperimentClick(hero.experimentId, hero.variantId, label);
                }}
                className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium"
              >
                {hero.content?.ctaText ?? 'ORDER NOW'}
              </button>
            </Link>
            <Link href="/contact">
              <button
                onClick={() => trackCTAClick('SCHEDULE 15-MIN PLANNING CALL', '/contact', 'hero')}
                className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium"
              >
                SCHEDULE 15-MIN PLANNING CALL
              </button>
            </Link>
          </div>
          <p className="text-sm text-gray-300 mt-4 tracking-[0.05em]">
            TABC-certified • Marine-safety trained • Insured & licensed
          </p>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
              Choose Your Path
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Delivery-Only Path */}
            <ScrollRevealCSS duration={800} y={20} className="bg-white p-8 rounded-lg shadow-lg relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-brand-yellow text-gray-900 px-4 py-1 rounded-full text-xs font-medium tracking-[0.1em]">
                  MOST POPULAR
                </span>
              </div>
              <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em] text-center">
                Delivery-Only
              </h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Dock or boat handoff with ice, coolers, and mixers
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  You handle setup or bring your own crew
                </li>
              </ul>
              <Link href="/order">
                <button
                  onClick={() => trackCTAClick('ORDER NOW', '/order', 'packages')}
                  className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium"
                >
                  ORDER NOW
                </button>
              </Link>
            </ScrollRevealCSS>

            {/* Full-Service Path */}
            <ScrollRevealCSS duration={800} y={20} delay={100} className="bg-white p-8 rounded-lg shadow-lg border-2 border-brand-yellow">
              <div className="text-center mb-4">
                <span className="text-brand-yellow text-sm tracking-[0.08em] font-medium">MOST POPULAR</span>
              </div>
              <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em] text-center">
                Full-Service
              </h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Setup crew with optional TABC-certified bartender
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Perfect for yacht charters and premium events
                </li>
              </ul>
              <Link href="/contact">
                <button
                  onClick={() => trackCTAClick('SCHEDULE A CONSULTATION', '/contact', 'packages')}
                  className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium"
                >
                  SCHEDULE A CONSULTATION
                </button>
              </Link>
            </ScrollRevealCSS>
          </div>

          <ScrollRevealCSS duration={800} y={20} delay={200} className="text-center mt-8">
            <p className="text-gray-600 tracking-[0.05em]">
              Lake Travis and Austin experts since 2009
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Boat Parties on Easy Mode
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18m0-18a9 9 0 010 18M3 12h18" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Just Show Up
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Dock or Direct-to-Boat Delivery
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Cold from First Pour
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Marine-grade coolers and boat-safe ice options
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Local Lake Pros
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Know marinas, boats, and optimal timing
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={400} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Staffed When Needed
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                TABC partners for premium yacht experiences
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Where We Deliver */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Lake Travis & Austin Delivery Locations
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "The Oasis",
                instructions: "Meet at fuel dock • Preferred window: :15–:45 past the hour",
              },
              {
                name: "Devil's Boat",
                instructions: "Text on approach • Safe handoff in designated area",
              },
              {
                name: "Volente Beach",
                instructions: "Marina office coordination • Family-friendly protocols",
              },
              {
                name: "Hudson Bend",
                instructions: "Quiet boat service • Text GPS coordinates",
              },
              {
                name: "Lakeway Marina",
                instructions: "Full-service dock • Setup assistance available",
              },
              {
                name: "Point Venture",
                instructions: "Exclusive access • Discreet luxury service",
              }
            ].map((location, index) => (
              <ScrollRevealCSS
                key={location.name}
                duration={800}
                y={20}
                delay={index * 100}
                className="bg-white p-6 rounded-lg shadow-lg border border-gray-200"
              >
                <h3 className="font-heading text-lg text-gray-900 mb-2 tracking-[0.1em]">
                  {location.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {location.instructions}
                </p>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Boat Party Packages (Full-Service & Premium)
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Curated selections for every type of lake adventure
            </p>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.map((pkg, index) => (
              <LuxuryCard
                key={pkg.name}
                featured={pkg.featured}
                backgroundImage={
                  index === 0 ? '/images/gallery/sunset-champagne-pontoon.webp' :
                  index === 1 ? '/images/services/boat-parties/luxury-yacht-deck.webp' :
                  '/images/services/boat-parties/multiple-yachts-party.webp'
                }
                index={index}
                className="rounded-lg"
              >
                <div className="p-8">
                  {pkg.featured && (
                    <div className="text-center mb-4">
                      <span className="text-brand-yellow text-sm tracking-[0.08em]">MOST POPULAR</span>
                    </div>
                  )}
                  <h3 className="font-heading text-2xl text-gray-900 mb-2 tracking-[0.1em] text-center">
                    {pkg.name}
                  </h3>
                  <p className="text-4xl text-brand-yellow font-semibold text-center mb-4">
                    {pkg.price}
                  </p>
                  <p className="text-gray-600 text-center mb-8">
                    {pkg.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact">
                    <button
                      onClick={() => trackCTAClick('PLAN THIS PACKAGE (CONSULTATION)', '/contact', 'services')}
                      className={`w-full py-3 tracking-[0.08em] text-sm transition-all duration-300 ${
                      pkg.featured
                        ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                        : 'border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900'
                    }`}>
                      PLAN THIS PACKAGE (CONSULTATION)
                    </button>
                  </Link>
                </div>
              </LuxuryCard>
            ))}
          </div>

          {/* Delivery-Only Callout */}
          <ScrollRevealCSS duration={800} y={20} delay={300} className="mt-16 bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-center max-w-4xl mx-auto">
            <p className="text-lg text-gray-700 mb-6 tracking-[0.05em]">
              <strong>Just need delivery?</strong> Build your boat-day cart in minutes.
            </p>
            <Link href="/order">
              <button
                onClick={() => trackCTAClick('ORDER DELIVERY-ONLY', '/order', 'final_cta')}
                className="px-8 py-3 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium"
              >
                ORDER DELIVERY-ONLY
              </button>
            </Link>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center">
            <h2 className="font-heading font-light text-3xl text-gray-900 mb-6 tracking-[0.1em]">
              Safety First on the Water
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              We promote responsible enjoyment on Lake Travis. All deliveries include 
              complimentary water bottles and our team is trained in marine safety protocols. 
              We work with certified captains and encourage designated drivers for all vessels.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-700">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-brand-yellow mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                TABC Certified
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-brand-yellow mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Marine Safety Trained
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-brand-yellow mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Insured & Licensed
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Frequently Asked Questions
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="space-y-8">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Dock vs. boat delivery?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Both—we do slip handoffs or boat delivery to your anchored location.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                How far ahead to book?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                72 hours recommended; peak lake weekends fill fast.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Can you provide a bartender?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes for premium/yacht events via TABC-certified partners.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={400} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Glassware on the lake?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Boat-safe options available; disposables recommended for safety.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={500} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Only need ice & cans?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Use <strong>Order Now</strong> → Lake Day Essentials for quick delivery.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={600} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Are you insured/licensed?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, fully insured and licensed for marine delivery.
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center">
            <p className="text-2xl text-gray-700 italic mb-8 leading-relaxed">
              &ldquo;Party On transformed our corporate yacht party into an incredible experience.
              The dock delivery was seamless, the bar setup was stunning, and our clients
              were thoroughly impressed. Lake Travis has never been better!&rdquo;
            </p>
            <p className="text-gray-900 font-light tracking-[0.1em]">
              James Richardson
            </p>
            <p className="text-brand-yellow text-sm tracking-[0.1em]">
              CEO, Austin Tech Ventures
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800} y={20}>
            <h2 className="font-heading font-light text-4xl md:text-5xl text-white mb-6 tracking-[0.1em]">
              Set Sail in Style
            </h2>
            <p className="text-gray-300 text-lg mb-12 tracking-[0.05em]">
              Book your Lake Travis delivery 72 hours in advance
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <Link href="/order">
                <button
                  onClick={() => trackCTAClick('BOOK LAKE DELIVERY', '/order', 'final_cta')}
                  className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm"
                >
                  BOOK LAKE DELIVERY
                </button>
              </Link>
              <a href="tel:7373719700">
                <button className="px-10 py-4 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm">
                  CALL CAPTAIN&apos;S LINE
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
                Lake Travis&apos;s premier boat party service since 2020.
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
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">LAKE TRAVIS</h4>
              <ul className="space-y-2">
                <li><Link href="/delivery-areas#lake-travis" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Marinas</Link></li>
                <li><Link href="/faqs" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">FAQs</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Contact Us</Link></li>
                <li><Link href="/delivery-areas" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Delivery Areas</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Marina Hours: 8am - 8pm</li>
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

      {/* Sticky Bottom Bar - Mobile Only */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50 md:hidden"
          >
            <div className="flex gap-3">
              <Link href="/order" className="flex-1">
                <button className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors text-sm tracking-[0.1em]">
                  ORDER NOW
                </button>
              </Link>
              <a href="tel:7373719700" className="flex-1">
                <button className="w-full py-3 border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all text-sm tracking-[0.1em]">
                  CALL
                </button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
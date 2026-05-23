'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion'; // Kept for carousel and sticky bar
import Navigation from "@/components/Navigation";
import LuxuryCard from '@/components/LuxuryCard';
import WeddingDrinkCalculator from '@/components/WeddingDrinkCalculator';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import WeddingsSchemas from '@/components/seo/WeddingsSchemas';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

// Testimonial Carousel Component
function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const testimonials = [
    {
      name: "Nick Gorman",
      review: "Party on Delivery did an amazing job! They saved us from the stress of delivering our alcohol to our wedding and provided a clear list on what was being delivered based off what we chose. Everything arrived on time and it was quick and easy. I would highly recommend them!",
      date: "4 months ago",
      rating: 5
    },
    {
      name: "Paul Puchta",
      review: "We used Party on Delivery for our wedding reception and they were perfect from start to finish. Their pricing was fair, transparent, and easy to follow. On the day of our event, they arrived on time and helped prep the keg buckets and ice, taps, etc. They were very professional throughout the whole process, and I would recommend them to anyone looking for alcohol delivery services. Thank you again!",
      date: "10 months ago",
      rating: 5
    },
    {
      name: "Tatianna Ramon",
      review: "I met Allan at an Open House at Ranch Austin and his team has been very communicative and helpful while placing an alcohol order for my wedding clients. They were flexible and made the process easy! They delivered to the venue and even offered to chill some of the wine and beer for us. I'd recommend them to anyone and will definitely be using their services again!",
      date: "11 months ago",
      rating: 5,
      badge: "Local Guide"
    },
    {
      name: "Michelle Guillot",
      review: "We used party on delivery for our wedding reception and everything was a breeze from the ordering process, to the delivery, to the pick up!!! We dealt with one of the owners, Brian, who was fun, courteous, prompt and made sure all the details were worked out and that we were taken care of from start to finish. It was nice not to have to worry about running around town in Austin traffic to get all the booze we needed and just to have it show up on time without lifting a finger!!! I highly recommend them for all your party needs!!!!! Just do it and save yourself the hassle!",
      date: "1 year ago",
      rating: 5
    },
    {
      name: "James Burt",
      review: "Party On Delivery is an awesome concept with top-notch customer service. We've been working with them for a matter of months now, and the fact they make everything so seamless makes everybody's life a breeze when it comes to party planning, which we know can be very stressful with all the moving parts. I highly recommend Party On Delivery for anybody who wants to take the stress out of the alcohol ordering. Keep up the good work, Allan and Brian!",
      date: "10 months ago",
      rating: 5,
      badge: "Local Guide"
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      nextSlide();
    }
    if (touchStart - touchEnd < -75) {
      prevSlide();
    }
  };

  return (
    <div className="relative">
      <div
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-8 md:p-12 rounded-lg shadow-lg"
          >
            {/* Star Rating */}
            <div className="flex justify-center mb-6">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Review Text */}
            <p className="text-xl md:text-2xl text-gray-700 italic mb-8 leading-relaxed text-center">
              &ldquo;{testimonials[currentIndex].review}&rdquo;
            </p>

            {/* Reviewer Info */}
            <div className="text-center">
              <p className="text-gray-900 font-medium tracking-[0.1em] mb-1">
                {testimonials[currentIndex].name}
                {testimonials[currentIndex].badge && (
                  <span className="ml-2 text-xs text-brand-yellow font-normal">• {testimonials[currentIndex].badge}</span>
                )}
              </p>
              <p className="text-brand-yellow text-sm tracking-[0.05em]">
                {testimonials[currentIndex].date}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Previous testimonial"
      >
        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Next testimonial"
      >
        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-brand-yellow w-8' : 'bg-gray-300'
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function WeddingsPage() {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Track page view on mount
  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_WEDDINGS, '/weddings', 'Wedding Bar Service');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('section');
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        setShowStickyBar(window.scrollY > heroBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const heroImages = [
    { src: '/images/services/weddings/outdoor-bar-setup.webp', alt: 'Elegant Wedding Bar Setup' },
    { src: '/images/hero/wedding-hero-vineyard.webp', alt: 'Texas Hill Country vineyard wedding' },
    { src: '/images/hero/wedding-hero-ballroom.webp', alt: 'Driskill Hotel ballroom reception' },
    { src: '/images/hero/wedding-hero-garden.webp', alt: 'Laguna Gloria garden wedding' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);
  const packages = [
    {
      name: "Beer & Wine Special",
      price: "$13/person (~$1,300 for 100)",
      description: "Perfect for casual receptions and laid-back celebrations",
      features: [
        "Curated selection of craft beers and wines",
        "Delivery to your venue, cold if needed",
        "Perfect for welcome parties & day-after brunch",
        "Add coolers, cups, ice, and custom koozies"
      ],
      featured: false
    },
    {
      name: "Affordable Full Bar",
      price: "$16/person (~$1,600 for 100)",
      description: "Full bar service at a budget-friendly price",
      features: [
        "Beer, wine, and well spirits included",
        "Classic cocktail capabilities",
        "Mixers, garnishes, and ice included",
        "Delivery and basic bar setup"
      ],
      featured: false
    },
    {
      name: "Standard Bar",
      price: "$20/person (~$2,000 for 100)",
      description: "Our most popular package for traditional celebrations",
      features: [
        "Premium beer, wine, and call spirits",
        "Signature cocktail menu options",
        "Full bar setup with glassware",
        "Delivery, setup, and rental returns included"
      ],
      featured: true
    },
    {
      name: "Texas Bar",
      price: "$23/person (~$2,300 for 100)",
      description: "Elevated experience with Texas craft selections",
      features: [
        "Local craft beers and Texas wines",
        "Premium spirits and Texas whiskeys",
        "Custom signature cocktails",
        "Full service with professional setup"
      ],
      featured: false
    },
    {
      name: "Deluxe Bar",
      price: "$26/person (~$2,600 for 100)",
      description: "Luxury service for unforgettable celebrations",
      features: [
        "Top-shelf spirits and champagne",
        "Any alcohol available in Central TX",
        "Custom bespoke cocktails",
        "Full setup, breakdown, and premium glassware"
      ],
      featured: false
    }
  ];

  return (
    <div className="bg-white">
      {/* SEO Schemas - Server-rendered for crawlers */}
      <WeddingsSchemas />

      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] mt-24 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentHeroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Image
              src={heroImages[currentHeroIndex].src}
              alt={heroImages[currentHeroIndex].alt}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              onError={(e) => {
                e.currentTarget.src = '/images/services/weddings/outdoor-bar-setup.webp';
              }}
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/30 to-gray-900/50" />

        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em] leading-tight md:leading-tight">
            <span className="block text-white mb-2">Your Austin Wedding,</span>
            <span className="block text-brand-yellow">PERFECTLY SERVED</span>
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg md:text-xl font-light tracking-[0.1em] text-gray-200 mb-8">
            Curated bar service with venue coordination, cold delivery, and TABC-certified bartenders for Austin, Hill Country, and Lake Travis weddings.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/order">
              <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                ORDER NOW
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium">
                SCHEDULE 15-MIN PLANNING CALL
              </button>
            </Link>
          </div>
          <p className="text-sm text-gray-300 mt-4 tracking-[0.05em]">
            Licensed & insured • 72-hour notice recommended • 500+ Austin weddings served
          </p>
        </div>
        
        {/* Hero Dots Navigation */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHeroIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentHeroIndex ? 'bg-brand-yellow w-8' : 'bg-white/50'
              }`}
            />
          ))}
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
            {/* I'm Ready to Order Path */}
            <ScrollRevealCSS duration={800} y={20} className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em] text-center">
                I&apos;m Ready to Order
              </h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Order online and schedule delivery
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything delivered directly to venue (cold if needed)
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  You handle setup or use your own bartender
                </li>
              </ul>
              <Link href="/order">
                <button className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                  ORDER NOW
                </button>
              </Link>
            </ScrollRevealCSS>

            {/* Get a Free Consultation Path */}
            <ScrollRevealCSS duration={800} y={20} delay={100} className="bg-white p-8 rounded-lg shadow-lg border-2 border-brand-yellow">
              <div className="text-center mb-4">
                <span className="text-brand-yellow text-sm tracking-[0.08em] font-medium">MOST POPULAR</span>
              </div>
              <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em] text-center">
                Get a Free Consultation
              </h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Custom recommendations for how much and what to buy
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Receive a proposal and schedule delivery
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-brand-yellow mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Ask about other options including bartenders, transportation, and rental items
                </li>
              </ul>
              <Link href="/contact">
                <button className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                  SCHEDULE A CONSULTATION
                </button>
              </Link>
            </ScrollRevealCSS>
          </div>

          <ScrollRevealCSS duration={800} y={20} delay={200} className="text-center mt-8">
            <p className="text-gray-600 tracking-[0.05em]">
              Trusted for Lake Travis, Hill Country, and downtown Austin venues since 2022
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Why Austin Couples Book Us
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Seamless Venue Coordination
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We work directly with your venue for smooth delivery and setup
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mt-2">
                Don&apos;t trust groomsmen #5 with the entire bar
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                TABC-Certified Professionals
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Licensed bartenders through our vetted partner network
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Curated Local Selection
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                The best of all local breweries and distilleries
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={400} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Austin Area Expertise
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Relationships with many local venues and vendors
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Example Packages
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Thoughtfully designed bar packages to match any style and budget
              <br />
              Ask about our vetted bartending partners
            </p>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {packages.map((pkg, index) => (
              <LuxuryCard
                key={pkg.name}
                featured={pkg.featured}
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
                    <button className={`w-full py-3 tracking-[0.08em] text-sm transition-all duration-300 ${
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
              <strong>Just need delivery?</strong> Build your cart in minutes and we&apos;ll coordinate drop-off with your venue.
            </p>
            <Link href="/order">
              <button className="px-8 py-3 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium">
                ORDER DELIVERY-ONLY
              </button>
            </Link>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Drink Calculator */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20}>
            <WeddingDrinkCalculator />
          </ScrollRevealCSS>
          <ScrollRevealCSS duration={800} y={20} className="mt-12 text-center">
            <p className="text-base md:text-lg text-gray-700 mb-4">
              Want the detailed shopping list? Try our free public tool.
            </p>
            <Link
              href="/wedding-drink-calculator"
              className="btn-primary inline-flex items-center justify-center"
            >
              Wedding Drink Calculator
            </Link>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Celebration Gallery
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { src: "/images/services/weddings/outdoor-bar-setup.webp", alt: "Outdoor Bar Setup" },
              { src: "/images/services/weddings/hill-country-spirits-display.webp", alt: "Hill Country Display" },
              { src: "/images/services/weddings/signature-cocktails-closeup.webp", alt: "Signature Cocktails" },
            ].map((image, index) => (
              <ScrollRevealCSS
                key={index}
                duration={800}
                y={20}
                delay={index * 100}
                className="relative h-80 overflow-hidden group"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-12">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              What Our Clients Say
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <TestimonialCarousel />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Frequently Asked Questions
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="space-y-8">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Do you provide bartenders?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, via vetted TABC-certified partners for full-service packages.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                How far in advance should we book?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                72 hours minimum recommended; peak wedding dates fill fast.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Do you deliver to Lake Travis/Hill Country venues?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, we specialize in Austin, Hill Country, and Lake Travis locations.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={400} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                What about glassware & equipment?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Included with full-service packages; disposable upgrades available for delivery-only.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={500} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Are you licensed & insured?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, fully licensed and insured for events.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={600} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Already have a bartender?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Perfect! Use our Delivery-Only option for curated alcohol delivery.
              </p>
            </ScrollRevealCSS>
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
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Austin&apos;s premier wedding bar service since 2020.
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

      {/* Sticky Bottom Bar */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 tracking-[0.05em]">
                    Planning a wedding?
                  </p>
                  <p className="text-xs text-gray-600">
                    2-minute form • Fast availability check
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href="/order">
                    <button className="px-4 py-2 bg-brand-yellow text-gray-900 text-xs tracking-[0.1em] font-medium">
                      ORDER NOW
                    </button>
                  </Link>
                  <Link href="/contact">
                    <button className="px-4 py-2 border border-brand-yellow text-brand-yellow text-xs tracking-[0.1em] font-medium">
                      SCHEDULE CALL
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
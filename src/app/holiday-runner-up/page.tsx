'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import Footer from '@/components/Footer';
import { trackMetaEvent } from '@/components/MetaPixel';
import HolidayProductsCarousel from '@/components/holiday/HolidayProductsCarousel';
import { setAgeVerified } from "@/lib/utils/age-verification";

// TODO: Confirm Shopify discount code "RUNNERUP" is configured for free delivery on $250+
// TODO: Update offer expiration date if needed

export default function HolidayRunnerUpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  // Countdown timer - ends at midnight on December 14, 2025 (Central Time)
  useEffect(() => {
    const endDate = new Date('2025-12-15T06:00:00Z'); // Midnight CT = 6am UTC

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-verify age for this landing page and track page view
  useEffect(() => {
    setAgeVerified();

    // Fire Meta Pixel ViewContent event
    trackMetaEvent('ViewContent', {
      content_name: 'Holiday Runner-Up Landing Page',
      content_category: 'Holiday Promotion',
      content_type: 'landing_page',
    });
  }, []);

  const whatsIncluded = [
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Free Mini Espresso Martini Bottle',
      description:
        'Kick off the night with our signature mini bottle of Espresso Martinis. Perfect for a host toast or a little pre-party pick-me-up.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      title: 'Holiday Party Gift Package',
      description:
        'A curated bundle of fun party extras—think festive garnish, napkins, or small party surprises—to make your setup feel thoughtful and elevated.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: 'Free Ice (Up to 80 lbs)',
      description:
        'No more last-minute ice runs. We include up to 80 lbs of ice with your order—enough to keep all your drinks cold throughout the party.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      title: 'Free Delivery on Orders $250+',
      description:
        "We'll deliver all your beer, wine, seltzers, and cocktail kits right to your door in the Austin area when you place a holiday party order of $250 or more.",
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Shop Our Selection',
      description: 'Browse our curated holiday party drinks—beer, wine, seltzers, cocktail kits, and more.',
    },
    {
      step: '2',
      title: 'Use Code RUNNERUP',
      description: 'Apply the code at checkout to unlock free delivery on orders $250+. Your gifts are included automatically.',
    },
    {
      step: '3',
      title: 'We Deliver Your Party',
      description: 'Your drinks + free mini Espresso Martini bottle + holiday gift package + up to 80 lbs of ice all arrive cold and on time.',
    },
  ];

  const faqs = [
    {
      question: 'Who is this offer for?',
      answer:
        'This offer is exclusively for people who entered our Holiday Cocktail Kit Giveaway on Instagram. Thank you for participating!',
    },
    {
      question: 'Is there a minimum order?',
      answer:
        'Yes. Free delivery and your runner-up gifts apply to holiday party orders of $250 or more in the Austin area.',
    },
    {
      question: 'What areas do you deliver to?',
      answer:
        "We deliver throughout the Austin area including downtown, East Austin, South Congress, Lake Travis, and surrounding neighborhoods. If you're not sure whether we can reach your venue, just give us a call.",
    },
    {
      question: 'Can I use this for a corporate holiday party?',
      answer:
        'Absolutely. We regularly work with companies, offices, and event planners for corporate celebrations and off-site parties. One invoice for your accounting team.',
    },
    {
      question: 'How long is this offer valid?',
      answer:
        'This is a limited-time holiday promotion. We recommend placing your order as soon as possible to lock in your date and ensure inventory availability.',
    },
    {
      question: 'Can you help me choose what to order?',
      answer:
        "Yes! Give us a call at (737) 371-9700 or email info@partyondelivery.com. We'll recommend quantities and mix based on your guest count and preferences.",
    },
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Simple Logo Header - Landing Page Style */}
      <header className="absolute top-0 left-0 right-0 z-50 py-4 px-6">
        <Link href="/" className="inline-block">
          <Image
            src="/images/pod-logo-2025.svg"
            alt="Party On Delivery"
            width={180}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </Link>
      </header>

      {/* Urgency Banner with Countdown */}
      <div className="bg-gray-100 py-5 px-4 text-center relative overflow-hidden border-b border-gray-200">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-yellow/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
        <div className="relative z-10">
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-wide flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-block animate-pulse text-brand-yellow">&#9889;</span>
            EXCLUSIVE RUNNER-UP OFFER – FREE DELIVERY + FREE ICE
            <span className="inline-block animate-pulse text-brand-yellow">&#9889;</span>
          </p>
          {!isExpired && (
            <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3 text-gray-900 font-mono">
              <span className="text-base sm:text-lg font-semibold">OFFER ENDS IN:</span>
              <div className="flex gap-1 sm:gap-2">
                <div className="bg-black text-yellow-400 px-2 py-1 rounded text-base sm:text-xl font-bold min-w-[45px] sm:min-w-[55px]">
                  {String(timeLeft.days).padStart(2, '0')}
                  <span className="text-[10px] sm:text-xs block font-normal text-yellow-300">DAYS</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">:</span>
                <div className="bg-black text-yellow-400 px-2 py-1 rounded text-base sm:text-xl font-bold min-w-[45px] sm:min-w-[55px]">
                  {String(timeLeft.hours).padStart(2, '0')}
                  <span className="text-[10px] sm:text-xs block font-normal text-yellow-300">HRS</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">:</span>
                <div className="bg-black text-yellow-400 px-2 py-1 rounded text-base sm:text-xl font-bold min-w-[45px] sm:min-w-[55px]">
                  {String(timeLeft.minutes).padStart(2, '0')}
                  <span className="text-[10px] sm:text-xs block font-normal text-yellow-300">MIN</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">:</span>
                <div className="bg-black text-yellow-400 px-2 py-1 rounded text-base sm:text-xl font-bold min-w-[45px] sm:min-w-[55px]">
                  {String(timeLeft.seconds).padStart(2, '0')}
                  <span className="text-[10px] sm:text-xs block font-normal text-yellow-300">SEC</span>
                </div>
              </div>
            </div>
          )}
          {isExpired && (
            <p className="mt-3 text-base font-semibold text-gray-700">This offer has expired. Contact us for current promotions!</p>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[550px] sm:h-[75vh] sm:min-h-[600px] flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/images/hero/corporate-hero-gala.webp"
            alt="Holiday party celebration with drinks"
            fill
            sizes="100vw"
            className="object-cover"
            priority
            onError={(e) => {
              e.currentTarget.src = '/images/hero/austin-skyline-golden-hour.webp';
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50" />

        <div className="hero-fade-in relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-0 text-white">
          <p className="text-brand-yellow text-sm sm:text-base tracking-[0.1em] mb-4 font-medium">
            INSTAGRAM GIVEAWAY RUNNER-UP EXCLUSIVE
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight sm:tracking-[0.05em] max-w-4xl leading-snug sm:leading-tight">
            Didn&apos;t Win the Giveaway?
            <br />
            <span className="text-brand-yellow">You Still Get the Good Stuff</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mb-8 leading-relaxed">
            As a runner-up in our Holiday Cocktail Kit Giveaway, you get a free mini Espresso Martini bottle, a bonus
            holiday gift package, FREE ice (up to 80 lbs), and FREE delivery on your holiday party order ($250+).
          </p>

          {/* Value Bullets */}
          <ul className="space-y-3 mb-8 text-base sm:text-lg">
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Free mini bottle of Espresso Martinis</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Free holiday gift package with fun party extras</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Free ice (up to 80 lbs) – no more last-minute ice runs!</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Free delivery on your holiday party order ($250+ in Austin area)</span>
            </li>
          </ul>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link
              href="/order"
              className="inline-block bg-brand-yellow text-gray-900 px-10 py-4 text-lg tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium text-center"
            >
              SHOP NOW & CLAIM YOUR GIFT
            </Link>
            <a
              href="tel:+17373719700"
              className="inline-block border-2 border-white text-white px-10 py-4 text-lg tracking-[0.08em] hover:bg-white hover:text-gray-900 transition-colors font-medium text-center"
            >
              CALL US: (737) 371-9700
            </a>
          </div>

          <p className="text-sm text-gray-400 italic">
            *Exclusive for Instagram giveaway entrants. Limited-time holiday offer.
          </p>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Here&apos;s What You Get as a Runner-Up
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whatsIncluded.map((item, index) => (
              <ScrollRevealCSS key={item.title} duration={600} delay={index * 100} y={20}>
                <div className="bg-white p-6 rounded-lg shadow-sm text-center h-full">
                  <div className="mb-4">{item.icon}</div>
                  <h3 className="font-heading text-lg text-gray-900 mb-3 tracking-[0.05em]">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{item.description}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>

          <ScrollRevealCSS duration={600} delay={300} y={20}>
            <p className="text-center text-gray-500 mt-10 text-sm">
              Available for holiday parties, office celebrations, house parties, and more throughout the Austin area.
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* How It Works Section - with background image */}
      <section className="py-20 relative">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/holiday/cranberry-cocktails.jpg"
            alt="Holiday cocktails"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4 tracking-[0.1em]">How It Works</h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <ScrollRevealCSS key={item.step} duration={600} delay={index * 100} y={20}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-yellow rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="font-heading text-2xl text-gray-900 font-bold">{item.step}</span>
                  </div>
                  <h3 className="font-heading text-xl text-white mb-4 tracking-[0.05em]">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>

          {/* Trust Badges */}
          <ScrollRevealCSS duration={600} delay={300} y={20}>
            <div className="flex flex-wrap justify-center gap-8 mt-16 text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>TABC Licensed</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>5-Star Rated</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Austin Local</span>
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Holiday Products Carousel */}
      <HolidayProductsCarousel />

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Why Austin Hosts Love Party On Delivery
            </h2>
            <div className="flex justify-center items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-500 text-sm">5.0 stars on Google</p>
          </ScrollRevealCSS>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Review 1 - Shannon */}
            <ScrollRevealCSS duration={600} delay={0} y={20}>
              <div className="bg-white p-8 rounded-lg shadow-sm h-full">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">
                  &ldquo;Party on Delivery is a fantastic treasure!! They truly made our company UT tailgate happen! They
                  delivered all our liquor and kegs and brought tables and chairs for our guests! Communication was easy
                  and they helped me decide on how much alcohol we would need!! I highly recommend Party on Delivery to
                  save you time and stress!! Very reasonably priced too!&rdquo;
                </p>
                <div className="border-t pt-4">
                  <p className="font-medium text-gray-900">Shannon Crim</p>
                  <p className="text-sm text-gray-500">Company UT Tailgate</p>
                </div>
              </div>
            </ScrollRevealCSS>

            {/* Review 2 - Dane */}
            <ScrollRevealCSS duration={600} delay={100} y={20}>
              <div className="bg-white p-8 rounded-lg shadow-sm h-full">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">
                  &ldquo;I ordered from here for our company party on Lake Travis. They delivered with all the drinks
                  chilled and kept cold in a big cooler. Great communication. Got everything we needed, even some things
                  not on the website. Right on time! Will definitely buy from them again.&rdquo;
                </p>
                <div className="border-t pt-4">
                  <p className="font-medium text-gray-900">Dane Witbeck</p>
                  <p className="text-sm text-gray-500">Company Party on Lake Travis</p>
                </div>
              </div>
            </ScrollRevealCSS>

            {/* Review 3 - Chandler */}
            <ScrollRevealCSS duration={600} delay={200} y={20}>
              <div className="bg-white p-8 rounded-lg shadow-sm h-full">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">
                  &ldquo;Reliable, fast, and wonderful service was provided for my corporate team building event. Will
                  definitely be using Party on Delivery again!&rdquo;
                </p>
                <div className="border-t pt-4">
                  <p className="font-medium text-gray-900">Chandler Little</p>
                  <p className="text-sm text-gray-500">Corporate Team Building Event</p>
                </div>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Holiday Runner-Up Gift FAQ
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollRevealCSS key={index} duration={600} delay={index * 50} y={20}>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-brand-yellow transform transition-transform ${
                        openFAQ === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFAQ === index && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-3xl sm:text-4xl mb-6 tracking-[0.1em]">
              Ready to Make Your Holiday Party Easy?
            </h2>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
              Shop our selection, use code <span className="text-brand-yellow font-bold">RUNNERUP</span> at checkout, and
              enjoy free delivery + free ice (up to 80 lbs) + your exclusive gifts. We handle the drinks so you can focus on celebrating.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link
                href="/order"
                className="inline-block bg-brand-yellow text-gray-900 px-10 py-4 text-lg tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium"
              >
                SHOP NOW
              </Link>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center text-lg">
              <a href="tel:+17373719700" className="text-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                (737) 371-9700
              </a>
              <a
                href="mailto:info@partyondelivery.com"
                className="text-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                info@partyondelivery.com
              </a>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

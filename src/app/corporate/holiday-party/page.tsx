'use client';

import React, { useState, useEffect, useRef } from 'react';
import { blankHoneypotFields } from '@/lib/forms/honeypot';
import Image from 'next/image';
import Link from 'next/link';
import CorporateEventCalculatorLanding from '@/components/CorporateEventCalculatorLanding';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { trackMetaEvent } from '@/components/MetaPixel';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

export default function CorporateHolidayPartyPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    eventDate: '',
    guestCount: '',
    venue: '',
    eventType: 'Holiday Party',
    notes: '',
  });
  const formLoadedAt = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showFAQ, setShowFAQ] = useState<number | null>(null);

  // Auto-verify age for B2B corporate page and capture UTM parameters
  useEffect(() => {
    localStorage.setItem('age_verified', 'true');

    // Track page view
    trackPageView(ANALYTICS_EVENTS.VIEW_CORPORATE_HOLIDAY, '/corporate/holiday-party', 'Corporate Holiday Party');

    // Capture UTM parameters
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || '';
    const utmMedium = urlParams.get('utm_medium') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';
    const utmContent = urlParams.get('utm_content') || '';

    sessionStorage.setItem('utm_source', utmSource);
    sessionStorage.setItem('utm_medium', utmMedium);
    sessionStorage.setItem('utm_campaign', utmCampaign);
    sessionStorage.setItem('utm_content', utmContent);
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCalculatorAddToQuote = (calculatorResults: string) => {
    setFormData(prev => ({
      ...prev,
      notes: calculatorResults,
    }));

    // Smooth scroll to form
    const formElement = document.getElementById('inquiry-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScheduleCall = () => {
    const formElement = document.getElementById('inquiry-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const payload = {
        ...formData,
        contactName: `${formData.firstName} ${formData.lastName}`.trim(),
        businessName: formData.company,
        partnerType: 'Corporate Holiday Party',
        source: 'corporate-holiday-party-landing-page',
        submittedAt: new Date().toISOString(),
        utm_source: sessionStorage.getItem('utm_source') || '',
        utm_medium: sessionStorage.getItem('utm_medium') || '',
        utm_campaign: sessionStorage.getItem('utm_campaign') || '',
        utm_content: sessionStorage.getItem('utm_content') || '',
        _formLoadedAt: formLoadedAt.current,
        // Honeypot: always-empty trap, unified non-autofill name (see @/lib/forms/honeypot).
        ...blankHoneypotFields(),
      };

      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      // Require a persisted inquiryId — a honeypot/too-fast/gibberish drop (or a
      // failed save) returns success:true without one, so this keeps the
      // confirmation (and the Meta Lead event below) honest.
      if (!response.ok || !data.success || !data.inquiryId) {
        throw new Error(data.error || 'Failed to submit form');
      }

      // Fire Meta Pixel Lead event on successful submission
      trackMetaEvent('Lead', {
        content_name: 'Corporate Holiday Party Inquiry',
        content_category: 'Corporate Events',
        value: 800, // Estimated average order value
        currency: 'USD',
      });

      setSubmitMessage('Thank you! Your inquiry has been submitted. We\'ll contact you within 24 hours to finalize your holiday party details.');

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        company: '',
        email: '',
        phone: '',
        eventDate: '',
        guestCount: '',
        venue: '',
        eventType: 'Holiday Party',
        notes: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSubmitMessage(`An error occurred: ${errorMessage}. Please call us at (737) 371-9700 or try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'One Invoice for Accounting',
      description: 'No reimbursement headaches. One clean invoice your finance team will love.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Delivered Cold, On Schedule',
      description: 'We coordinate with your venue and deliver during your preferred window.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      title: 'Everything in One Delivery',
      description: 'Beer, wine, spirits, mixers, ice, cups, and disposables. All from one vendor.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: '20 to 500+ Guests',
      description: 'From intimate team dinners to company-wide celebrations, we scale to fit.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'TABC Licensed #P-200084398',
      description: 'Fully compliant with Texas regulations. ID-verified delivery every time.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'No More Store Runs',
      description: 'Stop sending employees to the liquor store on company time.',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Tell Us Your Date & Headcount',
      description: 'Fill out the quick form below with your holiday party details.',
    },
    {
      step: '2',
      title: 'Get Your Custom Quote',
      description: 'We\'ll respond within 24 hours with a package tailored to your budget.',
    },
    {
      step: '3',
      title: 'We Deliver Cold & On-Time',
      description: 'Everything arrives at your venue, chilled and ready to serve.',
    },
    {
      step: '4',
      title: 'Celebrate Your Team',
      description: 'Focus on what matters—your people—while we handle the bar.',
    },
  ];

  const faqs = [
    {
      question: 'What\'s the last day to order for holiday party delivery?',
      answer: 'We require 72 hours advance notice for all orders. For guaranteed holiday delivery, we recommend ordering by December 22nd. December dates book up fast, so submit your inquiry early to lock in your preferred delivery window.',
    },
    {
      question: 'How much does it cost for a corporate holiday party?',
      answer: 'Most corporate holiday parties range from $500-$2,000 depending on guest count and drink preferences. For a 50-person party with beer, wine, and a signature cocktail, expect around $800-$1,200. We\'ll provide a detailed quote based on your specific needs.',
    },
    {
      question: 'Do you provide ice?',
      answer: 'Yes! We deliver bagged ice with every order. This is one of the biggest pain points we solve—no more last-minute ice runs. We calculate the right amount based on your guest count and event duration.',
    },
    {
      question: 'Can you deliver to our office or venue?',
      answer: 'We deliver throughout Austin and surrounding areas including downtown offices, event venues, restaurants, and private spaces. We coordinate directly with your venue or building management to ensure smooth delivery.',
    },
    {
      question: 'What if our guest count changes?',
      answer: 'We understand event planning is fluid. You can adjust your order up to 48 hours before delivery at no extra charge. For changes within 48 hours, call us at (737) 371-9700 and we\'ll do our best to accommodate.',
    },
    {
      question: 'Do you provide bartenders?',
      answer: 'We focus on beverage delivery and supplies. For bartending services, we can recommend trusted local partners. Many clients opt for self-serve setups which work great for casual office parties.',
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

      {/* Deadline Banner */}
      <div className="bg-green-500 py-5 px-4 text-center relative overflow-hidden">
        {/* Subtle shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-black tracking-wide relative z-10 flex items-center justify-center gap-3">
          <span className="inline-block animate-pulse">&#9889;</span>
          ORDER BY DECEMBER 8TH - FREE ICE & DELIVERY
          <span className="inline-block animate-pulse">&#9889;</span>
        </p>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[500px] sm:h-[70vh] sm:min-h-[600px] flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/images/hero/corporate-hero-gala.webp"
            alt="Corporate holiday party with professional bar service in Austin"
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

        <div className="hero-fade-in relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-0 text-white">
          <p className="text-brand-yellow text-sm sm:text-base tracking-[0.1em] mb-4 font-medium">
            CORPORATE HOLIDAY PARTIES
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight sm:tracking-[0.05em] max-w-4xl leading-snug sm:leading-tight">
            One Stop Shop - Drinks, Ice, Supplies - Delivered and Set Up.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl max-w-3xl leading-relaxed mb-8 text-gray-200">
            We handle your office holiday party bar so you can focus on celebrating your team. Beer, wine, spirits, mixers, and ice—delivered cold.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2">
            <button
              onClick={handleScheduleCall}
              className="px-8 py-4 bg-brand-yellow text-black hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
            >
              GET YOUR FREE QUOTE
            </button>
            <a
              href="tel:+17373719700"
              className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.1em] text-sm font-medium text-center"
            >
              CALL (737) 371-9700
            </a>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-gray-900 py-6">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex flex-wrap justify-center gap-8 text-gray-300 text-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              TABC Licensed #P-200084398
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Fully Insured
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Austin Local Since 2023
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              20-500+ Guests
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us for Holiday Parties */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Why Companies Choose Us for Holiday Parties
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional service that saves time, eliminates stress, and keeps your finance team happy
            </p>
          </ScrollRevealCSS>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <ScrollRevealCSS
                key={index}
                duration={600}
                delay={index * 100}
                y={20}
                className="text-center p-6"
              >
                {benefit.icon}
                <h3 className="font-heading text-xl text-gray-900 mt-6 mb-3 tracking-[0.05em]">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Reviews from Real Austin Companies
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
                  &ldquo;Party on Delivery is a fantastic treasure!! They truly made our company UT tailgate happen! They delivered all our liquor and kegs and brought tables and chairs for our guests! Communication was easy and they helped me decide on how much alcohol we would need!! I highly recommend Party on Delivery to save you time and stress!! Very reasonably priced too!&rdquo;
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
                  &ldquo;I ordered from here for our company party on Lake Travis. They delivered with all the drinks chilled and kept cold in a big cooler. Great communication. Got everything we needed, even some things not on the website. Right on time! Will definitely buy from them again.&rdquo;
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
                  &ldquo;Reliable, fast, and wonderful service was provided for my corporate team building event. Will definitely be using Party on Delivery again!&rdquo;
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

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Four simple steps to a stress-free holiday party bar
            </p>
          </ScrollRevealCSS>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <ScrollRevealCSS
                key={index}
                duration={600}
                delay={index * 100}
                y={20}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center">
                  <span className="font-heading text-2xl">{step.step}</span>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* What We Deliver */}
      <section className="relative py-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero/espresso-martini-kit.jpg.png"
            alt="Espresso Martini Cocktail Kit with Deep Eddy Vodka and Caffe Del Fuego"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-white mb-4 tracking-[0.1em]">
              What We Deliver
            </h2>
            <p className="text-lg text-gray-300">
              Everything you need for a perfect holiday party bar
            </p>
          </ScrollRevealCSS>

          <div className="grid md:grid-cols-3 gap-8">
            <ScrollRevealCSS duration={600} delay={0} y={20} className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border border-white/20">
              <h3 className="font-heading text-2xl text-white mb-4">Alcohol</h3>
              <ul className="space-y-3 text-gray-200">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Beer (domestic, craft, imports)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Wine (red, white, sparkling)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Spirits (vodka, whiskey, tequila, rum, gin)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Cocktail kits (margarita, mule, etc.)
                </li>
              </ul>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={600} delay={100} y={20} className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border border-white/20">
              <h3 className="font-heading text-2xl text-white mb-4">Mixers & More</h3>
              <ul className="space-y-3 text-gray-200">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Sodas & tonic water
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Juices (cranberry, orange, lime)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Garnishes (limes, lemons, olives)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Non-alcoholic options
                </li>
              </ul>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={600} delay={200} y={20} className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border border-white/20">
              <h3 className="font-heading text-2xl text-white mb-4">Supplies</h3>
              <ul className="space-y-3 text-gray-200">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Bagged ice (we calculate for you)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Plastic cups & glassware
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Napkins & cocktail straws
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-brand-yellow mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Coolers available
                </li>
              </ul>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Estimate Your Holiday Party Needs
            </h2>
            <p className="text-lg text-gray-600">
              Get instant quantities based on your guest count and event duration
            </p>
          </ScrollRevealCSS>

          <CorporateEventCalculatorLanding
            onAddToQuote={handleCalculatorAddToQuote}
            onScheduleCall={handleScheduleCall}
          />
        </div>
      </section>

      {/* Pricing Band */}
      <section className="py-16 bg-brand-yellow text-gray-900">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={600} y={20}>
            <h3 className="font-heading text-3xl mb-6 tracking-[0.1em]">
              Transparent Pricing for Any Size Party
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                20-50 guests: $500-$1,000
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                50-100 guests: $800-$1,500
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                100+ guests: Custom quote
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry-form" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Get Your Free Holiday Party Quote
            </h2>
            <p className="text-lg text-gray-600">
              Tell us about your event and we&apos;ll respond within 24 hours
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={600} delay={200} y={20}>
            <form
              onSubmit={handleSubmit}
              className="bg-gray-50 rounded-lg shadow-lg p-8"
            >
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  value={formData.company}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Party Date *
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    required
                    value={formData.eventDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-2">
                    Guest Count *
                  </label>
                  <input
                    type="number"
                    id="guestCount"
                    name="guestCount"
                    min="20"
                    required
                    placeholder="e.g., 50"
                    value={formData.guestCount}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                  Venue / Location
                </label>
                <input
                  type="text"
                  id="venue"
                  name="venue"
                  placeholder="Office address or venue name"
                  value={formData.venue}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  placeholder="Budget range, drink preferences, special requests, or calculator results..."
                  value={formData.notes}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 mt-1 mr-3"
                  />
                  <span className="text-sm text-gray-600">
                    I consent to Party On Delivery contacting me about my holiday party inquiry.
                    All deliveries require valid ID verification and compliance with Texas alcohol laws.
                  </span>
                </label>
              </div>

              {submitMessage && (
                <div className={`mb-6 p-4 rounded-md ${submitMessage.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {submitMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'SUBMITTING...' : 'GET MY FREE QUOTE'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Or call us directly: <a href="tel:+17373719700" className="text-brand-yellow hover:underline">(737) 371-9700</a>
              </p>
            </form>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Holiday Party FAQs
            </h2>
            <p className="text-lg text-gray-600">
              Common questions about corporate holiday party service
            </p>
          </ScrollRevealCSS>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollRevealCSS
                key={index}
                duration={600}
                delay={index * 50}
                y={20}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <button
                  onClick={() => setShowFAQ(showFAQ === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-brand-yellow flex-shrink-0 transform transition-transform ${
                      showFAQ === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-4xl md:text-5xl mb-6 tracking-[0.1em]">
              December Dates Are Booking Fast
            </h2>
            <p className="text-xl mb-8 leading-relaxed text-gray-300">
              Don&apos;t wait until the last minute. Get your free quote today and lock in your holiday party date.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleScheduleCall}
                className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
              >
                GET YOUR FREE QUOTE
              </button>
              <a
                href="tel:+17373719700"
                className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.1em] text-sm font-medium text-center"
              >
                CALL (737) 371-9700
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
                Austin&apos;s premier alcohol delivery and corporate event service since 2020.
                Fully licensed by TABC.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/austin-corporate-event-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Corporate Events
                  </Link>
                </li>
                <li>
                  <Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Weddings
                  </Link>
                </li>
                <li>
                  <Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Boat Parties
                  </Link>
                </li>
                <li>
                  <Link href="/austin-bachelor-party-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Celebrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SHOP</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/products" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link href="/collections/cocktail-kits" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Cocktail Kits
                  </Link>
                </li>
                <li>
                  <Link href="/collections/spirits" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Spirits
                  </Link>
                </li>
                <li>
                  <Link href="/collections/wine" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Wine
                  </Link>
                </li>
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
            <p className="text-gray-500 text-sm">&copy; 2024 Party On Delivery. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import CorporateEventCalculatorLanding from '@/components/CorporateEventCalculatorLanding';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { trackMetaEvent } from '@/components/MetaPixel';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

export default function CorporateLandingPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    eventDate: '',
    guestCount: '',
    venue: '',
    eventType: '',
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
    trackPageView(ANALYTICS_EVENTS.VIEW_CORPORATE, '/corporate', 'Corporate Events');

    // Capture UTM parameters
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || '';
    const utmMedium = urlParams.get('utm_medium') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';

    sessionStorage.setItem('utm_source', utmSource);
    sessionStorage.setItem('utm_medium', utmMedium);
    sessionStorage.setItem('utm_campaign', utmCampaign);
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
        partnerType: 'Corporate Events',
        source: 'corporate-landing-page',
        submittedAt: new Date().toISOString(),
        utm_source: sessionStorage.getItem('utm_source') || '',
        utm_medium: sessionStorage.getItem('utm_medium') || '',
        utm_campaign: sessionStorage.getItem('utm_campaign') || '',
        _formLoadedAt: formLoadedAt.current,
        website_url: '',
        fax_number: '',
      };

      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit form');
      }

      // Fire Meta Pixel Lead event on successful submission
      trackMetaEvent('Lead', {
        content_name: 'Corporate Event Inquiry',
        content_category: 'Corporate Events',
        value: 800, // Estimated average order value
        currency: 'USD',
      });

      setSubmitMessage("Thank you! Your inquiry has been submitted. We'll contact you within 24 hours to finalize your event details.");

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
        eventType: '',
        notes: '',
      });
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      setSubmitMessage(`An error occurred: ${errorMessage}. Please call us at (737) 371-9700 or try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      title: 'One Vendor, Everything You Need',
      description: 'Beer, wine, spirits, mixers, ice, cups, and disposables—all from a single reliable source.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Delivered Cold, Right on Schedule',
      description: 'We coordinate with your venue and deliver during your preferred window—everything arrives cold.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Stress-Free Planning',
      description: 'One quick call or online quote. We handle the details so you can focus on your event.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Local & Licensed',
      description: 'Austin-based team with all permits and insurance. ID-verified delivery every time.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Scales from 20 to 500+ Guests',
      description: 'Small team gatherings to large company-wide events—we handle groups of any size.',
    },
    {
      icon: (
        <svg className="w-12 h-12 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'Reliable Support',
      description: 'Fast responses, easy changes, and clear communication from quote to delivery.',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Tell Us About the Event',
      description: 'Share your date, guest count, location, and any special requests.',
    },
    {
      step: '2',
      title: 'We Propose a Custom Drink Plan',
      description: 'We recommend the right mix of beer, wine, spirits, and mixers based on your group.',
    },
    {
      step: '3',
      title: 'We Deliver Cold & On-Time',
      description: 'Everything arrives during your window, cold and ready for bar staff or self-serve.',
    },
    {
      step: '4',
      title: 'Enjoy Your Event',
      description: 'No store runs, no worries, no stress—just a great event for your team.',
    },
  ];

  const useCases = [
    {
      title: 'Team Offsites',
      description: 'Build connections outside the office with curated drinks that keep everyone engaged.',
      image: '/images/hero/corporate-hero-tech.webp',
    },
    {
      title: 'Holiday Parties',
      description: 'Celebrate the season with hassle-free bar service for your entire company.',
      image: '/images/hero/corporate-hero-gala.webp',
    },
    {
      title: 'Launch Celebrations',
      description: 'Toast new products, features, or milestones with professional beverage service.',
      image: '/images/hero/corporate-hero-conference.webp',
    },
    {
      title: 'Corporate Retreats',
      description: 'Elevate multi-day retreats with thoughtful drink planning and reliable delivery.',
      image: '/images/hero/austin-skyline-golden-hour.webp',
    },
    {
      title: 'Networking Mixers',
      description: 'Create comfortable networking environments with quality drinks and seamless service.',
      image: '/images/hero/corporate-hero-tech.webp',
    },
    {
      title: 'Client Appreciation',
      description: 'Impress clients and partners with curated selections and flawless execution.',
      image: '/images/hero/corporate-hero-gala.webp',
    },
  ];

  const faqs = [
    {
      question: 'What areas do you serve for corporate events?',
      answer: 'We deliver throughout Austin and surrounding areas including downtown offices, venues, and offsite locations. This includes the Domain, downtown Austin, South Congress, East Austin, and nearby suburbs. Contact us to confirm your specific address.',
    },
    {
      question: 'How much advance notice do you need?',
      answer: 'We require 72 hours advance notice for standard delivery to ensure we can source everything you need and coordinate with your venue. For rush orders or last-minute events, call us at (737) 371-9700 to check availability—we&apos;ll do our best to accommodate.',
    },
    {
      question: 'Can you handle last-minute changes?',
      answer: 'Yes! We understand event guest counts and plans can change. Contact us as soon as possible and we&apos;ll work with you to adjust your order. For changes within 48 hours of delivery, additional fees may apply.',
    },
    {
      question: 'What types of alcohol do you provide?',
      answer: 'We offer beer (domestic, craft, and imports), wine (red, white, rosé, and sparkling), and spirits (vodka, whiskey, tequila, rum, gin). We can customize selections based on your preferences and budget.',
    },
    {
      question: 'Do you provide mixers, ice, and disposables?',
      answer: 'Yes! We provide mixers (tonic, club soda, cola, juice), bagged ice, plastic cups, napkins, cocktail straws, and other bar essentials. Everything arrives cold and ready to serve.',
    },
    {
      question: 'What delivery windows are available?',
      answer: 'We offer flexible delivery windows between 10 AM and 8 PM, Monday through Saturday. We coordinate directly with your venue or office to ensure delivery during your preferred time. Sunday deliveries may be available by special request.',
    },
    {
      question: 'Are you licensed and compliant?',
      answer: 'Yes, we are fully licensed by TABC (Texas Alcoholic Beverage Commission) and carry comprehensive insurance. All deliveries require valid ID verification and compliance with Texas alcohol laws.',
    },
    {
      question: 'How does payment work?',
      answer: 'We accept all major credit cards, corporate cards, and can set up NET payment terms for established corporate clients. Purchase orders are welcome. Payment is due before or at delivery.',
    },
  ];

  return (
    <div className="bg-white min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[500px] sm:h-[70vh] sm:min-h-[600px] mt-24 flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/images/hero/corporate-hero-conference.webp"
            alt="Corporate event in Austin with professional bar service"
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
          {/* H1 Options (others in comments) */}
          {/* Option 1: "Corporate Events, Simplified." */}
          {/* Option 3: "Cold Drinks. Zero Stress. Perfect for Every Office Event." */}

          <h1 className="sr-only">Austin Corporate Event Alcohol Delivery</h1>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight sm:tracking-[0.05em] max-w-4xl leading-snug sm:leading-tight">
            Austin&apos;s Easiest Way to Stock the Bar for Company Parties.
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl max-w-3xl leading-relaxed mb-8">
            From 20 to 500+ guests—beer, wine, spirits, mixers, and ice delivered cold and on time. Simple planning, zero stress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 flex-wrap">
            <button
              onClick={handleScheduleCall}
              className="px-8 py-4 bg-brand-yellow text-black hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
            >
              SCHEDULE A CALL
            </button>
            <button
              onClick={handleScheduleCall}
              className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.1em] text-sm font-medium"
            >
              GET A QUOTE
            </button>
            <Link href="/plan-event">
              <button className="px-8 py-4 border-2 border-brand-yellow text-brand-yellow hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.1em] text-sm font-medium">
                GET A QUICK ESTIMATE
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Companies Choose Us */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Why Companies Choose Us
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Reliable service that saves time and eliminates stress
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

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Four simple steps to perfect event drinks
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

      {/* Use Cases */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-16">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Perfect For Every Occasion
            </h2>
            <p className="text-lg text-gray-600">
              Professional bar service tailored to your event type
            </p>
          </ScrollRevealCSS>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <ScrollRevealCSS
                key={index}
                duration={600}
                delay={index * 100}
                y={20}
                className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="relative h-64">
                  <Image
                    src={useCase.image}
                    alt={useCase.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = '/images/hero/austin-skyline-golden-hour.webp';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="font-heading text-2xl mb-2 tracking-[0.05em]">
                    {useCase.title}
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Estimate Your Event Needs
            </h2>
            <p className="text-lg text-gray-600">
              Get instant quantities for your guest count and duration
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
              Simple, Transparent Pricing
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Packages starting at $500 for groups of 20+
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Mixers, ice, cups & disposables available
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Custom quotes for larger events
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Mid-Page Conversion Band */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Ready to Make Planning Painless?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Get a custom quote in minutes or schedule a quick call to discuss your event
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleScheduleCall}
                className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
              >
                SCHEDULE A CALL
              </button>
              <button
                onClick={handleScheduleCall}
                className="px-8 py-4 border-2 border-brand-yellow text-brand-yellow hover:bg-yellow-50 transition-colors tracking-[0.1em] text-sm font-medium"
              >
                GET A QUOTE
              </button>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry-form" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Get Your Custom Quote
            </h2>
            <p className="text-lg text-gray-600">
              Tell us about your event and we&apos;ll respond within 24 hours
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={600} delay={200} y={20}>
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-lg shadow-lg p-8"
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
                Company Name
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
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
                  Event Date
                </label>
                <input
                  type="date"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Count
                </label>
                <input
                  type="number"
                  id="guestCount"
                  name="guestCount"
                  min="20"
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
              <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="">Select event type</option>
                <option value="Holiday Party">Holiday Party</option>
                <option value="Team Offsite">Team Offsite</option>
                <option value="Corporate Retreat">Corporate Retreat</option>
                <option value="Launch Celebration">Launch Celebration</option>
                <option value="Networking Mixer">Networking Mixer</option>
                <option value="Client Appreciation">Client Appreciation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={5}
                placeholder="Any special requests or calculator results..."
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
                  I consent to Party On Delivery contacting me about my corporate event inquiry.
                  I understand all deliveries require valid ID verification and compliance with Texas alcohol laws.
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
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT INQUIRY'}
            </button>
          </form>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Blog Link Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-12 text-white text-center">
            <h2 className="font-heading text-3xl md:text-4xl mb-4 tracking-[0.1em]">
              Planning a Corporate Event in Austin?
            </h2>
            <p className="text-lg mb-8 text-gray-300 max-w-2xl mx-auto">
              Read our complete guide to corporate event planning—venues, budgets, catering, team building, and more.
            </p>
            <Link href="/corporate-events-guide">
              <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium">
                READ THE FULL GUIDE
              </button>
            </Link>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about our corporate event service
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
      <section className="py-20 bg-brand-yellow text-gray-900">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-4xl md:text-5xl mb-6 tracking-[0.1em]">
              Let&apos;s Make Your Event Easy
            </h2>
            <p className="text-xl mb-8 leading-relaxed">
              One call, one vendor, zero stress. Get started with a custom quote today.
            </p>
            <button
              onClick={handleScheduleCall}
              className="px-8 py-4 bg-white text-brand-yellow hover:bg-gray-100 transition-colors tracking-[0.1em] text-sm font-medium"
            >
              SCHEDULE A CALL
            </button>
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
                Fully licensed by TABC.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
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
                <li>
                  <Link href="/corporate" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Corporate
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
                  <Link href="/products?filter=spirits" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Spirits
                  </Link>
                </li>
                <li>
                  <Link href="/products?filter=wine" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Wine
                  </Link>
                </li>
                <li>
                  <Link href="/products?filter=packages" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">
                    Packages
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
            <p className="text-gray-500 text-sm">© 2024 Party On Delivery. All rights reserved.</p>
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

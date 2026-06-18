'use client';

import React, { useState, useRef } from 'react';
import { blankHoneypotFields } from '@/lib/forms/honeypot';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import LuxuryCard from '@/components/LuxuryCard';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

export default function PartnersPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    businessType: '',
    monthlyVolume: '',
    message: ''
  });

  const formLoadedAt = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Validate form
    if (!formData.businessName || !formData.contactName || !formData.email ||
        !formData.phone || !formData.businessType || !formData.monthlyVolume) {
      setErrorMessage('Please fill in all required fields.');
      setSubmitStatus('error');
      setIsSubmitting(false);
      // Scroll to top of form
      const formElement = document.getElementById('partner-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          partnerType: 'General Partnership',
          source: 'partners-main-page',
          submittedAt: new Date().toISOString(),
          _formLoadedAt: formLoadedAt.current,
          // Honeypot: always-empty trap, unified non-autofill name (see @/lib/forms/honeypot).
          ...blankHoneypotFields(),
        }),
      });

      const data = await response.json();
      // Require a persisted inquiryId — a honeypot/too-fast/gibberish drop (or a
      // failed save) returns success:true without one.
      if (!response.ok || !data.success || !data.inquiryId) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSubmitStatus('success');
      // Reset form
      setFormData({
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        businessType: '',
        monthlyVolume: '',
        message: ''
      });
    } catch (error) {
      console.error('Form submission error:', error);
      setErrorMessage('Something went wrong. Please try again or call us at (512) 555-0100.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const partnerTypes = [
    {
      href: '/partners/mobile-bartenders',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      title: "Mobile Bartenders",
      description: "Help your clients and make additional revenue on every party",
      available: true,
      image: '/images/hero/mobile-bartender-outdoor-event.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Hotels & Resorts",
      description: "Elevate your guest experience with premium in-room amenities and event services",
      available: false,
      comingSoon: true,
      image: '/images/partners/hotel-partner.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      title: "Vacation Rentals",
      description: "Premium spirits and curated packages delivered to your Austin rental properties",
      available: false,
      comingSoon: true,
      image: '/images/backgrounds/chic-austin-airbnb.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
        </svg>
      ),
      title: "Property Management",
      description: "Offer residents exclusive access to curated spirits and concierge delivery",
      available: false,
      comingSoon: true,
      image: '/images/backgrounds/rooftop-terrace-elegant-1.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Event Planners",
      description: "Seamless bar services and custom packages for weddings and corporate events",
      available: false,
      comingSoon: true,
      image: '/images/partners/venue-partner.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 5h11M3 12h11M3 19h11M16 5l3 3-3 3M16 12h5M16 19l3-3-3-3" />
        </svg>
      ),
      title: "Restaurants & Bars",
      description: "Reliable supply chain and exclusive selections for your establishment",
      available: false,
      comingSoon: true,
      image: '/images/partners/restaurant-partner.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Corporate Offices",
      description: "Impress clients and reward teams with premium spirits and cocktail experiences",
      available: false,
      comingSoon: true,
      image: '/images/partners/corporate-partner.webp'
    },
    {
      href: '#',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Country Clubs",
      description: "Exclusive member benefits and tournament sponsorship opportunities",
      available: false,
      comingSoon: true,
      image: '/images/textures/gold-liquid-abstract.webp'
    }
  ];

  const benefits = [
    {
      title: "Revenue Share",
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: "Earn commission on referred customers"
    },
    {
      title: "Dedicated Delivery",
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-4-1a1 1 0 001 1h3M9 17h1" />
        </svg>
      ),
      description: "Dedicated delivery service to anywhere in the county"
    },
    {
      title: "Custom Storefront",
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      description: "White-labeled ordering portal with your branding"
    },
    {
      title: "Priority Service",
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: "Dedicated account manager and express delivery"
    }
  ];

  const tiers = [
    {
      name: "Tier 1 Partner",
      volume: "$0 - $5,000 in referred orders",
      discount: "5% Commission",
      features: [
        "Free delivery for clients",
        "Dedicated account manager",
        "Monthly invoicing",
        "Priority delivery",
        "Event consultation"
      ]
    },
    {
      name: "Tier 2 Partner",
      volume: "$10,000 - $20,000 in referred orders",
      discount: "8% Commission",
      features: [
        "Everything in Tier 1",
        "Custom storefront on our website",
        "Social media collaborations"
      ]
    },
    {
      name: "Tier 3 Partner",
      volume: "$20,000+ in referred orders",
      discount: "10% Commission",
      features: [
        "Everything in Tier 2",
        "Preferred vendor list",
        "Free Boat Party on our sister company's biggest boat (premierpartycruises.com)!"
      ]
    }
  ];

  return (
    <div className="bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] pt-32 md:pt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/gallery/headquarters-entrance.webp"
          alt="Partner with Party On"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/70" />
        
        <div
          className="relative text-center text-white z-10 max-w-4xl mx-auto px-8 hero-fade-in"
        >
          <h1 className="font-heading font-light text-5xl md:text-6xl mb-6 tracking-[0.08em]">
            PARTNER WITH US
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-xl font-light tracking-[0.1em] mb-8 text-gray-200">
            Elevate Your Business with Austin&apos;s Premier Alcohol Delivery Service
          </p>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Transform Your Hospitality Experience
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Join Austin&apos;s most distinguished establishments in offering guests and clients
                seamless access to premium spirits, craft cocktails, and white-glove delivery service.
              </p>
            </div>
          </ScrollRevealCSS>

          {/* Partner Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {partnerTypes.map((type, index) => (
              <ScrollRevealCSS key={type.title} duration={800} delay={index * 100} y={30}>
                <div>
                  {type.available ? (
                    <Link href={type.href}>
                      <LuxuryCard backgroundImage={type.image}>
                        <div className="p-8">
                          <div className="text-brand-yellow mb-4 group-hover:text-yellow-600 transition-colors">{type.icon}</div>
                          <h3 className="font-heading text-2xl mb-3 text-gray-900 tracking-wide group-hover:text-brand-yellow transition-colors">{type.title}</h3>
                          <p className="text-gray-600">{type.description}</p>
                        </div>
                      </LuxuryCard>
                    </Link>
                  ) : (
                    <LuxuryCard backgroundImage={type.image}>
                      <div className="p-8">
                        <div className="text-gray-600 mb-4">{type.icon}</div>
                        <h3 className="font-heading text-2xl mb-3 text-gray-700 tracking-wide">{type.title}</h3>
                        <p className="text-gray-600">{type.description}</p>
                        {type.comingSoon && (
                          <div className="absolute top-4 right-4 bg-brand-yellow text-gray-900 text-xs px-3 py-1 tracking-[0.1em]">
                            COMING SOON
                          </div>
                        )}
                      </div>
                    </LuxuryCard>
                  )}
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Partner Benefits
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {benefits.map((benefit, index) => (
              <ScrollRevealCSS key={benefit.title} duration={800} delay={index * 100} y={30}>
                <div className="text-center">
                  <div className="text-brand-yellow mb-3 flex justify-center">{benefit.icon}</div>
                  <h3 className="text-xl font-medium mb-2 text-gray-900 tracking-wide">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Tiers */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Partnership Tiers
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose the partnership level that aligns with your business needs
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier, index) => (
              <ScrollRevealCSS key={tier.name} duration={800} delay={index * 100} y={30}>
                <div className="bg-white p-8 border-2 border-gray-200">
                  <h3 className="font-heading text-2xl mb-2 text-gray-900">{tier.name}</h3>
                  <p className="text-gray-600 mb-2">{tier.volume}</p>
                  <p className="text-3xl font-light text-brand-yellow mb-6">{tier.discount}</p>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Solutions */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollRevealCSS duration={800} y={30}>
              <div>
                <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                  Custom Branded Solutions
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Create a seamless experience for your customers with our white-label platform.
                  Your brand, our expertise.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Custom Storefront</h4>
                      <p className="text-gray-600">Fully branded ordering portal matching your visual identity</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">API Integration</h4>
                      <p className="text-gray-600">Seamless connection to your existing systems and platforms</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Curated Collections</h4>
                      <p className="text-gray-600">Custom product selections tailored to your clientele</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Analytics Dashboard</h4>
                      <p className="text-gray-600">Real-time insights into orders, preferences, and trends</p>
                    </div>
                  </li>
                </ul>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={100} y={30}>
              <div className="relative h-[500px]">
                <Image
                  src="/images/gallery/ai-recommended-setup.webp"
                  alt="Custom Solutions"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-12">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Become a Partner
              </h2>
              <p className="text-lg text-gray-600">
                Join Austin&apos;s premier network of distinguished establishments
              </p>
            </div>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={800} delay={100} y={30}>
            <form
              id="partner-form"
              onSubmit={handleSubmit}
              className="bg-white p-8 md:p-12 shadow-lg relative"
            >
            {/* Status Messages */}
            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}
            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Thank you! Your partnership inquiry has been submitted successfully. We&apos;ll be in touch within 24 hours.</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  BUSINESS NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  CONTACT NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  PHONE NUMBER
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  BUSINESS TYPE
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                >
                  <option value="">Select Type</option>
                  <option value="hotel">Hotel / Resort</option>
                  <option value="property">Property Management</option>
                  <option value="event">Event Planning</option>
                  <option value="restaurant">Restaurant / Bar</option>
                  <option value="corporate">Corporate Office</option>
                  <option value="club">Country Club</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  ESTIMATED MONTHLY VOLUME
                </label>
                <select
                  name="monthlyVolume"
                  value={formData.monthlyVolume}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                >
                  <option value="">Select Volume</option>
                  <option value="under5k">Under $5,000</option>
                  <option value="5k-15k">$5,000 - $15,000</option>
                  <option value="15k-30k">$15,000 - $30,000</option>
                  <option value="over30k">Over $30,000</option>
                </select>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                TELL US ABOUT YOUR NEEDS
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors resize-none"
                placeholder="Share your vision for partnership and any specific requirements..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full px-8 py-4 transition-colors tracking-[0.08em] text-sm font-medium ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
              }`}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT PARTNERSHIP INQUIRY'}
            </button>

            <p className="text-sm text-gray-600 mt-6 text-center">
              A partnership specialist will contact you within 24 hours to discuss your needs
            </p>
            </form>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Success Stories
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollRevealCSS duration={800} y={30}>
              <div className="bg-gray-50 p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-brand-yellow fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  &quot;Party On Delivery is an awesome concept with top-notch customer service. We&apos;ve been working with them for a matter of months now, and the fact they make everything so seamless makes everybody&apos;s life a breeze when it comes to party planning, which we know can be very stressful with all the moving parts. I highly recommend Party On Delivery for anybody who wants to take the stress out of the alcohol ordering. Keep up the good work, Allan and Brian!&quot;
                </p>
                <div className="font-medium text-gray-900">James Burt</div>
                <div className="text-sm text-gray-600">Local Guide · 10 months ago</div>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={100} y={30}>
              <div className="bg-gray-50 p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-brand-yellow fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  &quot;I met Allan at an Open House at Ranch Austin and his team has been very communicative and helpful while placing an alcohol order for my wedding clients. They were flexible and made the process easy! They delivered to the venue and even offered to chill some of the wine and beer for us. I&apos;d recommend them to anyone and will definitely be using their services again!&quot;
                </p>
                <div className="font-medium text-gray-900">Tatianna Ramon</div>
                <div className="text-sm text-gray-600">Local Guide · a year ago</div>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={200} y={30}>
              <div className="bg-gray-50 p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-brand-yellow fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  &quot;I ordered from here for our company party on Lake Travis. They delivered with all the drinks chilled and kept cold in a big cooler. Great communication. Got everything we needed, even some things not on the website. Right on time! Will definitely buy from them again.&quot;
                </p>
                <div className="font-medium text-gray-900">Dane Witbeck</div>
                <div className="text-sm text-gray-600">13 reviews · a year ago</div>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
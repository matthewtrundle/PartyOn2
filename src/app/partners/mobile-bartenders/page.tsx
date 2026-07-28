'use client';

import React, { useState, useEffect, useRef } from 'react';
import { blankHoneypotFields } from '@/lib/forms/honeypot';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import YouTubeEmbed from '@/components/YouTubeEmbed';

export default function MobileBartenderPartnerPage() {
  // Commission configuration
  const BASE_COMMISSION = "5";

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    website: '',
    serviceArea: '',
    eventTypes: [] as string[],
    guestCount: '',
    timeframe: '',
    notes: '',
    consent: false,
    // Hidden UTM fields
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    source: 'bartender-landing'
  });

  const formLoadedAt = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-verify age for B2B partner pages
  useEffect(() => {
    localStorage.setItem('age_verified', 'true');
  }, []);

  // Capture UTM parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setFormData(prev => ({
        ...prev,
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || ''
      }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email ||
        !formData.phone || !formData.consent) {
      setErrorMessage('Please fill in all required fields and agree to the terms.');
      setSubmitStatus('error');
      setIsSubmitting(false);
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
      // Send form data to partner inquiry API
      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Contact Information
          firstName: formData.firstName,
          lastName: formData.lastName,
          businessName: formData.businessName || `${formData.firstName} ${formData.lastName}`,
          businessType: 'Mobile Bartender',
          contactName: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,

          // Service Details
          serviceArea: formData.serviceArea,
          eventTypes: formData.eventTypes,
          guestCount: formData.guestCount,
          timeframe: formData.timeframe,
          notes: formData.notes,

          // Common fields
          interests: formData.eventTypes,
          message: `Service Area: ${formData.serviceArea || 'Not specified'}
Guest Count: ${formData.guestCount || 'Not specified'}
Timeframe: ${formData.timeframe || 'Not specified'}
Website/Instagram: ${formData.website || 'Not provided'}
Additional Notes: ${formData.notes || 'None'}

UTM Source: ${formData.utm_source || 'direct'}
UTM Medium: ${formData.utm_medium || 'none'}
UTM Campaign: ${formData.utm_campaign || 'none'}
Source: ${formData.source}`,
          partnerType: 'Mobile Bartenders',

          // Tracking fields
          utm_source: formData.utm_source,
          utm_medium: formData.utm_medium,
          utm_campaign: formData.utm_campaign,
          utm_content: formData.utm_content,
          source: formData.source,

          // System fields
          submittedAt: new Date().toISOString(),
          _formLoadedAt: formLoadedAt.current,
          // Honeypot: always-empty trap, unified non-autofill name (see @/lib/forms/honeypot).
          ...blankHoneypotFields(),
        }),
      });

      const result = await response.json();

      // Require a persisted inquiryId — a honeypot/too-fast/gibberish drop (or a
      // failed save) returns success:true without one.
      if (!response.ok || !result.success || !result.inquiryId) {
        throw new Error(result.error || 'Failed to submit form');
      }

      setSubmitStatus('success');

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        businessName: '',
        email: '',
        phone: '',
        website: '',
        serviceArea: '',
        eventTypes: [],
        guestCount: '',
        timeframe: '',
        notes: '',
        consent: false,
        utm_source: formData.utm_source,
        utm_medium: formData.utm_medium,
        utm_campaign: formData.utm_campaign,
        utm_content: formData.utm_content,
        source: 'bartender-landing'
      });
    } catch (error) {
      console.error('Form submission error:', error);
      setErrorMessage('Something went wrong. Please try again or call us at (737) 371-9700.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && 'checked' in e.target) {
      const checkbox = e.target as HTMLInputElement;
      if (name === 'consent') {
        setFormData(prev => ({ ...prev, consent: checkbox.checked }));
      } else if (name === 'eventTypes') {
        const eventValue = checkbox.value;
        setFormData(prev => ({
          ...prev,
          eventTypes: checkbox.checked
            ? [...prev.eventTypes, eventValue]
            : prev.eventTypes.filter(t => t !== eventValue)
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Smooth scroll handler
  const scrollToForm = () => {
    const formElement = document.getElementById('partner-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const benefits = [
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Earn Commission on Every Order",
      description: `Start at ${BASE_COMMISSION}% commission on all orders you refer. The more you send, the more you earn.`
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Cold Drinks & Ice Delivered On-Time",
      description: "We keep everything properly chilled from our warehouse to the venue. Your clients get quality, you get reliability."
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-4-1a1 1 0 001 1h3M9 17h1" />
        </svg>
      ),
      title: "No More Store Runs or Hauling",
      description: "Stop dragging cases through parking lots. We handle the heavy lifting so you can focus on crafting drinks."
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: "Mixers, Cups & Disposables Available",
      description: "Complete bar supplies available with every order. Mixers, garnishes, ice, cups, and cocktail napkins all in one delivery."
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      title: "Dedicated Local Support",
      description: "Direct line to our Austin team. Real people who know the venues, traffic, and exactly what you need."
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      ),
      title: "Lake Travis & Event-Ready Logistics",
      description: "From downtown penthouses to lake house parties, we deliver anywhere in Austin. Boat parties? We got you."
    }
  ];

  const howItWorksSteps = [
    {
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      title: "Join Our Affiliate Network",
      description: "Sign up below and get your unique discount code to share with clients. We track your commission and the client gets FREE DELIVERY."
    },
    {
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "Clients Order Thru Us",
      description: "You send what the client needs to us via email. We email the client an invoice and keep you in the loop."
    },
    {
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-4-1a1 1 0 001 1h3M9 17h1" />
        </svg>
      ),
      title: "We Deliver Everything",
      description: "Spirits, beer, wine, mixers, ice, and rental items arrive cold and on-time to the venue."
    },
    {
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "You Pour, Earn Commission",
      description: "Focus on what you do best—crafting amazing drinks. Get paid automatically for every order you referred."
    }
  ];

  const useCases = [
    {
      title: "Weddings",
      description: "Signature cocktails for 100+ guests",
      image: "/images/hero/lake-travis-wedding-sunset-1.webp"
    },
    {
      title: "Bachelor/ette Parties",
      description: "All-night celebrations on 6th Street or Lake Travis",
      image: "/images/hero/bach-hero-rainey.webp"
    },
    {
      title: "Corporate Events",
      description: "Professional happy hours and team building",
      image: "/images/hero/corporate-hero-tech.webp"
    },
    {
      title: "Boat Parties",
      description: "Lake Travis cruises with premium bar service",
      image: "/images/hero/lake-travis-yacht-sunset.webp"
    },
    {
      title: "Vacation Rentals",
      description: "Private home parties across Austin",
      image: "/images/hero/luxury-wedding-estate-1.webp"
    }
  ];

  const testimonials = [
    {
      quote: "Party On Delivery is an awesome concept with top-notch customer service. We've been working with them for a matter of months now, and the fact they make everything so seamless makes everybody's life a breeze when it comes to party planning...",
      author: "James Burt",
      role: "Local Guide · 10 months ago",
      image: "/images/authors/brian-hill.png"
    },
    {
      quote: "If you need alcohol for your event, call POD! Allan at Ranch Austin was amazing at taking our order and making sure it was all there in time for the wedding! They were truly helpful and the service was ABOVE and beyond in every way.",
      author: "Tatianna Ramon",
      role: "Local Guide · a year ago",
      image: "/images/authors/allan-henslee.png"
    },
    {
      quote: "For the first time in 10 years, I didn't have to buy the booze for the company boat party on Lake Travis. This is the best kept secret on the whole lake. 100% coming back year after year. Thank you POD!",
      author: "Dane Witbeck",
      role: "13 reviews · a year ago",
      image: "/images/authors/brian-hill.png"
    }
  ];

  const faqs = [
    {
      question: "How much commission do I earn as a partner?",
      answer: `Partners start at ${BASE_COMMISSION}% commission on all referred orders. The more orders you send, the higher your commission tier.`
    },
    {
      question: "How do I get paid?",
      answer: "We process payouts twice per month via direct deposit or check. You'll receive detailed reports showing all your referred orders and earned commissions."
    },
    {
      question: "Do I need a business license to partner?",
      answer: "You'll need a valid TABC certification and liability insurance to serve alcohol at events. We handle all the retail licensing for delivery."
    },
    {
      question: "What areas do you deliver to?",
      answer: "We cover all of Austin and surrounding areas including Lake Travis, Lakeway, Dripping Springs, and Cedar Park. Same-day and scheduled deliveries available."
    },
    {
      question: "Can my clients use their own custom drink lists?",
      answer: "Absolutely! We work with you to create custom orders based on your bar menu. Our catalog includes 500+ premium spirits, craft beers, and wines."
    },
    {
      question: "What if there's a problem with a delivery?",
      answer: "You have a direct line to our dispatch team. If anything goes wrong, we fix it immediately—replacement delivery, refund, or credit. Your reputation matters to us."
    },
    {
      question: "Do you deliver ice and mixers too?",
      answer: "Yes! Every order includes your choice of bagged ice, mixers, garnishes, cups, napkins, and bar tools. Everything you need to run a full bar service."
    },
    {
      question: "How far in advance do orders need to be placed?",
      answer: "We recommend 72 hours for large events, but we can often accommodate same-day and next-day orders depending on availability and location."
    }
  ];

  const eventTypeOptions = [
    'Weddings',
    'Bachelor/Bachelorette Parties',
    'Corporate Events',
    'Boat Parties',
    'Private Parties',
    'Vacation Rentals',
    'Other'
  ];

  return (
    <div className="bg-white">
      {/* TODO: Insert tracking pixels here - GA4, Meta Pixel, etc. */}

      {/* JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Party On Delivery",
            "url": "https://partyondelivery.com",
            "logo": "https://partyondelivery.com/logo.png",
            "description": "Austin's premier alcohol delivery and event logistics company, partnering with mobile bartenders for seamless event service.",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Austin",
              "addressRegion": "TX",
              "addressCountry": "US"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+1-737-371-9700",
              "contactType": "Partner Inquiries"
            }
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }}
      />

      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Professional mobile bartender at outdoor event with string lights */}
        <Image
          src="/images/hero/mobile-bartender-outdoor-event.webp"
          alt="Professional mobile bartender serving cocktails at elegant outdoor Austin event under string lights"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/80" />

        <div className="hero-fade-in relative text-center text-white z-10 max-w-5xl mx-auto px-8">

          {/* Primary H1 */}
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            You Pour. We Deliver.
          </h1>

          {/* Alternative H1 options (commented out) */}
          {/* <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            Austin Mobile Bartenders: Earn More, Haul Less
          </h1> */}

          {/* <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            Get Paid for Every Drink Order
          </h1> */}

          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />

          <p className="text-2xl font-light tracking-[0.1em] mb-10 text-gray-200 max-w-3xl mx-auto">
            Partner with Austin&apos;s top alcohol delivery service. Earn commission on every order, skip the store runs, and focus on what you do best.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={scrollToForm}
              className="bg-brand-yellow text-gray-900 px-10 py-4 text-lg tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium"
            >
              APPLY TO PARTNER
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('how-it-works');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-2 border-white text-white px-10 py-4 text-lg tracking-[0.08em] hover:bg-white hover:text-gray-900 transition-colors font-medium"
            >
              HOW IT WORKS
            </button>
          </div>
        </div>
      </section>

      {/* Video Showcase Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-12">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                See How It Works
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Watch how Austin&apos;s top mobile bartenders are earning more with Party On Delivery
              </p>
            </div>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={800} delay={200} y={30}>
            <YouTubeEmbed
              videoId="8s5WsAs7IGA"
              title="Mobile Bartender Partnership Program - Party On Delivery"
            />
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={800} delay={300} y={30}>
            <div className="mt-8 text-center">
              <button
                onClick={scrollToForm}
                className="bg-brand-yellow text-gray-900 px-10 py-4 text-lg tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium"
              >
                APPLY TO PARTNER
              </button>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Why Partner With Us
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Join Austin&apos;s most trusted alcohol delivery network and start earning more while doing less heavy lifting.
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <ScrollRevealCSS key={benefit.title} duration={800} delay={(index % 8) * 100} y={30}>
                <div className="bg-gray-50 p-8 text-center">
                  <div className="text-brand-yellow mb-4 flex justify-center">{benefit.icon}</div>
                  <h3 className="text-xl font-medium mb-3 text-gray-900 tracking-wide">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                How It Works
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Four simple steps to start earning commission on every event
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, index) => (
              <ScrollRevealCSS key={step.title} duration={800} delay={(index % 8) * 100} y={30}>
                <div className="text-center">
                  <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <div className="text-brand-yellow">{step.icon}</div>
                  </div>
                  <div className="text-3xl font-heading text-brand-yellow mb-3">{index + 1}</div>
                  <h3 className="text-xl font-medium mb-3 text-gray-900">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Tiers */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Partnership Tiers
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                The more you refer, the more you earn
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollRevealCSS duration={800} delay={0} y={30}>
              <div className="bg-white p-8 border-2 border-gray-200">

              <h3 className="font-heading text-2xl mb-2 text-gray-900">Tier 1 Partner</h3>
              <p className="text-gray-600 mb-2">$0 - $5,000 in referred orders</p>
              <p className="text-3xl font-light text-brand-yellow mb-6">5% Commission</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Free delivery for clients</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Monthly invoicing</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Priority delivery</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Event consultation</span>
                </li>
              </ul>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={100} y={30}>
              <div className="bg-white p-8 border-2 border-gray-200">

              <h3 className="font-heading text-2xl mb-2 text-gray-900">Tier 2 Partner</h3>
              <p className="text-gray-600 mb-2">$10,000 - $20,000 in referred orders</p>
              <p className="text-3xl font-light text-brand-yellow mb-6">8% Commission</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Everything in Tier 1</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Custom storefront on our website</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Social media collaborations</span>
                </li>
              </ul>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} delay={200} y={30}>
              <div className="bg-white p-8 border-2 border-gray-200">

              <h3 className="font-heading text-2xl mb-2 text-gray-900">Tier 3 Partner</h3>
              <p className="text-gray-600 mb-2">$20,000+ in referred orders</p>
              <p className="text-3xl font-light text-brand-yellow mb-6">10% Commission</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Everything in Tier 2</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Preferred vendor list</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Free Boat Party on our sister company&apos;s biggest boat (premierpartycruises.com)!</span>
                </li>
              </ul>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Events We Serve Together
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From intimate gatherings to 500-person celebrations, we&apos;ve got the logistics covered
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {useCases.map((useCase, index) => (
              <ScrollRevealCSS key={useCase.title} duration={800} delay={(index % 8) * 100} y={30}>
                <div className="relative h-64 overflow-hidden group">
                {/* TODO: Replace with generated lifestyle images */}
                <Image
                  src={useCase.image}
                  alt={useCase.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="font-heading text-2xl mb-2">{useCase.title}</h3>
                  <p className="text-sm text-gray-200">{useCase.description}</p>
                </div>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Local Advantage */}
      <section className="relative py-20 overflow-hidden">
        <Image
          src="/images/hero/austin-skyline-golden-hour.webp"
          alt="Austin skyline at sunset with vibrant colors reflecting on Lady Bird Lake"
          fill
          className="object-cover"
          priority
          sizes="100vw"
          quality={90}
        />
        {/* Darker overlay for better text readability against colorful sunset */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/80 to-gray-900/90" />

        <div className="relative z-10 max-w-7xl mx-auto px-8 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <ScrollRevealCSS duration={800} delay={0} y={30}>
              <div>
                <h2 className="font-heading font-light text-4xl md:text-5xl mb-6 tracking-[0.1em]">
                  Austin Born & Raised
                </h2>
                <div className="w-16 h-px bg-brand-yellow mb-8" />
                <p className="text-xl mb-6 leading-relaxed">
                  We know the difference between downtown traffic at 4pm on a Friday and getting to Lakeway before sunset. We understand TABC compliance, venue delivery protocols, and exactly how much ice melts on a 95-degree July afternoon.
                </p>
                <p className="text-xl mb-8 leading-relaxed">
                  Every delivery arrives cold, on-time, and handled by people who actually care about your event&apos;s success. Because we live here too.
                </p>
                <button
                  onClick={scrollToForm}
                  className="bg-brand-yellow text-gray-900 px-10 py-4 text-lg tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium"
                >
                  BECOME A PARTNER
                </button>
              </div>
            </ScrollRevealCSS>

            {/* Founders Image */}
            <ScrollRevealCSS duration={800} delay={200} y={30}>
              <div className="relative aspect-square max-w-md mx-auto lg:ml-auto lg:mr-0">
                <Image
                  src="/images/about/founders-austin-team.jpg"
                  alt="Party On Delivery founders - Austin locals who understand the city's event scene"
                  fill
                  className="object-cover rounded-lg shadow-2xl"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                What Bartenders Say
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollRevealCSS key={testimonial.author} duration={800} delay={(index % 8) * 100} y={30}>
                <div className="bg-gray-50 p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-brand-yellow fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center">
                  {/* TODO: Replace with generated portrait images */}
                  <div className="w-12 h-12 bg-gray-300 rounded-full mr-4 overflow-hidden relative">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Partners */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Our Partner Network
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Austin&apos;s finest mobile bartending services trust Party On Delivery for their alcohol and supply needs
              </p>
            </div>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* PourTwentyFour */}
            <ScrollRevealCSS duration={800} delay={0} y={30}>
              <a
                href="https://pourtwentyfour.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white shadow-lg hover:shadow-xl transition-shadow group overflow-hidden"
              >
                <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                  <Image
                    src="/images/partners/pourtwentyfour-hero.jpg"
                    alt=""
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative bg-white/90 rounded-lg p-3 shadow-lg">
                    <Image
                      src="/images/partners/pourtwentyfour-logo.png"
                      alt="PourTwentyFour - Upscale Mobile Bartending"
                      width={160}
                      height={60}
                      className="object-contain max-h-14 group-hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
                <div className="p-6">
                <h3 className="font-heading text-xl text-gray-900 mb-2 text-center">PourTwentyFour</h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Upscale mobile bartending service specializing in quality craft cocktails with the freshest ingredients
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Weddings</span>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Corporate Events</span>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Private Parties</span>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-brand-yellow text-sm group-hover:text-yellow-600 transition-colors">
                    Visit Website →
                  </span>
                </div>
                </div>
              </a>
            </ScrollRevealCSS>

            {/* DTR Bartending */}
            <ScrollRevealCSS duration={800} delay={100} y={30}>
              <a
                href="https://dtrbartending.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white shadow-lg hover:shadow-xl transition-shadow group overflow-hidden"
              >
                <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                  <Image
                    src="/images/partners/dtr-bartending-hero.jpg"
                    alt=""
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative bg-white/90 rounded-lg p-3 shadow-lg">
                    <Image
                      src="/images/partners/dtr-bartending-logo.png"
                      alt="DTR Bartending - Drink to Remember"
                      width={160}
                      height={60}
                      className="object-contain max-h-14 group-hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
                <div className="p-6">
                <h3 className="font-heading text-xl text-gray-900 mb-2 text-center">DTR Bartending</h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Event bartending with five-star service, TABC licensed bartenders, and custom crafted signature cocktails
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">TABC Licensed</span>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Fully Insured</span>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Custom Cocktails</span>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-brand-yellow text-sm group-hover:text-yellow-600 transition-colors">
                    Visit Website →
                  </span>
                </div>
                </div>
              </a>
            </ScrollRevealCSS>

            {/* Tap Truck Austin */}
            <ScrollRevealCSS duration={800} delay={200} y={30}>
              <a
                href="https://taptruckaustin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white shadow-lg hover:shadow-xl transition-shadow group overflow-hidden"
              >
                <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                  <Image
                    src="/images/partners/taptruckaustin-hero.jpg"
                    alt=""
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative bg-white/90 rounded-lg p-3 shadow-lg">
                    <Image
                      src="/images/partners/taptruckaustin-logo.png"
                      alt="Tap Truck Austin - Mobile Bar Service"
                      width={160}
                      height={60}
                      className="object-contain max-h-14 group-hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
                <div className="p-6">
                <h3 className="font-heading text-xl text-gray-900 mb-2 text-center">Tap Truck Austin</h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Full service mobile bar in a vintage 1959 Ford F100 with 6 taps for beer, wine, cocktails, and more
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Vintage Truck</span>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">6 Taps</span>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1">Beer & Wine</span>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-brand-yellow text-sm group-hover:text-yellow-600 transition-colors">
                    Visit Website →
                  </span>
                </div>
                </div>
              </a>
            </ScrollRevealCSS>
          </div>

          <ScrollRevealCSS duration={800} delay={300} y={30}>
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">
                Want to join our partner network?
              </p>
              <button
                onClick={scrollToForm}
                className="bg-brand-yellow text-gray-900 px-8 py-3 tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium text-sm"
              >
                APPLY TO PARTNER
              </button>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Partner Form */}
      <section id="partner-form" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-12">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Apply to Partner
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-lg text-gray-600">
                Join Austin&apos;s premier mobile bartender network. We&apos;ll review your application within 24 hours.
              </p>
            </div>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={800} delay={100} y={30}>

            <form
              onSubmit={handleSubmit}
              className="bg-white p-8 md:p-12 shadow-lg"
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
                  <span>Success! Your partnership application has been submitted. We&apos;ll contact you within 24 hours to get you started.</span>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  FIRST NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  LAST NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>
            </div>

            {/* Business Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                BUSINESS NAME
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your bartending service name (if applicable)"
                className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  EMAIL ADDRESS <span className="text-red-500">*</span>
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
                  PHONE NUMBER <span className="text-red-500">*</span>
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

            {/* Website/Instagram */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                WEBSITE OR INSTAGRAM
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://instagram.com/yourbusiness"
                className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
              />
            </div>

            {/* Service Area & Guest Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  PRIMARY SERVICE AREA
                </label>
                <input
                  type="text"
                  name="serviceArea"
                  value={formData.serviceArea}
                  onChange={handleChange}
                  placeholder="Downtown, Lake Travis, etc."
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                  TYPICAL GUEST COUNT
                </label>
                <select
                  name="guestCount"
                  value={formData.guestCount}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
                >
                  <option value="">Select Range</option>
                  <option value="under-50">Under 50 guests</option>
                  <option value="50-100">50-100 guests</option>
                  <option value="100-200">100-200 guests</option>
                  <option value="200-plus">200+ guests</option>
                  <option value="varies">Varies by event</option>
                </select>
              </div>
            </div>

            {/* Event Types */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 tracking-wider">
                EVENT TYPES YOU SERVE (CHECK ALL THAT APPLY)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {eventTypeOptions.map((eventType) => (
                  <label key={eventType} className="flex items-center">
                    <input
                      type="checkbox"
                      name="eventTypes"
                      value={eventType}
                      checked={formData.eventTypes.includes(eventType)}
                      onChange={handleChange}
                      className="w-4 h-4 text-brand-yellow border-gray-300 focus:ring-brand-yellow"
                    />
                    <span className="ml-2 text-gray-700">{eventType}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Timeframe */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                WHEN DO YOU WANT TO START?
              </label>
              <select
                name="timeframe"
                value={formData.timeframe}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
              >
                <option value="">Select Timeframe</option>
                <option value="immediately">Immediately</option>
                <option value="1-2-weeks">1-2 weeks</option>
                <option value="1-month">Within a month</option>
                <option value="exploring">Just exploring options</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wider">
                ADDITIONAL NOTES
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors resize-none"
                placeholder="Tell us about your business, typical events, or any questions you have..."
              />
            </div>

            {/* Consent */}
            <div className="mb-8">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  required
                  className="w-4 h-4 mt-1 text-brand-yellow border-gray-300 focus:ring-brand-yellow"
                />
                <span className="ml-3 text-sm text-gray-600">
                  I agree to receive communications from Party On Delivery about the partnership program.
                  I understand my information will be handled per the{' '}
                  <Link href="/privacy" className="text-brand-yellow hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Hidden UTM Fields */}
            <input type="hidden" name="utm_source" value={formData.utm_source} />
            <input type="hidden" name="utm_medium" value={formData.utm_medium} />
            <input type="hidden" name="utm_campaign" value={formData.utm_campaign} />
            <input type="hidden" name="utm_content" value={formData.utm_content} />
            <input type="hidden" name="source" value={formData.source} />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full px-8 py-4 transition-colors tracking-[0.08em] text-sm font-medium ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
              }`}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
            </button>

            <p className="text-sm text-gray-600 mt-6 text-center">
              Questions? Call us at <a href="tel:+17373719700" className="text-brand-yellow hover:underline">(737) 371-9700</a> or email{' '}
              <a href="mailto:partners@partyondelivery.com" className="text-brand-yellow hover:underline">partners@partyondelivery.com</a>
            </p>
            </form>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div className="text-center mb-16">
              <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-6 tracking-[0.1em]">
                Frequently Asked Questions
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
          </ScrollRevealCSS>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <ScrollRevealCSS key={faq.question} duration={800} delay={(index % 8) * 100} y={30}>
                <div className="bg-gray-50 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800} delay={0} y={30}>
            <div>
              <h2 className="font-heading font-light text-4xl md:text-5xl mb-6 tracking-[0.1em]">
              Ready to Pour Smarter, Not Harder?
            </h2>
            <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
              Join Austin&apos;s top mobile bartenders who are already earning more while doing less heavy lifting.
              Let&apos;s grow your business together.
            </p>
            <button
              onClick={scrollToForm}
              className="bg-brand-yellow text-gray-900 px-12 py-5 text-lg tracking-[0.08em] hover:bg-yellow-600 transition-colors font-medium"
            >
              APPLY TO PARTNER NOW
            </button>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      <Footer />

    </div>
  );
}

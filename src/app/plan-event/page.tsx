'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from "@/components/Navigation";
import AIConcierge from '@/components/AIConcierge';
import Footer from '@/components/Footer';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import WeddingDrinkCalculator from '@/components/WeddingDrinkCalculator';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

interface EventOption {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

export default function PlanEventPage() {
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    eventDate: '',
    guestCount: '',
    venue: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_PLAN_EVENT, '/plan-event', 'Plan Your Event');
  }, []);

  const eventOptions: EventOption[] = [
    {
      id: 'wedding',
      title: 'Weddings',
      description: 'Curated bar packages for your perfect day',
      image: '/images/services/weddings/signature-cocktails-rings.webp',
      link: '/weddings'
    },
    {
      id: 'boat',
      title: 'Boat Parties',
      description: 'Lake Travis delivery to your vessel',
      image: '/images/services/boat-parties/luxury-yacht-deck.webp',
      link: '/boat-parties'
    },
    {
      id: 'bach',
      title: 'Celebrations',
      description: 'Bachelor/ette & special occasions',
      image: '/images/services/bach-parties/bachelor-party-epic.webp',
      link: '/bach-parties'
    },
    {
      id: 'corporate',
      title: 'Corporate',
      description: 'Professional service for business events',
      image: '/images/services/corporate/penthouse-suite-setup.webp',
      link: '/austin-corporate-event-delivery'
    }
  ];

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'plan-event-page',
          subject: `Event Planning Request: ${formData.eventType}`
        })
      });

      if (response.ok) {
        setFormStatus('success');
        setFormData({
          name: '', email: '', phone: '', eventType: '',
          eventDate: '', guestCount: '', venue: '', message: ''
        });
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] mt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/hero/austin-skyline-hero.webp"
          alt="Austin skyline at sunset"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />

        <div className="relative text-center text-white z-10 max-w-4xl mx-auto px-6">
          <h1 className="font-heading font-light text-4xl sm:text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            <span className="block text-white mb-2">Let Us Help</span>
            <span className="block text-brand-yellow">PLAN YOUR EVENT</span>
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg md:text-xl font-light tracking-[0.1em] text-gray-200 max-w-2xl mx-auto">
            Calculate what you need, chat with our AI concierge, or talk directly with our team
          </p>
        </div>
      </section>

      {/* Three Paths Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Choose Your Path
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calculator Path */}
            <ScrollRevealCSS duration={600} y={20} delay={100}>
              <a href="#calculator" className="block bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                  Quick Estimate
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Use our calculator to estimate how much alcohol you need for your event
                </p>
                <span className="text-brand-yellow text-sm tracking-[0.1em] font-medium">
                  USE CALCULATOR
                </span>
              </a>
            </ScrollRevealCSS>

            {/* AI Concierge Path */}
            <ScrollRevealCSS duration={600} y={20} delay={200}>
              <button
                onClick={() => setIsConciergeOpen(true)}
                className="w-full bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center border-2 border-yellow-200"
              >
                <div className="w-16 h-16 bg-brand-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                  AI Concierge
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Chat with our AI to get personalized recommendations for your event
                </p>
                <span className="text-brand-yellow text-sm tracking-[0.1em] font-medium">
                  START CHAT
                </span>
              </button>
            </ScrollRevealCSS>

            {/* Human Contact Path */}
            <ScrollRevealCSS duration={600} y={20} delay={300}>
              <a href="#contact-form" className="block bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                  Talk to Us
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Fill out a quick form and our team will reach out within 24 hours
                </p>
                <span className="text-brand-yellow text-sm tracking-[0.1em] font-medium">
                  CONTACT FORM
                </span>
              </a>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Drink Calculator Section */}
      <section id="calculator" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollRevealCSS duration={600} y={20}>
            <WeddingDrinkCalculator />
          </ScrollRevealCSS>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              Ready to order? Start shopping or let us build a custom quote for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/order">
                <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                  START SHOPPING
                </button>
              </Link>
              <button
                onClick={() => setIsConciergeOpen(true)}
                className="px-8 py-4 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.08em] text-sm font-medium"
              >
                GET AI RECOMMENDATIONS
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Talk to Our Team
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-gray-600">
              Fill out the form below and we&apos;ll get back to you within 24 hours with a custom quote.
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS duration={600} y={20} delay={100}>
            <form onSubmit={handleFormSubmit} className="bg-white p-8 rounded-lg shadow-lg space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                    placeholder="(512) 555-0123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Event Type *</label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                  >
                    <option value="">Select event type</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Boat Party">Boat Party</option>
                    <option value="Bachelor/Bachelorette">Bachelor/Bachelorette</option>
                    <option value="Birthday Party">Birthday Party</option>
                    <option value="House Party">House Party</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Event Date</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Guest Count</label>
                  <input
                    type="number"
                    name="guestCount"
                    value={formData.guestCount}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Venue/Location</label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                    placeholder="Venue name or address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">Additional Details</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                  placeholder="Tell us about your event - any special requests, drink preferences, or questions?"
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="px-12 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium disabled:opacity-50"
                >
                  {formStatus === 'submitting' ? 'SENDING...' : 'SUBMIT REQUEST'}
                </button>
              </div>

              {formStatus === 'success' && (
                <div className="text-center p-4 bg-green-50 text-green-700 rounded-md">
                  Thank you! We&apos;ll be in touch within 24 hours.
                </div>
              )}
              {formStatus === 'error' && (
                <div className="text-center p-4 bg-red-50 text-red-700 rounded-md">
                  Something went wrong. Please try again or call us at (737) 371-9700.
                </div>
              )}
            </form>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Event Types Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollRevealCSS duration={600} y={20} className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
              Explore Event Types
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-6" />
            <p className="text-gray-600 max-w-2xl mx-auto">
              Browse our specialized services for different event types
            </p>
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {eventOptions.map((event, index) => (
              <ScrollRevealCSS key={event.id} duration={600} y={20} delay={index * 100}>
                <Link href={event.link} className="block group">
                  <div className="relative h-64 overflow-hidden rounded-lg">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="font-heading text-xl mb-1 tracking-[0.1em]">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </ScrollRevealCSS>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/order">
              <button className="px-8 py-4 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.08em] text-sm font-medium">
                OR BROWSE ALL PRODUCTS
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* AI Concierge Modal */}
      <AIConcierge
        mode="event-planning"
        isOpen={isConciergeOpen}
        onClose={() => setIsConciergeOpen(false)}
      />
    </div>
  );
}

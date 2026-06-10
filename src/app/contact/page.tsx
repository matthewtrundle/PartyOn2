'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import LuxuryCard from '@/components/LuxuryCard';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { trackPageView, trackFormSubmit, ANALYTICS_EVENTS } from '@/lib/analytics/track';

export default function ContactPage() {
  // Track page view on mount
  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_CONTACT, '/contact', 'Contact Us');
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    eventDate: '',
    guestCount: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Track form submission
        trackFormSubmit('contact_form', '/contact');

        setSubmitMessage(data.message);
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          eventType: '',
          eventDate: '',
          guestCount: '',
          message: ''
        });
      } else {
        setSubmitMessage(data.error || 'Failed to submit. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] mt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/hero/contact-hero-austin.webp"
          alt="Austin Downtown"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />
        
        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            GET IN TOUCH
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto" />
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              How Can We Serve You?
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <LuxuryCard
              backgroundImage="/images/contact/phone-support.webp"
              index={0}
              className="rounded-lg"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.685.049V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-4 tracking-[0.1em]">
                  Call Us
                </h3>
                <a href="tel:7373719700" className="text-gray-900 hover:text-yellow-600 tracking-[0.1em] text-lg font-medium">
                  (737) 371-9700
                </a>
              </div>
            </LuxuryCard>

            <LuxuryCard
              backgroundImage="/images/contact/email-contact.webp"
              index={1}
              className="rounded-lg"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-4 tracking-[0.1em]">
                  Email Us
                </h3>
                <a href="mailto:info@partyondelivery.com" className="text-gray-900 hover:text-yellow-600 tracking-[0.1em] font-medium">
                  info@partyondelivery.com
                </a>
              </div>
            </LuxuryCard>

            <LuxuryCard
              backgroundImage="/images/contact/visit-location.webp"
              index={2}
              className="rounded-lg"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-4 tracking-[0.1em]">
                  Schedule a Quick Call
                </h3>
                <a
                  href="https://123.partyondelivery.com/planning-call"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
                >
                  BOOK A CALL
                </a>
              </div>
            </LuxuryCard>

            <LuxuryCard
              backgroundImage="/images/contact/visit-location.webp"
              index={3}
              className="rounded-lg"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-4 tracking-[0.1em]">
                  Service Hours
                </h3>
                <p className="text-gray-700 font-medium">
                  10AM - 9PM (except Sundays)
                </p>
              </div>
            </LuxuryCard>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Request a Consultation
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-8" />
            <p className="text-gray-600 text-lg">
              Tell us about your event and we&apos;ll create a custom proposal
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS
            duration={800}
            y={20}
          >
            <form
              onSubmit={handleSubmit}
              className="space-y-8"
            >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                  YOUR NAME
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                  PHONE NUMBER
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                  EVENT TYPE
                </label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                >
                  <option value="">Select Event Type</option>
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="boat-party">Boat Party</option>
                  <option value="bachelor">Bachelor/Bachelorette</option>
                  <option value="private">Private Party</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                  EVENT DATE
                </label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                  ESTIMATED GUEST COUNT
                </label>
                <input
                  type="number"
                  name="guestCount"
                  value={formData.guestCount}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                EVENT DETAILS & SPECIAL REQUESTS
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors resize-none"
              />
            </div>

            {submitMessage && (
              <div className={`p-4 rounded-lg ${submitMessage.includes('error') || submitMessage.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                <p className="text-center">{submitMessage}</p>
              </div>
            )}

            <div className="text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-12 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'SENDING...' : 'SEND INQUIRY'}
              </button>
            </div>
            </form>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <ScrollRevealCSS
            duration={800}
            y={20}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-light text-3xl text-gray-900 mb-4 tracking-[0.1em]">
              Quick Links
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { title: "View Packages", link: "/weddings" },
              { title: "Delivery Areas", link: "/delivery-areas" },
              { title: "FAQs", link: "/faqs" },
              { title: "Book Now", link: "/book-now" }
            ].map((item, index) => (
              <ScrollRevealCSS
                key={item.title}
                duration={800}
                y={20}
                delay={index * 100}
              >
                <Link href={item.link}>
                  <div className="bg-white p-6 text-center border border-gray-200 hover:border-brand-yellow transition-colors group">
                    <div className="mb-3">
                      {item.title === "View Packages" && (
                        <svg className="w-8 h-8 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {item.title === "Delivery Areas" && (
                        <svg className="w-8 h-8 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {item.title === "FAQs" && (
                        <svg className="w-8 h-8 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {item.title === "Book Now" && (
                        <svg className="w-8 h-8 mx-auto text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="font-light text-gray-900 tracking-[0.1em] group-hover:text-brand-yellow transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              </ScrollRevealCSS>
            ))}
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
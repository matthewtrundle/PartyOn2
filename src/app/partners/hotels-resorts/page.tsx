'use client'

import React, { useState, useEffect, useRef } from 'react'
import { blankHoneypotFields } from '@/lib/forms/honeypot'
import Image from 'next/image'
import Navigation from "@/components/Navigation"
import Footer from '@/components/Footer'

export default function HotelsResortsPartnerPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const formLoadedAt = useRef(Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [formData, setFormData] = useState({
    hotelName: '',
    contactName: '',
    email: '',
    phone: '',
    numberOfRooms: '',
    currentProvider: '',
    monthlyVolume: '',
    interests: [] as string[]
  })

  // Auto-verify age for B2B partner pages
  useEffect(() => {
    localStorage.setItem('age_verified', 'true')
  }, [])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          interests: formData.interests,
          partnerType: 'Hotels & Resorts',
          source: 'hotels-resorts-page',
          submittedAt: new Date().toISOString(),
          _formLoadedAt: formLoadedAt.current,
          // Honeypot: always-empty trap, unified non-autofill name (see @/lib/forms/honeypot).
          ...blankHoneypotFields(),
        }),
      })

      const data = await response.json();
      // Require a persisted inquiryId — a honeypot/too-fast/gibberish drop (or a
      // failed save) returns success:true without one.
      if (!response.ok || !data.success || !data.inquiryId) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSubmitMessage('Thank you! Your partnership inquiry has been submitted successfully. We\'ll contact you within 24 hours.');
      // Reset form
      setFormData({
        hotelName: '',
        contactName: '',
        email: '',
        phone: '',
        numberOfRooms: '',
        currentProvider: '',
        monthlyVolume: '',
        interests: []
      })
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitMessage('An error occurred. Please try again or call us at (512) 555-0100.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      
      {/* Hero Section with Value Proposition */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/backgrounds/rooftop-terrace-elegant-1.webp"
          alt="Luxury Hotel Bar Service"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-12">
          <div className="hero-fade-in">

            <div className="mb-6">
              <span className="text-yellow-500 text-sm tracking-[0.1em]">HOSPITALITY PARTNERSHIP</span>
            </div>
            
            <h1 className="font-cormorant text-5xl md:text-6xl text-white mb-6 tracking-[0.05em]">
              Elevate Your Guest Experience with Premium Beverage Services
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 leading-relaxed">
              Join 50+ luxury hotels in Austin using Party On to enhance guest satisfaction, 
              increase F&B revenue, and streamline operations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => document.getElementById('partnership-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em]"
              >
                BECOME A PARTNER
              </button>
              <button className="px-8 py-3 border border-white text-white hover:bg-white hover:text-gray-900 transition-all tracking-[0.1em]">
                DOWNLOAD CASE STUDY
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-8 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-cormorant text-yellow-500">50+</p>
              <p className="text-sm text-gray-400 tracking-[0.1em]">HOTEL PARTNERS</p>
            </div>
            <div>
              <p className="text-3xl font-cormorant text-yellow-500">2M+</p>
              <p className="text-sm text-gray-400 tracking-[0.1em]">GUESTS SERVED</p>
            </div>
            <div>
              <p className="text-3xl font-cormorant text-yellow-500">99.5%</p>
              <p className="text-sm text-gray-400 tracking-[0.1em]">ON-TIME DELIVERY</p>
            </div>
            <div>
              <p className="text-3xl font-cormorant text-yellow-500">5.0★</p>
              <p className="text-sm text-gray-400 tracking-[0.1em]">PARTNER RATING</p>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Impact Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="font-cormorant text-4xl mb-4 tracking-[0.1em]">
              PROVEN REVENUE IMPACT
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our hotel partners see measurable improvements in guest satisfaction and F&B revenue
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border border-gray-200 text-center hover:shadow-lg transition-shadow">

              <div className="text-5xl font-cormorant text-brand-yellow mb-4">35%</div>
              <h3 className="font-medium text-gray-900 mb-2 tracking-[0.1em]">INCREASE IN F&B REVENUE</h3>
              <p className="text-sm text-gray-600">
                Average revenue growth from in-room beverage sales in first year
              </p>
            </div>

            <div className="bg-white p-8 border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl font-cormorant text-brand-yellow mb-4">87%</div>
              <h3 className="font-medium text-gray-900 mb-2 tracking-[0.1em]">GUEST SATISFACTION</h3>
              <p className="text-sm text-gray-600">
                Guests rate our service as excellent or outstanding
              </p>
            </div>

            <div className="bg-white p-8 border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl font-cormorant text-brand-yellow mb-4">$45K</div>
              <h3 className="font-medium text-gray-900 mb-2 tracking-[0.1em]">AVG MONTHLY REVENUE</h3>
              <p className="text-sm text-gray-600">
                Additional monthly revenue per 100-room property
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Offerings Tabs */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="font-cormorant text-4xl mb-4 tracking-[0.1em]">
              COMPREHENSIVE HOSPITALITY SOLUTIONS
            </h2>
            <p className="text-gray-600">
              Tailored programs designed for luxury hospitality
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex border border-gray-200">
              {['overview', 'integration', 'services', 'technology'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm tracking-[0.1em] transition-all ${
                    activeTab === tab
                      ? 'bg-brand-yellow text-gray-900'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white border border-gray-200 p-12">
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h3 className="font-cormorant text-2xl mb-6 tracking-[0.1em]">PARTNER BENEFITS</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <strong>Zero Inventory Risk</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          We handle all inventory, storage, and product management
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <strong>Revenue Share Model</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Earn 15-25% commission on all orders with no upfront costs
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <strong>White-Glove Service</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Professional, uniformed delivery staff trained in hospitality standards
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-brand-yellow mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <strong>24/7 Support</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Dedicated account management and round-the-clock guest support
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-cormorant text-2xl mb-6 tracking-[0.1em]">HOW IT WORKS</h3>
                  <ol className="space-y-4">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-8 h-8 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                      <div>
                        <strong>Guest Orders</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Through your branded portal or concierge desk
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-8 h-8 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center text-sm mr-3">2</span>
                      <div>
                        <strong>We Fulfill</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          30-minute delivery from our premium inventory
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-8 h-8 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center text-sm mr-3">3</span>
                      <div>
                        <strong>Seamless Billing</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Charge to room or direct payment options
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-8 h-8 bg-brand-yellow text-gray-900 rounded-full flex items-center justify-center text-sm mr-3">4</span>
                      <div>
                        <strong>You Earn</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Monthly revenue share with detailed reporting
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'integration' && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h3 className="font-cormorant text-2xl mb-4 tracking-[0.1em]">SEAMLESS SYSTEM INTEGRATION</h3>
                  <p className="text-gray-600">
                    We integrate with all major hotel management systems
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <h4 className="font-medium mb-2">PMS INTEGRATION</h4>
                    <p className="text-sm text-gray-600">
                      Direct integration with Opera, Amadeus, and other systems
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h4 className="font-medium mb-2">BILLING OPTIONS</h4>
                    <p className="text-sm text-gray-600">
                      Room charge, corporate accounts, and direct payment
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="font-medium mb-2">REPORTING</h4>
                    <p className="text-sm text-gray-600">
                      Real-time analytics and monthly performance reports
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div>
                  <div className="text-brand-yellow mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-2">IN-ROOM DELIVERY</h4>
                  <p className="text-sm text-gray-600">
                    Premium spirits, wines, and champagnes delivered directly to guest rooms
                  </p>
                </div>
                <div>
                  <div className="text-brand-yellow mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-2">VIP PACKAGES</h4>
                  <p className="text-sm text-gray-600">
                    Curated welcome amenities and celebration packages
                  </p>
                </div>
                <div>
                  <div className="text-brand-yellow mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A2.704 2.704 0 003 15.546V5h18v10.546z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-2">EVENT CATERING</h4>
                  <p className="text-sm text-gray-600">
                    Full bar service for conferences, weddings, and special events
                  </p>
                </div>
                <div>
                  <div className="text-brand-yellow mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-2">MINIBAR PROGRAMS</h4>
                  <p className="text-sm text-gray-600">
                    Automated restocking and inventory management
                  </p>
                </div>
                <div>
                  <div className="text-brand-yellow mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-2">STAFF TRAINING</h4>
                  <p className="text-sm text-gray-600">
                    Complimentary training for concierge and F&B teams
                  </p>
                </div>
                <div>
                  <div className="text-brand-yellow mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-2">EXPRESS SERVICE</h4>
                  <p className="text-sm text-gray-600">
                    30-minute delivery guarantee for guest satisfaction
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'technology' && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h3 className="font-cormorant text-2xl mb-4 tracking-[0.1em]">ADVANCED TECHNOLOGY PLATFORM</h3>
                  <p className="text-gray-600">
                    Purpose-built for hospitality operations
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h4 className="font-medium mb-4 tracking-[0.1em]">PARTNER PORTAL FEATURES</h4>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Real-time order tracking and management
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Guest preference tracking and analytics
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Automated inventory recommendations
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Revenue and performance dashboards
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Marketing campaign management
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4 tracking-[0.1em]">API CAPABILITIES</h4>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        RESTful API for system integration
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Webhook notifications for order updates
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Batch order processing capabilities
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        Custom catalog and pricing management
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-brand-yellow rounded-full mr-3"></span>
                        White-label ordering interfaces
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Case Study */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[500px]">
              <Image
                src="/images/gallery/sunset-champagne-pontoon.webp"
                alt="Hotel Success Story"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="text-sm tracking-[0.1em] mb-2">CASE STUDY</div>
                <h3 className="font-cormorant text-2xl">Four Seasons Austin</h3>
              </div>
            </div>
            
            <div>
              <span className="text-brand-yellow text-sm tracking-[0.1em]">SUCCESS STORY</span>
              <h2 className="font-cormorant text-4xl mt-2 mb-6 tracking-[0.1em]">
                How Four Seasons Austin Increased F&B Revenue by 40%
              </h2>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">THE CHALLENGE</h4>
                  <p className="text-gray-600">
                    Limited minibar options and slow room service were impacting guest satisfaction scores 
                    and missing revenue opportunities during peak occupancy periods.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">THE SOLUTION</h4>
                  <p className="text-gray-600">
                    Party On implemented a comprehensive beverage program including express in-room delivery, 
                    curated VIP packages, and integrated billing through their PMS system.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">THE RESULTS</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 40% increase in F&B revenue per occupied room</li>
                    <li>• 92% guest satisfaction rating for beverage services</li>
                    <li>• $75,000 additional monthly revenue</li>
                    <li>• 50% reduction in minibar operational costs</li>
                  </ul>
                </div>
              </div>
              
              <div className="border-l-4 border-brand-yellow pl-6">
                <p className="text-gray-700 italic mb-2">
                  &ldquo;Party On has transformed our beverage service. The integration is seamless, 
                  guests love the selection, and our F&B revenue has never been stronger.&rdquo;
                </p>
                <p className="text-sm text-gray-500">
                  — Michael Chen, Director of Operations
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Tiers */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="font-cormorant text-4xl mb-4 tracking-[0.1em]">
              PARTNERSHIP PROGRAMS
            </h2>
            <p className="text-gray-600">
              Flexible solutions scaled to your property size and needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="font-cormorant text-2xl mb-2 tracking-[0.1em]">SELECT</h3>
                <p className="text-gray-600 text-sm">For boutique properties</p>
              </div>
              <div className="text-center mb-6">
                <p className="text-4xl font-cormorant text-gray-900">15%</p>
                <p className="text-sm text-gray-600">Revenue Share</p>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Up to 100 rooms
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Standard product catalog
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic integration support
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Monthly reporting
                </li>
              </ul>
              <button className="w-full py-3 border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all text-sm tracking-[0.1em]">
                LEARN MORE
              </button>
            </div>

            <div className="bg-white border-2 border-brand-yellow p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-brand-yellow text-gray-900 px-4 py-1 text-xs tracking-[0.1em]">
                MOST POPULAR
              </div>
              <div className="text-center mb-6">
                <h3 className="font-cormorant text-2xl mb-2 tracking-[0.1em]">PREMIER</h3>
                <p className="text-gray-600 text-sm">For full-service hotels</p>
              </div>
              <div className="text-center mb-6">
                <p className="text-4xl font-cormorant text-gray-900">20%</p>
                <p className="text-sm text-gray-600">Revenue Share</p>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  100-300 rooms
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Premium catalog access
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full PMS integration
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Dedicated account manager
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Weekly analytics
                </li>
              </ul>
              <button className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors text-sm tracking-[0.1em]">
                GET STARTED
              </button>
            </div>

            <div className="bg-white border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="font-cormorant text-2xl mb-2 tracking-[0.1em]">LUXURY</h3>
                <p className="text-gray-600 text-sm">For resort properties</p>
              </div>
              <div className="text-center mb-6">
                <p className="text-4xl font-cormorant text-gray-900">25%</p>
                <p className="text-sm text-gray-600">Revenue Share</p>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  300+ rooms
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Exclusive selections
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom integration
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Executive partnership team
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Real-time dashboards
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-brand-yellow mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Co-marketing support
                </li>
              </ul>
              <button className="w-full py-3 border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-all text-sm tracking-[0.1em]">
                CONTACT SALES
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-12">
            <p className="text-sm text-gray-600 tracking-[0.1em]">TRUSTED BY AUSTIN&apos;S FINEST HOTELS</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center opacity-60">
            {['Four Seasons', 'W Austin', 'Fairmont', 'JW Marriott', 'The LINE'].map((hotel) => (
              <div key={hotel} className="text-center">
                <p className="font-cormorant text-xl text-gray-700">{hotel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Form */}
      <section id="partnership-form" className="py-20">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="font-cormorant text-4xl mb-4 tracking-[0.1em]">
              START YOUR PARTNERSHIP
            </h2>
            <p className="text-gray-600">
              Join Austin&apos;s premier hospitality beverage program
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name *</label>
                <input
                  type="text"
                  name="hotelName"
                  value={formData.hotelName}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Rooms *</label>
                <select
                  name="numberOfRooms"
                  value={formData.numberOfRooms}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                >
                  <option value="">Select range</option>
                  <option value="<50">Less than 50</option>
                  <option value="50-100">50-100</option>
                  <option value="100-200">100-200</option>
                  <option value="200-300">200-300</option>
                  <option value="300+">300+</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title/Position</label>
                <input
                  type="text"
                  name="title"
                  className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Services of Interest</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['In-Room Delivery', 'Minibar Program', 'Event Services', 'VIP Packages', 'Staff Training', 'Pool Service'].map((service) => (
                  <label key={service} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.interests.includes(service)}
                      onChange={() => handleInterestToggle(service)}
                      className="mr-2 text-brand-yellow focus:ring-yellow-500"
                    />
                    <span className="text-sm">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Beverage Provider (if any)
              </label>
              <input
                type="text"
                name="currentProvider"
                value={formData.currentProvider}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Monthly Beverage Volume
              </label>
              <select
                name="monthlyVolume"
                value={formData.monthlyVolume}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
              >
                <option value="">Select range</option>
                <option value="<10k">Less than $10,000</option>
                <option value="10-25k">$10,000 - $25,000</option>
                <option value="25-50k">$25,000 - $50,000</option>
                <option value="50-100k">$50,000 - $100,000</option>
                <option value="100k+">$100,000+</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT PARTNERSHIP INQUIRY'}
              </button>
              <button
                type="button"
                className="px-8 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors tracking-[0.1em]"
              >
                SCHEDULE A CALL
              </button>
            </div>
          </form>
          
          {submitMessage && (
            <div className={`mt-6 p-4 border ${submitMessage.includes('Thank you') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {submitMessage}
            </div>
          )}

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Or contact our hospitality team directly at{' '}
              <a href="tel:512-555-0100" className="text-brand-yellow hover:text-yellow-600">
                (512) 555-0100
              </a>
              {' '}or{' '}
              <a href="mailto:info@partyondelivery.com" className="text-brand-yellow hover:text-yellow-600">
                info@partyondelivery.com
              </a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
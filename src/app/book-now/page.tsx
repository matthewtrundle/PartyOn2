'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Section from '@/components/Section'
import VideoHero from '@/components/VideoHero'

export default function BookNowPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('delivery')
  const [formData, setFormData] = useState({
    service: '',
    package: '',
    date: '',
    time: '',
    guests: '',
    location: '',
    name: '',
    email: '',
    phone: '',
    notes: ''
  })

  useEffect(() => {
    const service = searchParams.get('service')
    const packageType = searchParams.get('package')
    
    if (service === 'wedding' || service === 'boat' || service === 'bach-party') {
      setActiveTab('event')
      setFormData(prev => ({ ...prev, service }))
    }
    if (packageType) {
      setFormData(prev => ({ ...prev, package: packageType }))
    }
  }, [searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    // Integration with Shopify Storefront API would go here
  }

  return (
    <>
      {/* Epic Video Hero */}
      <VideoHero
        title="Book Your Party On Experience"
        subtitle="Let&apos;s Make It Legendary"
        description="Fast delivery or full-service events - we&apos;ve got you covered"
        videoSrc="/videos/backgrounds/upscale-bachelorette.mp4"
        fallbackImage="/images/hero/neon-nights-hero.jpg"
        height="medium"
      />

      {/* Booking Form */}
      <Section>
        <div className="max-w-4xl mx-auto">
          {/* Tab Switcher */}
          <div className="flex border-b border-neutral-200 mb-8">
            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex-1 py-4 text-center font-sans font-medium transition-all duration-300 ${
                activeTab === 'delivery'
                  ? 'text-gold-500 border-b-2 border-gold-500'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Fast Delivery
            </button>
            <button
              onClick={() => setActiveTab('event')}
              className={`flex-1 py-4 text-center font-sans font-medium transition-all duration-300 ${
                activeTab === 'event'
                  ? 'text-gold-500 border-b-2 border-gold-500'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Event Service
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'delivery' ? (
              <>
                {/* Fast Delivery Form */}
                <div className="bg-neutral-50 p-8 rounded-2xl">
                  <h2 className="font-serif text-2xl text-navy-500 mb-6">
                    Quick Order Details
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Delivery Address
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="123 Main St, Austin, TX"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Delivery Time
                      </label>
                      <select
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select time</option>
                        <option value="asap">ASAP (30 min)</option>
                        <option value="1hour">Within 1 hour</option>
                        <option value="2hours">Within 2 hours</option>
                        <option value="scheduled">Schedule for later</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 p-6 bg-gold-50 rounded-lg">
                    <p className="font-sans text-sm text-neutral-600 mb-4">
                      <strong>Next Step:</strong> After confirming delivery details, you'll be redirected 
                      to browse our product catalog and complete your order.
                    </p>
                    <p className="font-sans text-xs text-neutral-500">
                      Powered by Shopify checkout for secure payment processing
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Event Service Form */}
                <div className="bg-neutral-50 p-8 rounded-2xl">
                  <h2 className="font-serif text-2xl text-navy-500 mb-6">
                    Event Details
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Service Type
                      </label>
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select service</option>
                        <option value="wedding">Wedding Bar Service</option>
                        <option value="boat">Boat Party Package</option>
                        <option value="bach-party">Bachelor/ette Party</option>
                        <option value="corporate">Corporate Event</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Package
                      </label>
                      <select
                        name="package"
                        value={formData.package}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select package</option>
                        <option value="basic">Basic Package</option>
                        <option value="premium">Premium Package</option>
                        <option value="ultimate">Ultimate Package</option>
                        <option value="custom">Custom Quote</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Event Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Number of Guests
                      </label>
                      <input
                        type="number"
                        name="guests"
                        value={formData.guests}
                        onChange={handleInputChange}
                        placeholder="50"
                        min="1"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Venue/Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Venue name or address"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Contact Information */}
            <div className="bg-neutral-50 p-8 rounded-2xl">
              <h2 className="font-serif text-2xl text-navy-500 mb-6">
                Contact Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(512) 555-0123"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Tell us about any special requirements..."
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                className="btn-primary px-12 py-4 text-lg"
              >
                {activeTab === 'delivery' ? &apos;Continue to Products&apos; : &apos;Request Quote&apos;}
              </button>
              <p className="mt-4 text-sm text-neutral-600">
                {activeTab === 'delivery' 
                  ? &apos;You&apos;ll be able to browse and add products on the next page&apos;
                  : 'We\'ll contact you within 2 hours with a custom quote'
                }
              </p>
            </div>
          </form>
        </div>
      </Section>

      {/* Trust Section */}
      <section className="section-padding bg-gradient-to-br from-gold-50 to-austin-sunset/10">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl text-navy-500 mb-4">
              Why Austin Trusts Party On
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gold-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">Secure Checkout</h3>
              <p className="font-sans text-sm text-neutral-600">
                Powered by Shopify for safe, encrypted payments
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gold-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">Licensed & Insured</h3>
              <p className="font-sans text-sm text-neutral-600">
                TABC certified with $2M liability coverage
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gold-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">24/7 Support</h3>
              <p className="font-sans text-sm text-neutral-600">
                Real humans ready to help with your order
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
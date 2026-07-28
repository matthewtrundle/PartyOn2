'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import Footer from '@/components/Footer';
import { useCartContext } from '@/contexts/CartContext';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

export default function PropertyManagementPartnerPage() {
  const { cart } = useCartContext();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleQuickAdd = async (productId: string, productTitle: string) => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    console.log(`Adding ${productTitle} to cart`);
  };

  const amenities = [
    {
      title: 'Resident Welcome Packages',
      description: 'Premium spirits for new move-ins',
      image: '/images/products/branded-delivery-bag.webp',
      products: [
        { id: '1', title: 'Luxury Welcome Box', price: '$199', description: 'Wine, champagne & treats' },
        { id: '2', title: 'Texas Spirit Selection', price: '$149', description: 'Local favorites' },
        { id: '3', title: 'Premium Bar Starter', price: '$299', description: 'Complete bar setup' }
      ]
    },
    {
      title: 'Resident Events',
      description: 'Elevate your community gatherings',
      image: '/images/products/delivery-bag-contents.webp',
      products: [
        { id: '4', title: 'Pool Party Package', price: '$599', description: 'For 50 residents' },
        { id: '5', title: 'Wine Tasting Event', price: '$799', description: '12 wines, 30 guests' },
        { id: '6', title: 'Holiday Mixer', price: '$999', description: 'Full bar for 75' }
      ]
    },
    {
      title: 'Concierge Service',
      description: 'On-demand delivery for residents',
      image: '/images/products/premium-spirits-lifestyle.webp',
      products: [
        { id: '7', title: 'Express Delivery', price: 'Varies', description: '3-hour service' },
        { id: '8', title: 'Scheduled Delivery', price: 'Varies', description: '72-hour advance' },
        { id: '9', title: 'Event Planning', price: 'Custom', description: 'Full service support' }
      ]
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Minimal branded header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Partner Logo */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-heading text-xl tracking-wide">Luxury Living Austin</h1>
                  <p className="text-xs text-gray-500">Premium Property Management</p>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Powered by</span>
                <Link href="/" className="font-heading text-lg text-brand-yellow hover:text-yellow-600 transition-colors">
                  Party On Delivery
                </Link>
              </div>
            </div>

            {/* Cart button */}
            <Link
              href="/checkout"
              className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">Cart ({cart?.totalQuantity || 0})</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/backgrounds/rooftop-terrace-elegant-2.webp"
          alt="Luxury Property Management"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />

        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">

          <h1 className="font-heading font-light text-4xl md:text-6xl mb-4 tracking-[0.1em]">
            Elevate Your Resident Experience
          </h1>
          <p className="text-lg font-light tracking-wide text-gray-200 mb-8">
            Premium alcohol delivery and concierge services for Austin&apos;s finest properties
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="#amenities"
              className="px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-all duration-300 tracking-wider"
            >
              VIEW AMENITIES
            </Link>
            <Link
              href="/order"
              className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white border border-white/30 hover:bg-white/20 transition-all duration-300 tracking-wider"
            >
              SHOP ALL PRODUCTS
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">White-Label Service</h3>
              <p className="text-sm text-gray-600">Your brand, our infrastructure</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Revenue Share</h3>
              <p className="text-sm text-gray-600">Revenue share on resident orders</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Fully Licensed</h3>
              <p className="text-sm text-gray-600">TABC compliant delivery</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h5.015c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h5.014a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Increase NOI</h3>
              <p className="text-sm text-gray-600">Premium amenity justifies higher rents</p>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section id="amenities" className="py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-wide">
              Premium Amenities for Your Residents
            </h2>
            <p className="text-lg text-gray-600">
              Stand out in Austin&apos;s competitive rental market
            </p>
          </div>

          <div className="space-y-16">
            {amenities.map((amenity, index) => (
              <ScrollRevealCSS key={amenity.title} duration={800} delay={(index % 8) * 100} y={30}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Image */}
                  <div className={`relative h-[400px] ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Image
                    src={amenity.image}
                    alt={amenity.title}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>

                {/* Content */}
                <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <h3 className="font-heading text-2xl md:text-3xl mb-3 text-gray-900">{amenity.title}</h3>
                  <p className="text-gray-600 mb-6">{amenity.description}</p>

                  {/* Product Grid */}
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {amenity.products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-medium text-gray-900">{product.title}</h4>
                          <p className="text-sm text-gray-600">{product.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-heading text-lg text-gray-900">{product.price}</span>
                          <button
                            onClick={() => handleQuickAdd(product.id, product.title)}
                            className="px-4 py-2 bg-brand-yellow text-gray-900 text-sm hover:bg-yellow-600 transition-colors rounded"
                          >
                            INQUIRE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/order"
                    className="inline-flex items-center gap-2 text-brand-yellow hover:text-yellow-600 font-medium"
                  >
                    View Full Catalog
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                </div>
              </ScrollRevealCSS>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-6">
                Why Partner with Party On
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Competitive Advantage</h3>
                    <p className="text-gray-600">Unique amenity that attracts premium renters</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Increase Property Value</h3>
                    <p className="text-gray-600">Premium services justify 5-10% higher rents</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Zero Operational Burden</h3>
                    <p className="text-gray-600">We handle everything from ordering to delivery</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-brand-yellow mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Monthly Revenue Share</h3>
                    <p className="text-gray-600">Revenue share on all resident orders</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="font-heading text-2xl text-gray-900 mb-6">Partner Success Metrics</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Average Monthly Orders</span>
                    <span className="font-heading text-2xl text-gray-900">127</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-brand-yellow h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Commission</span>
                    <span className="font-heading text-2xl text-brand-yellow">$3,175</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resident Satisfaction</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-brand-yellow fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">5.0/5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-yellow-50 to-yellow-100">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4">
            Ready to Elevate Your Properties?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join Austin&apos;s leading property management companies offering premium amenities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-wider font-medium"
            >
              BECOME A PARTNER
            </Link>
            <Link
              href="/partners"
              className="px-8 py-4 bg-white text-brand-yellow border-2 border-brand-yellow hover:bg-yellow-50 transition-colors tracking-wider font-medium"
            >
              VIEW ALL PARTNERSHIPS
            </Link>
          </div>
        </div>
      </section>

      {/* Success notification */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Inquiry submitted! We&apos;ll contact you soon.
        </div>
      )}

      <Footer />
    </div>
  );
}
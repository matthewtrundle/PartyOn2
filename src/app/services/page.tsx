'use client';

import React from 'react';
import Link from 'next/link';
import Navigation from "@/components/Navigation";

export default function ServicesPage() {
  const services = [
    {
      title: 'Weddings',
      description: 'Premium bar service for your special day',
      href: '/weddings',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" 
          />
        </svg>
      )
    },
    {
      title: 'Corporate Events',
      description: 'Professional service for business gatherings',
      href: '/austin-corporate-event-delivery',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
          />
        </svg>
      )
    },
    {
      title: 'Bachelorette Parties',
      description: 'Celebrate in style with premium drinks',
      href: '/bach-parties',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      )
    },
    {
      title: 'Boat Parties',
      description: 'Lake Austin celebrations with cold drinks',
      href: '/boat-parties',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
            d="M3 10h18M7 15h1m4 0h1m-7 4h14l1-7H3l1 7zm5-12V3m0 0l3 3m-3-3L9 6" 
          />
        </svg>
      )
    },
    {
      title: 'Express Delivery',
      description: '3-hour delivery for last-minute needs',
      href: '/fast-delivery',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
            d="M13 10V3L4 14h7v7l9-11h-7z" 
          />
        </svg>
      )
    },
    {
      title: 'Group Orders',
      description: 'Split the bill with friends',
      href: '/group',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
          />
        </svg>
      )
    }
  ];

  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[40vh] pt-32 md:pt-24 bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="font-heading text-5xl md:text-7xl tracking-[0.08em] mb-4">SERVICES</h1>
          <p className="text-xl tracking-[0.1em] text-brand-yellow">Premium Alcohol Delivery & Event Solutions</p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link 
                key={service.href}
                href={service.href}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-brand-yellow hover:shadow-lg transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-brand-yellow group-hover:text-yellow-600 transition-colors">
                    {service.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.05em] group-hover:text-brand-yellow transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-yellow-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
            Need Something Special?
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Contact us for custom packages and special event pricing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/order">
              <button className="px-8 py-3 bg-brand-yellow text-gray-900 tracking-[0.1em] hover:bg-yellow-600 transition-colors">
                BOOK NOW
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-8 py-3 border-2 border-brand-yellow text-brand-yellow tracking-[0.1em] hover:bg-brand-yellow hover:text-gray-900 transition-colors">
                CONTACT US
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
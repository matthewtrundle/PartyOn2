
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navigation from "@/components/Navigation"
import { seoConfig } from '@/lib/seo/config'

// Location data for Austin neighborhoods
const locations: Record<string, {
  name: string
  title: string
  description: string
  neighborhoods: string[]
  zipCodes: string[]
  deliveryFee: number
  minimum: number
  popularVenues?: string[]
}> = {
  'downtown-austin': {
    name: 'Downtown Austin',
    title: 'Alcohol Delivery Downtown Austin',
    description: 'Premium alcohol delivery service to downtown Austin hotels, condos, and event venues. Fast, reliable service to the heart of the city.',
    neighborhoods: ['Downtown', 'Rainey Street', '2nd Street District', 'Warehouse District', 'Red River'],
    zipCodes: ['78701', '78702', '78703'],
    deliveryFee: 15,
    minimum: 100,
    popularVenues: ['Austin Convention Center', 'Fairmont Austin', 'JW Marriott', 'The Driskill']
  },
  'lake-travis': {
    name: 'Lake Travis',
    title: 'Lake Travis Boat & Marina Delivery',
    description: 'Specialized alcohol delivery to Lake Travis marinas, boats, and waterfront properties. Perfect for boat parties and lake house celebrations.',
    neighborhoods: ['Lakeway', 'The Hills', 'Spanish Oaks', 'Steiner Ranch'],
    zipCodes: ['78734', '78738', '78669', '78732'],
    deliveryFee: 35,
    minimum: 150,
    popularVenues: ['Lake Travis Marina', 'Volente Beach', 'The Oasis', 'Emerald Point Marina']
  },
  'west-austin': {
    name: 'West Austin',
    title: 'West Austin & Westlake Alcohol Delivery',
    description: 'Luxury alcohol delivery to West Austin and Westlake Hills. Serving upscale neighborhoods with premium spirits and wines.',
    neighborhoods: ['Westlake Hills', 'Tarrytown', 'West Lake Hills', 'Rollingwood'],
    zipCodes: ['78746', '78733', '78703', '78731'],
    deliveryFee: 30,
    minimum: 150,
    popularVenues: ['Austin Country Club', 'Westwood Country Club', 'The Hills Country Club']
  },
  'south-austin': {
    name: 'South Austin',
    title: 'South Austin Alcohol Delivery Service',
    description: 'Fast alcohol delivery to South Austin neighborhoods. From SoCo to Circle C, we\'ve got your party covered.',
    neighborhoods: ['South Lamar', 'South Congress', 'Zilker', 'Travis Heights', 'Circle C'],
    zipCodes: ['78704', '78745', '78748', '78749'],
    deliveryFee: 20,
    minimum: 100
  },
  'east-austin': {
    name: 'East Austin',
    title: 'East Austin Craft Beer & Spirit Delivery',
    description: 'Trendy alcohol delivery to East Austin. Craft cocktails, local beers, and premium spirits delivered to your door.',
    neighborhoods: ['East Cesar Chavez', 'Holly', 'Mueller', 'Cherrywood'],
    zipCodes: ['78702', '78721', '78722', '78723'],
    deliveryFee: 15,
    minimum: 100
  },
  'north-austin': {
    name: 'North Austin',
    title: 'North Austin & Domain Alcohol Delivery',
    description: 'Reliable alcohol delivery to North Austin and The Domain area. Perfect for corporate events and apartment celebrations.',
    neighborhoods: ['The Domain', 'Great Hills', 'Arboretum', 'North Loop'],
    zipCodes: ['78758', '78759', '78750', '78757'],
    deliveryFee: 30,
    minimum: 100,
    popularVenues: ['The Domain', 'Arboretum', 'Top Golf']
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ location: string }> }
): Promise<Metadata> {
  const { location } = await params
  const data = locations[location]
  const canonical = `${seoConfig.siteUrl}/delivery/${location}`

  if (!data) {
    return {
      alternates: { canonical },
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `${data.title} | Party On Delivery`,
    description: data.description,
    alternates: { canonical },
    openGraph: {
      title: data.title,
      description: data.description,
      url: canonical,
      type: 'website',
    },
  }
}

export default async function LocationDeliveryPage({ params }: { params: Promise<{ location: string }> }) {
  const resolvedParams = await params
  const locationData = locations[resolvedParams.location]
  
  if (!locationData) {
    notFound()
  }

  return (
    <div className="bg-white min-h-screen">
      <Navigation forceScrolled={true} />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] mt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/services/corporate/penthouse-suite-setup.webp"
          alt={`${locationData.name} Alcohol Delivery`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />
        
        <div className="relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-4xl md:text-6xl mb-6 tracking-[0.08em]">
            {locationData.title.toUpperCase()}
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg font-light tracking-[0.1em] text-gray-200 max-w-2xl mx-auto">
            {locationData.description}
          </p>
        </div>
      </section>

      {/* Service Details */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Delivery Info */}
            <div>
              <h2 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                DELIVERY INFORMATION
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900 font-medium">${locationData.deliveryFee}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Minimum Order</span>
                  <span className="text-gray-900 font-medium">${locationData.minimum}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Delivery Time</span>
                  <span className="text-gray-900 font-medium">72-hour advance notice</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Express Available</span>
                  <span className="text-gray-900 font-medium">3-hour delivery ($50+ orders)</span>
                </div>
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <h2 className="font-heading text-3xl text-gray-900 mb-6 tracking-[0.1em]">
                NEIGHBORHOODS WE SERVE
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {locationData.neighborhoods.map((neighborhood) => (
                  <div key={neighborhood} className="flex items-center">
                    <svg className="w-4 h-4 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{neighborhood}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">ZIP Codes:</p>
                <p className="text-gray-700">{locationData.zipCodes.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Venues (if applicable) */}
      {locationData.popularVenues && (
        <section className="py-16 px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl text-gray-900 mb-4 tracking-[0.1em]">
                POPULAR VENUES WE SERVE
              </h2>
              <div className="w-16 h-px bg-brand-yellow mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {locationData.popularVenues.map((venue) => (
                <div
                  key={venue}
                  className="bg-white p-6 text-center border border-gray-200"
                >
                  <svg className="w-8 h-8 text-yellow-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-gray-900 font-medium">{venue}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services Grid */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl text-gray-900 mb-4 tracking-[0.1em]">
              PERFECT FOR EVERY OCCASION
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Corporate Events',
                description: 'Impress clients with premium bar service',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                )
              },
              {
                title: 'Private Parties',
                description: 'Elevate your home celebrations',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                )
              },
              {
                title: 'Special Events',
                description: 'Weddings, birthdays, and more',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                )
              }
            ].map((service) => (
              <div
                key={service.title}
                className="text-center"
              >
                <svg className="w-12 h-12 text-brand-yellow mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {service.icon}
                </svg>
                <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">
                  {service.title}
                </h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <div>
            <h2 className="font-heading text-3xl mb-4 tracking-[0.1em]">
              READY TO ORDER?
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Premium alcohol delivery to {locationData.name} in 72 hours or less
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/order">
                <button className="px-8 py-3 bg-yellow-500 text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.08em]">
                  ORDER NOW
                </button>
              </Link>
              <Link href="/contact">
                <button className="px-8 py-3 border border-white text-white hover:bg-white hover:text-gray-900 transition-all tracking-[0.08em]">
                  GET A QUOTE
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
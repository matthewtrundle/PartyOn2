'use client'

import { useState } from 'react'
import Hero from '@/components/Hero'
import VideoHero from '@/components/VideoHero'
import ServiceCard from '@/components/ServiceCard'
import CTA from '@/components/CTA'
import Section from '@/components/Section'
import AIConcierge from '@/components/AIConcierge'
import ExperienceSelector from '@/components/ExperienceSelector'

type BoatMode = 'chill' | 'wild' | 'luxury'

export default function BoatPartiesPage() {
  const [mode, setMode] = useState<BoatMode>('chill')
  const [isAnimating, setIsAnimating] = useState(false)

  const modeConfigs = {
    chill: {
      title: "Lake Travis Luxury Delivered",
      subtitle: "Premium Bar Service for Your Nautical Adventure",
      description: "From sunset cruises to all-day regattas, we bring the party to your boat with style and sophistication.",
      backgroundImage: "/images/hero/lake-life-hero.jpg",
      theme: "chill"
    },
    wild: {
      title: "LAKE TRAVIS MAYHEM",
      subtitle: "WHERE BOAT PARTIES GET ABSOLUTELY WILD",
      description: "Ready to turn Lake Travis upside down? We bring the CHAOS to your floating party palace!",
      backgroundImage: "/images/hero/lake-travis-sunset.jpg",
      theme: "wild"
    },
    luxury: {
      title: "Ultra-Luxury Yacht Experience",
      subtitle: "Where Elegance Meets the Open Water",
      description: "Experience the pinnacle of nautical luxury with our exclusive yacht service. Every detail crafted for discerning captains.",
      backgroundImage: "/images/services/boat-parties/luxury-yacht-deck.png",
      theme: "luxury"
    }
  }

  const currentConfig = modeConfigs[mode]

  const handleModeChange = (newMode: BoatMode) => {
    if (newMode === mode) return
    setIsAnimating(true)
    setTimeout(() => {
      setMode(newMode)
      setIsAnimating(false)
    }, 300)
  }
  const getBoatPackages = () => {
    if (mode === 'wild') {
      return [
        {
          title: "COVE CHAOS",
          description: "Turn Devil's Cove into your personal MAYHEM zone! Wild floating bar service for the CRAZIEST boat parties!",
          image: "/images/services/boat-parties/luxury-yacht-deck.png",
          features: [
            "WILD floating bar setup",
            "Party shots & beer bongs",
            "Coolers packed with CHAOS",
            "Raft-up party coordination",
            "All-day MADNESS service"
          ],
          price: "$699",
          link: "/book-now?package=cove-chaos",
          featured: true
        },
        {
          title: "REGATTA RAMPAGE",
          description: "Multi-boat MAYHEM! Coordinate the wildest fleet party Lake Travis has ever seen!",
          image: "/images/gallery/sunset-champagne-pontoon.png",
          features: [
            "Fleet-wide party coordination",
            "Multiple floating bars",
            "EPIC water activities",
            "All-day WILD service",
            "Zero chill, maximum thrill"
          ],
          price: "$2,199",
          link: "/book-now?package=regatta-rampage"
        }
      ]
    } else if (mode === 'luxury') {
      return [
        {
          title: "Yacht Concierge",
          description: "Ultimate luxury yacht experience with personal concierge service and premium everything.",
          image: "/images/services/boat-parties/luxury-yacht-deck.png",
          features: [
            "Personal yacht concierge",
            "Dom Pérignon & rare spirits",
            "White-glove onboard service",
            "Crystal glassware collection",
            "8-hour luxury experience"
          ],
          price: "$4,999",
          link: "/book-now?package=yacht-concierge",
          featured: true
        },
        {
          title: "Elite Marina Service",
          description: "Exclusive marina-to-yacht service with premium amenities and professional crew.",
          image: "/images/services/boat-parties/captains-cooler.png",
          features: [
            "Master sommelier service",
            "Premium marina coordination",
            "Elite bartender team",
            "Luxury amenity package",
            "6-hour elite service"
          ],
          price: "$2,999",
          link: "/book-now?package=elite-marina"
        }
      ]
    } else {
      return [
    {
      title: "Sunset Cruise",
      description: "Perfect for intimate gatherings. Premium coolers delivered dockside with craft cocktails and local favorites.",
      image: "/images/hero/lake-life-hero.jpg",
      features: [
        "2-4 hour cruise package",
        "Premium cooler setup",
        "Craft cocktails & mixers",
        "Ice delivery included",
        "Dock or water delivery"
      ],
      price: "$399",
      link: "/book-now?package=sunset-cruise"
    },
    {
      title: "Lake Life Luxury",
      description: "The ultimate Lake Travis experience. Full bar service on your vessel with professional bartender.",
      image: "/images/services/boat-parties/luxury-yacht-deck.png",
      features: [
        "Professional bartender onboard",
        "Full premium bar setup",
        "Custom cocktail menu",
        "4-6 hour service",
        "Safety-certified staff"
      ],
      price: "$899",
      link: "/book-now?package=lake-luxury",
      featured: true
    },
    {
      title: "Regatta Ready",
      description: "For multi-boat parties and lake events. Coordinated delivery to multiple vessels with VIP service.",
      image: "/images/services/boat-parties/multiple-boats-party.png", // TODO: Add image
      features: [
        "Multi-boat coordination",
        "Floating bar service",
        "Event planning assistance",
        "6-8 hour service",
        "Party supplies included"
      ],
      price: "$1,599",
      link: "/book-now?package=regatta"
    }
  ]
    }
  }

  const marinas = [
    { name: "Lakeway Marina", feature: "Full-service dock delivery" },
    { name: "Volente Beach", feature: "Water & beach service" },
    { name: "Hudson Bend", feature: "Cove party specialists" },
    { name: "Mansfield Dam", feature: "Quick access delivery" },
    { name: "Point Venture", feature: "Private dock service" },
    { name: "The Oasis", feature: "Restaurant coordination" }
  ]

  const getModeStyles = () => {
    if (mode === 'wild') {
      return {
        container: "bg-gradient-to-br from-blue-900 via-purple-900 to-teal-900",
        text: "text-cyan-400",
        accent: "text-blue-400",
        button: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
        card: "bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30"
      }
    } else if (mode === 'luxury') {
      return {
        container: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
        text: "text-slate-700",
        accent: "text-blue-600",
        button: "bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700",
        card: "bg-gradient-to-br from-slate-50/80 to-blue-50/80 border-slate-200"
      }
    } else {
      return {
        container: "bg-gradient-to-br from-austin-lake/10 to-navy-50",
        text: "text-navy-500",
        accent: "text-austin-lake",
        button: "bg-gradient-to-r from-austin-lake to-navy-500 hover:from-austin-lake/90 hover:to-navy-600",
        card: "bg-white border-austin-lake/20"
      }
    }
  }

  const styles = getModeStyles()

  return (
    <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['chill', 'wild', 'luxury'] as const}
        currentMode={mode}
        onModeChange={handleModeChange}
        modeLabels={{
          chill: 'Chill',
          wild: 'Wild',
          luxury: 'Luxury'
        }}
        modeColors={{
          chill: 'bg-gradient-to-r from-austin-lake to-teal-500',
          wild: 'bg-gradient-to-r from-blue-600 to-cyan-600',
          luxury: 'bg-gradient-to-r from-slate-600 to-gray-700'
        }}
        label="BOAT VIBE"
      />
      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={mode === 'luxury' ? "/videos/hero/luxury-yacht.mp4" : mode === 'wild' ? "/videos/backgrounds/boat-cooler.mp4" : "/videos/hero/lake-travis-aerial.mp4"}
        fallbackImage={currentConfig.backgroundImage}
        ctaText="Book Boat Service"
        ctaLink="/book-now"
        height="tall"
      />

      {/* Experience Section */}
      <Section className={styles.container}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className={`font-serif text-5xl ${styles.text}`}>
              {mode === 'wild' ? 'CHAOS ON THE WATER' : 
               mode === 'luxury' ? 'Unparalleled Nautical Luxury' : 
               'The Ultimate Lake Travis Experience'}
            </h2>
            <p className={`font-sans text-xl leading-relaxed ${
              mode === 'wild' ? 'text-cyan-300' : 
              mode === 'luxury' ? 'text-slate-600' : 
              'text-neutral-600'
            }`}>
              {mode === 'wild' 
                ? 'Ready to make waves? We turn your boat into a FLOATING PARTY MACHINE! Devil\'s Cove won\'t know what hit it when we bring the MAYHEM to your vessel!'
                : mode === 'luxury'
                ? 'Experience the epitome of nautical sophistication. Our exclusive yacht service transforms your vessel into a floating palace of luxury and refinement.'
                : 'Whether you\'re anchoring at Devil\'s Cove or cruising to The Oasis, Party On Delivery transforms your boat into a floating paradise. Our marine-certified staff understand the unique demands of on-water service.'
              }
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mode === 'wild' ? 'bg-cyan-500/20' : 
                  mode === 'luxury' ? 'bg-slate-500/20' : 
                  'bg-austin-lake/20'
                }`}>
                  <svg className={`w-6 h-6 ${styles.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`font-sans font-bold ${styles.text}`}>
                  {mode === 'wild' ? 'LIGHTNING DELIVERY' : 
                   mode === 'luxury' ? 'Concierge Timing' : 
                   'On-Time Delivery'}
                </h3>
                <p className={`font-sans text-sm ${
                  mode === 'wild' ? 'text-cyan-300' : 
                  mode === 'luxury' ? 'text-slate-600' : 
                  'text-neutral-600'
                }`}>
                  {mode === 'wild' 
                    ? 'FAST delivery to fuel your CHAOS!' 
                    : mode === 'luxury'
                    ? 'Perfectly timed luxury service delivery'
                    : 'GPS-tracked delivery direct to your dock or anchorage'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mode === 'wild' ? 'bg-cyan-500/20' : 
                  mode === 'luxury' ? 'bg-slate-500/20' : 
                  'bg-austin-lake/20'
                }`}>
                  <svg className={`w-6 h-6 ${styles.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className={`font-sans font-bold ${styles.text}`}>
                  {mode === 'wild' ? 'CHAOS CERTIFIED' : 
                   mode === 'luxury' ? 'White-Glove Certified' : 
                   'Marine Certified'}
                </h3>
                <p className={`font-sans text-sm ${
                  mode === 'wild' ? 'text-cyan-300' : 
                  mode === 'luxury' ? 'text-slate-600' : 
                  'text-neutral-600'
                }`}>
                  {mode === 'wild' 
                    ? 'Staff trained in MAXIMUM party delivery!' 
                    : mode === 'luxury'
                    ? 'Elite crew trained in luxury yacht protocols'
                    : 'Staff trained in boat safety and water service protocols'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mode === 'wild' ? 'bg-cyan-500/20' : 
                  mode === 'luxury' ? 'bg-slate-500/20' : 
                  'bg-austin-lake/20'
                }`}>
                  <svg className={`w-6 h-6 ${styles.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className={`font-sans font-bold ${styles.text}`}>
                  {mode === 'wild' ? 'MAXIMUM CHAOS' : 
                   mode === 'luxury' ? 'Ultra-Premium Quality' : 
                   'Premium Quality'}
                </h3>
                <p className={`font-sans text-sm ${
                  mode === 'wild' ? 'text-cyan-300' : 
                  mode === 'luxury' ? 'text-slate-600' : 
                  'text-neutral-600'
                }`}>
                  {mode === 'wild' 
                    ? 'Party supplies designed for EPIC mayhem!' 
                    : mode === 'luxury'
                    ? 'Rare spirits and crystal glassware for discerning tastes'
                    : 'Marine-grade coolers with premium spirits and local craft beers'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mode === 'wild' ? 'bg-cyan-500/20' : 
                  mode === 'luxury' ? 'bg-slate-500/20' : 
                  'bg-austin-lake/20'
                }`}>
                  <svg className={`w-6 h-6 ${styles.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className={`font-sans font-bold ${styles.text}`}>
                  {mode === 'wild' ? 'LEGEND SERVICE' : 
                   mode === 'luxury' ? 'Concierge Service' : 
                   'Expert Service'}
                </h3>
                <p className={`font-sans text-sm ${
                  mode === 'wild' ? 'text-cyan-300' : 
                  mode === 'luxury' ? 'text-slate-600' : 
                  'text-neutral-600'
                }`}>
                  {mode === 'wild' 
                    ? 'Bartenders who bring the ENERGY and CHAOS!' 
                    : mode === 'luxury'
                    ? 'Master sommelier and elite bartender team'
                    : 'Professional bartenders available for onboard service'
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="/images/services/boat-parties/captains-cooler.png"
              alt="Onboard bar service"
              className="rounded-lg shadow-premium"
            />
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-lg shadow-lg">
              <p className="font-display text-4xl text-gold-500">1000+</p>
              <p className="font-sans text-sm text-neutral-600">Boats Served</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Gallery Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <img
                src="/images/gallery/sunset-champagne-pontoon.png"
                alt="Sunset boat party"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="space-y-4">
              <img
                src="/images/services/boat-parties/captains-cooler.png"
                alt="Dock delivery"
                className="w-full h-48 object-cover rounded-lg"
              />
              <img
                src="/images/gallery/sunset-champagne-pontoon.png"
                alt="Friends toasting"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <Section className={mode === 'wild' ? 'bg-black' : mode === 'luxury' ? 'bg-slate-50' : 'bg-neutral-50'}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`font-serif text-4xl md:text-5xl mb-4 ${styles.text}`}>
            {mode === 'wild' ? 'UNLEASH THE CHAOS' : 
             mode === 'luxury' ? 'Exclusive Yacht Packages' : 
             'Choose Your Lake Adventure'}
          </h2>
          <p className={`font-sans text-lg ${
            mode === 'wild' ? 'text-cyan-300' : 
            mode === 'luxury' ? 'text-slate-600' : 
            'text-neutral-600'
          }`}>
            {mode === 'wild' 
              ? 'Turn Lake Travis into your personal MAYHEM zone!'
              : mode === 'luxury'
              ? 'Luxury experiences for the most discerning yacht owners'
              : 'From casual cruises to all-day celebrations, we have the perfect package'
            }
          </p>
        </div>

        <div className={`grid gap-8 ${
          mode === 'wild' || mode === 'luxury' ? 'grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-3'
        }`}>
          {getBoatPackages().map((pkg, index) => (
            <div key={pkg.title} className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ServiceCard {...pkg} />
            </div>
          ))}
        </div>
      </Section>

      {/* Lake Travis Guide */}
      <section className="section-padding bg-gradient-to-br from-austin-sunset/5 to-austin-lake/5">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
              Your Lake Travis Party Guide
            </h2>
            <p className="font-sans text-lg text-neutral-600">
              Local expertise for unforgettable lake days
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="card">
              <h3 className="font-serif text-2xl text-navy-500 mb-4">Popular Party Coves</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-austin-lake mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Devil's Cove</p>
                    <p className="font-sans text-sm text-neutral-600">The ultimate party destination</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-austin-lake mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Hippie Hollow</p>
                    <p className="font-sans text-sm text-neutral-600">Clothing-optional party spot</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-austin-lake mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Point Venture</p>
                    <p className="font-sans text-sm text-neutral-600">Family-friendly waters</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="font-serif text-2xl text-navy-500 mb-4">Safety First</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Designated Captain</p>
                    <p className="font-sans text-sm text-neutral-600">We support responsible boating</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Life Jacket Ready</p>
                    <p className="font-sans text-sm text-neutral-600">Safety equipment reminders</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Weather Aware</p>
                    <p className="font-sans text-sm text-neutral-600">Real-time lake conditions</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="font-serif text-2xl text-navy-500 mb-4">Pro Tips</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Order Early</p>
                    <p className="font-sans text-sm text-neutral-600">Weekends book fast</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Share Location</p>
                    <p className="font-sans text-sm text-neutral-600">GPS coordinates help delivery</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-sans font-semibold">Stay Hydrated</p>
                    <p className="font-sans text-sm text-neutral-600">We include water & mixers</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Marina Partners */}
      <Section>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
            Serving All Lake Travis Marinas
          </h2>
          <p className="font-sans text-lg text-neutral-600">
            Quick access from every major launch point
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {marinas.map((marina) => (
            <div key={marina.name} className="flex items-center gap-4 p-6 bg-austin-lake/5 rounded-lg">
              <svg className="w-12 h-12 text-austin-lake" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <h3 className="font-sans font-bold text-navy-500">{marina.name}</h3>
                <p className="font-sans text-sm text-neutral-600">{marina.feature}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonial */}
      <section className="section-padding bg-gradient-to-br from-austin-lake/10 to-transparent">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-premium">
              <div className="flex items-start gap-6">
                <img
                  src="/images/services/boat-parties/luxury-yacht-deck.png"
                  alt="Happy boat party"
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div className="flex-1 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-6 h-6 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="font-sans text-lg text-neutral-700 italic">
                    "Party On Delivery has been our go-to for every boat day this summer. They deliver right to 
                    our slip at Lakeway Marina, always on time with ice-cold drinks. The bartender service for 
                    our 4th of July party was exceptional!"
                  </p>
                  <div>
                    <p className="font-sans font-semibold text-navy-500">Captain Mark Williams</p>
                    <p className="font-sans text-sm text-neutral-600">Sea Ray Sundancer Owner</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTA
        title={mode === 'wild' ? 'READY TO CAUSE MAYHEM?' : 
               mode === 'luxury' ? 'Ready for Ultimate Luxury?' : 
               'Ready to Set Sail?'}
        description={mode === 'wild' 
          ? 'Book the WILDEST Lake Travis experience! Turn your boat into a floating CHAOS machine!'
          : mode === 'luxury'
          ? 'Experience the pinnacle of nautical luxury. Book your exclusive yacht service today.'
          : 'Book your Lake Travis boat party delivery today. Cold drinks, premium service, unforgettable memories.'
        }
        primaryButtonText={mode === 'wild' ? 'BOOK THE CHAOS' : 
                          mode === 'luxury' ? 'Book Luxury Service' : 
                          'Book Boat Delivery'}
        primaryButtonLink="/book-now?service=boat"
        secondaryButtonText="View Lake Map"
        secondaryButtonLink="/lake-travis-map"
        backgroundImage="/images/hero/lake-life-hero.jpg"
      />

      {/* AI Concierge */}
      <AIConcierge mode={mode} />
    </div>
  )
}
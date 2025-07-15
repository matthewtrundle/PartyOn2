'use client'

import { useState } from 'react'
import VideoHero from '@/components/VideoHero'
import ServiceCard from '@/components/ServiceCard'
import CTA from '@/components/CTA'
import Section from '@/components/Section'
import AIConcierge from '@/components/AIConcierge'
import ExperienceSelector from '@/components/ExperienceSelector'

type WeddingMode = 'elegant' | 'luxury' | 'wild'

export default function WeddingsPage() {
  const [mode, setMode] = useState<WeddingMode>('elegant')
  const [isAnimating, setIsAnimating] = useState(false)

  const modeConfigs = {
    elegant: {
      title: "Elevate Your Wedding Day",
      subtitle: "Premium Bar Service for Austin's Most Beautiful Celebrations",
      description: "From intimate Hill Country ceremonies to grand Lake Travis receptions, we bring sophistication and style to your special day.",
      backgroundImage: "/images/services/weddings/outdoor-bar-setup.webp",
      theme: "elegant"
    },
    luxury: {
      title: "Ultra-Luxury Wedding Experience",
      subtitle: "Where Dreams Meet Unparalleled Excellence",
      description: "Experience the pinnacle of luxury with our exclusive concierge-level wedding service. Every detail curated to perfection.",
      backgroundImage: "/images/services/weddings/hill-country-spirits-display.webp",
      theme: "luxury"
    },
    wild: {
      title: "Wild Wedding Celebration",
      subtitle: "Unleash Your Wedding Party Spirit",
      description: "Turn your wedding into the wildest celebration Austin has ever seen! Epic party vibes with professional execution.",
      backgroundImage: "/images/services/weddings/signature-cocktails-closeup.webp",
      theme: "wild"
    }
  }

  const currentConfig = modeConfigs[mode]

  const handleModeChange = (newMode: WeddingMode) => {
    if (newMode === mode) return
    setIsAnimating(true)
    setTimeout(() => {
      setMode(newMode)
      setIsAnimating(false)
    }, 300)
  }
  const getWeddingPackages = () => {
    if (mode === 'luxury') {
      return [
        {
          title: "Diamond Elegance",
          description: "Ultra-exclusive service for the most discerning couples. Premium everything with white-glove treatment.",
          image: "/images/services/weddings/signature-cocktails-closeup.webp",
          features: [
            "Personal wedding concierge",
            "Dom Pérignon & Cristal service",
            "Master sommelier consultation",
            "Crystal glassware & gold accents",
            "10-hour luxury experience"
          ],
          price: "$12,999",
          link: "/book-now?package=diamond",
          featured: true
        },
        {
          title: "Platinum Prestige",
          description: "Elevated luxury experience with premium spirits and impeccable service standards.",
          image: "/images/services/weddings/hill-country-spirits-display.webp",
          features: [
            "8 Elite master bartenders",
            "Top-shelf exclusive spirits",
            "Multiple luxury bar stations",
            "Premium champagne service",
            "8-hour prestige service"
          ],
          price: "$8,999",
          link: "/book-now?package=platinum"
        }
      ]
    } else if (mode === 'wild') {
      return [
        {
          title: "WILD CELEBRATION",
          description: "Turn your wedding into the most EPIC party Austin has ever seen! Unleash your wild side with professional execution.",
          image: "/images/services/weddings/outdoor-bar-setup.webp",
          features: [
            "EPIC party bartenders",
            "Signature WILD cocktails",
            "Party games & activities",
            "Dance floor domination",
            "8-hour WILD service"
          ],
          price: "$2,899",
          link: "/book-now?package=wild-celebration",
          featured: true
        },
        {
          title: "LEGENDARY WEDDING",
          description: "The ultimate wedding party experience that breaks all the rules and creates Austin LEGENDS!",
          image: "/images/services/weddings/signature-cocktails-closeup.webp",
          features: [
            "LEGENDARY entertainment team",
            "REALITY-WARPING experiences",
            "MAXIMUM celebration energy",
            "Professional CHAOS coordination",
            "10-hour LEGENDARY service"
          ],
          price: "$4,999",
          link: "/book-now?package=legendary"
        }
      ]
    } else {
      return [
    {
      title: "Intimate Ceremony",
      description: "Perfect for elopements and small gatherings up to 50 guests. Includes premium bar setup and dedicated bartender.",
      image: "/images/services/weddings/intimate-garden-wedding.webp", // TODO: Add image
      features: [
        "2 Premium bartenders",
        "Curated wine & champagne selection",
        "Signature cocktail creation",
        "Elegant bar setup & decor",
        "4-hour service"
      ],
      price: "$1,299",
      link: "/book-now?package=intimate"
    },
    {
      title: "Classic Reception",
      description: "Our most popular package for weddings of 50-150 guests. Full bar service with premium spirits and professional staff.",
      image: "/images/services/weddings/outdoor-bar-setup.png",
      features: [
        "4 Professional bartenders",
        "Full premium bar selection",
        "Custom cocktail menu",
        "Champagne service",
        "6-hour service"
      ],
      price: "$2,499",
      link: "/book-now?package=classic",
      featured: true
    },
    {
      title: "Grand Celebration",
      description: "For the wedding of your dreams. Unlimited premium service for 150+ guests with multiple bar stations.",
      image: "/images/services/weddings/grand-estate-wedding.webp", // TODO: Add image
      features: [
        "6+ Elite bartenders",
        "Multiple bar stations",
        "Top-shelf spirits selection",
        "Specialty cocktail hour",
        "8-hour service"
      ],
      price: "$4,999",
      link: "/book-now?package=grand"
    }
  ]
    }
  }

  const venues = [
    { name: "Barr Mansion", location: "East Austin" },
    { name: "The Driskill Hotel", location: "Downtown" },
    { name: "Laguna Gloria", location: "Lake Austin" },
    { name: "Mercury Hall", location: "South Austin" },
    { name: "Prospect House", location: "Dripping Springs" },
    { name: "The Allan House", location: "Central Austin" }
  ]

  const getModeStyles = () => {
    if (mode === 'luxury') {
      return {
        container: "bg-gradient-to-br from-amber-50 via-gold-50 to-amber-50",
        text: "text-amber-700",
        accent: "text-gold-600",
        button: "bg-gradient-to-r from-amber-600 to-gold-600 hover:from-amber-700 hover:to-gold-700",
        card: "bg-gradient-to-br from-amber-50/80 to-gold-50/80 border-amber-200"
      }
    } else if (mode === 'wild') {
      return {
        container: "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50",
        text: "text-red-700",
        accent: "text-orange-600",
        button: "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700",
        card: "bg-gradient-to-br from-red-50/80 to-orange-50/80 border-red-200"
      }
    } else {
      return {
        container: "bg-gradient-to-br from-navy-50 to-gold-50",
        text: "text-navy-500",
        accent: "text-gold-500",
        button: "bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500",
        card: "bg-white border-gold-200"
      }
    }
  }

  const styles = getModeStyles()

  return (
    <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['elegant', 'luxury', 'wild'] as const}
        currentMode={mode}
        onModeChange={handleModeChange}
        modeLabels={{
          elegant: 'Elegant',
          luxury: 'Luxury',
          wild: 'Wild'
        }}
        modeColors={{
          elegant: 'bg-gradient-to-r from-gold-500 to-amber-500',
          luxury: 'bg-gradient-to-r from-amber-600 to-yellow-600',
          wild: 'bg-gradient-to-r from-red-600 to-orange-600'
        }}
      />
      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={mode === 'luxury' ? "/videos/hero/wedding-sunset.mp4" : mode === 'wild' ? "/videos/backgrounds/rooftop-party-austin.mp4" : "/videos/hero/wedding-venue-travis.mp4"}
        fallbackImage={currentConfig.backgroundImage}
        ctaText="Start Planning"
        ctaLink="/book-now"
        height="tall"
      />

      {/* Introduction Section */}
      <Section className={`text-center ${styles.container}`}>
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className={`font-serif text-5xl ${styles.text}`}>
            {mode === 'luxury' ? 'Luxury Beyond Compare' : 
             mode === 'wild' ? 'WILD LOVE, LEGENDARY CELEBRATION' : 
             'Your Love Story Deserves the Perfect Toast'}
          </h2>
          <p className={`font-sans text-xl leading-relaxed ${
            mode === 'luxury' ? 'text-amber-600' : 
            mode === 'wild' ? 'text-red-600' : 
            'text-neutral-600'
          }`}>
            {mode === 'luxury' 
              ? 'Experience the ultimate in wedding luxury with our exclusive concierge-level service. Every detail curated to perfection for Austin\'s most distinguished celebrations.'
              : mode === 'wild'
              ? 'Why settle for ordinary when you can have LEGENDARY? Turn your wedding into the wildest, most unforgettable celebration Austin has ever witnessed!'
              : 'At Party On Delivery, we understand that your wedding day is one of life\'s most precious moments. Our expert team brings years of experience serving Austin\'s most discerning couples, ensuring every detail of your bar service is as perfect as your love story.'
            }
          </p>
          <div className="flex justify-center gap-8 pt-8">
            <div className="text-center">
              <p className={`font-display text-6xl ${styles.accent}`}>
                {mode === 'luxury' ? '50+' : mode === 'wild' ? '100+' : '500+'}
              </p>
              <p className={`font-sans ${
                mode === 'luxury' ? 'text-amber-600' : 
                mode === 'wild' ? 'text-red-600' : 
                'text-neutral-600'
              }`}>
                {mode === 'luxury' ? 'Luxury Weddings' : mode === 'wild' ? 'WILD Celebrations' : 'Weddings Served'}
              </p>
            </div>
            <div className="text-center">
              <p className={`font-display text-6xl ${styles.accent}`}>5.0</p>
              <p className={`font-sans ${
                mode === 'luxury' ? 'text-amber-600' : 
                mode === 'wild' ? 'text-red-600' : 
                'text-neutral-600'
              }`}>Star Rating</p>
            </div>
            <div className="text-center">
              <p className={`font-display text-6xl ${styles.accent}`}>100%</p>
              <p className={`font-sans ${
                mode === 'luxury' ? 'text-amber-600' : 
                mode === 'wild' ? 'text-red-600' : 
                'text-neutral-600'
              }`}>Licensed & Insured</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Gallery Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2 row-span-2">
              <img
                src="/images/services/weddings/outdoor-bar-setup.webp"
                alt="Elegant wedding bar setup"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <img
                src="/images/services/weddings/signature-cocktails-closeup.webp"
                alt="Signature cocktails"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <img
                src="/images/services/weddings/hill-country-spirits-display.webp"
                alt="Champagne tower"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <img
                src="/images/services/weddings/signature-cocktails-closeup.webp"
                alt="Cocktail hour setup"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <img
                src="/images/services/weddings/outdoor-bar-setup.webp"
                alt="Professional bartenders"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <Section className={mode === 'luxury' ? 'bg-amber-50' : mode === 'wild' ? 'bg-red-50' : ''}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`font-serif text-4xl md:text-5xl mb-4 ${styles.text}`}>
            {mode === 'luxury' ? 'Ultra-Luxury Packages' : 
             mode === 'wild' ? 'WILD Wedding Packages' : 
             'Wedding Bar Packages'}
          </h2>
          <p className={`font-sans text-lg ${
            mode === 'luxury' ? 'text-amber-600' : 
            mode === 'wild' ? 'text-red-600' : 
            'text-neutral-600'
          }`}>
            {mode === 'luxury' 
              ? 'Exclusive luxury experiences for the most discerning couples'
              : mode === 'wild'
              ? 'LEGENDARY wedding experiences that break all the rules and create Austin history!'
              : 'Thoughtfully crafted packages to match your vision and guest count'
            }
          </p>
        </div>

        <div className={`grid gap-8 ${
          mode === 'luxury' || mode === 'wild' ? 'grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-3'
        }`}>
          {getWeddingPackages().map((pkg, index) => (
            <div key={pkg.title} className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ServiceCard {...pkg} />
            </div>
          ))}
        </div>
      </Section>

      {/* What's Included Section */}
      <section className="section-padding bg-gradient-to-br from-gold-50 to-neutral-50">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
              The Party On Promise
            </h2>
            <p className="font-sans text-lg text-neutral-600">
              Every wedding package includes our signature service standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-navy-500">Fully Licensed & Insured</h3>
              <p className="font-sans text-neutral-600">
                TABC certified with comprehensive liability coverage. We handle all permits 
                and venue requirements, giving you complete peace of mind.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-navy-500">Professional Staff</h3>
              <p className="font-sans text-neutral-600">
                Our bartenders are experienced professionals who dress formally and 
                understand the importance of exceptional service on your special day.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-navy-500">Premium Quality</h3>
              <p className="font-sans text-neutral-600">
                We use only premium spirits, fresh ingredients, and professional-grade 
                equipment to ensure every drink is crafted to perfection.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-navy-500">Custom Menus</h3>
              <p className="font-sans text-neutral-600">
                Work with our mixologists to create signature cocktails that tell your 
                story. We&apos;ll design a menu that perfectly matches your wedding theme.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-navy-500">Seamless Service</h3>
              <p className="font-sans text-neutral-600">
                From setup to breakdown, we handle every detail. Arrive early, stay late, 
                and ensure your bar service flows perfectly throughout your celebration.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-navy-500">Personal Touch</h3>
              <p className="font-sans text-neutral-600">
                Your dedicated wedding coordinator ensures every detail is perfect, from 
                coordinating with vendors to accommodating special requests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Venue Partners */}
      <Section>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
            Preferred at Austin&apos;s Finest Venues
          </h2>
          <p className="font-sans text-lg text-neutral-600">
            Trusted by the most prestigious wedding venues in the Austin area
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {venues.map((venue) => (
            <div key={venue.name} className="text-center">
              <h3 className="font-serif text-xl text-navy-500">{venue.name}</h3>
              <p className="font-sans text-sm text-neutral-500">{venue.location}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonial */}
      <section className="section-padding bg-gradient-to-br from-austin-sunset/10 to-austin-lake/10">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <img
                src="/images/services/weddings/signature-cocktails-closeup.webp"
                alt="Happy couple"
                className="w-32 h-32 rounded-full mx-auto object-cover"
              />
            </div>
            <blockquote className="space-y-4">
              <p className="font-serif text-3xl text-navy-500 italic">
                &quot;Party On Delivery made our wedding absolutely perfect. From the initial consultation 
                to the last dance, their team was professional, attentive, and genuinely cared about 
                making our day special. Our guests are still raving about the signature cocktails!&quot;
              </p>
              <footer className="space-y-1">
                <p className="font-sans font-semibold text-lg">Emily & David Richardson</p>
                <p className="font-sans text-neutral-600">Married at Laguna Gloria, October 2024</p>
                <div className="flex justify-center mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-6 h-6 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTA
        title={mode === 'luxury' ? 'Ready for Ultimate Luxury?' : 
               mode === 'wild' ? 'Ready to Embrace Your Wild Side?' : 
               'Ready to Start Planning?'}
        description={mode === 'luxury' 
          ? 'Experience the pinnacle of wedding luxury. Schedule a private consultation with our luxury wedding specialists.'
          : mode === 'wild'
          ? 'Let\'s create the most LEGENDARY wedding celebration Austin has ever seen! Book your WILD wedding experience today.'
          : 'Let\'s create the perfect bar experience for your wedding day. Schedule a consultation with our wedding specialists today.'
        }
        primaryButtonText={mode === 'luxury' ? 'Book Luxury Consultation' : 
                          mode === 'wild' ? 'Plan My WILD Wedding' : 
                          'Schedule Consultation'}
        primaryButtonLink="/book-now?service=wedding"
        secondaryButtonText="Download Wedding Guide"
        secondaryButtonLink="/wedding-guide"
        backgroundStyle="gradient"
      />

      {/* AI Concierge */}
      <AIConcierge mode={mode} />
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Feature {
  title: string
  titleParty: string
  description: string
  descriptionParty: string
  image: string
  icon: React.ReactNode
  color: string
  stats?: string
}

const features: Feature[] = [
  {
    title: "Lightning Fast Delivery",
    titleParty: "WARP SPEED CHAOS",
    description: "Average 27-minute delivery across Austin. From 6th Street to Lake Travis, we're there before you know it.",
    descriptionParty: "We teleport booze at LIGHT SPEED! Your party starts NOW!",
    image: "/images/services/fast-delivery/motion-blur-delivery.webp",
    color: "primary",
    stats: "27 min average",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    title: "Fully Licensed & Insured",
    titleParty: "BULLETPROOF PARTY SHIELD",
    description: "TABC certified with $2M liability coverage. Your celebration is protected by the best in the business.",
    descriptionParty: "MAXIMUM legal protection so you can rage FEARLESSLY!",
    image: "/images/gallery/party-headquarters.webp",
    color: "secondary",
    stats: "100% compliant",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.128-.16-2.218-.459-3.25-.29-1.002-.817-1.917-1.543-2.68a11.959 11.959 0 00-6.998-2.106z" />
      </svg>
    )
  },
  {
    title: "Premium Bar Selection",
    titleParty: "WEAPONIZED BOOZE ARSENAL",
    description: "Top-shelf spirits, craft cocktails, and Austin's favorite local brews. Curated for unforgettable celebrations.",
    descriptionParty: "MILITARY-GRADE alcohol selection for MAXIMUM DEVASTATION!",
    image: "/images/services/weddings/signature-cocktails-closeup.webp",
    color: "accent",
    stats: "500+ options",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    )
  },
  {
    title: "Expert Party Team",
    titleParty: "LEGENDARY HYPE SQUAD",
    description: "Austin's most experienced bartenders and party professionals. We don't just deliver - we elevate.",
    descriptionParty: "Elite party commandos who AMPLIFY every celebration to 11!",
    image: "/images/services/bach-parties/bachelorette-champagne-tower.webp",
    color: "dark",
    stats: "4.9★ rating",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  }
]

interface FeatureCardsProps {
  mode?: 'normal' | 'party'
}

export default function FeatureCards({ mode = 'normal' }: FeatureCardsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    const element = document.getElementById('feature-cards')
    if (element) observer.observe(element)

    return () => {
      if (element) observer.unobserve(element)
    }
  }, [])

  return (
    <section 
      id="feature-cards"
      className={`section-padding ${
        mode === 'party' 
          ? 'bg-gradient-to-br from-primary-900/20 via-secondary-900/20 to-accent-900/20' 
          : 'bg-gradient-to-b from-white to-light'
      }`}
    >
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`font-display text-3xl md:text-4xl lg:text-5xl mb-4 ${
            mode === 'party' ? 'text-gradient-fun' : 'text-dark'
          }`}>
            {mode === 'party' ? 'Why Austin Goes ABSOLUTELY INSANE For Us' : 'Why Austin Chooses Party On'}
          </h2>
          <p className={`font-sans text-base md:text-lg ${
            mode === 'party' ? 'text-primary-200' : 'text-dark/70'
          }`}>
            {mode === 'party' 
              ? "We're not just delivery - we&apos;re PARTY WARFARE specialists armed with premium booze and legendary service!" 
              : "From stressed party planner to relaxed host in minutes. Here's how we transform your celebrations."
            }
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⭐</span>
              <span className={`font-semibold ${mode === 'party' ? 'text-primary-300' : 'text-dark'}`}>
                500+ 5-Star Reviews
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎉</span>
              <span className={`font-semibold ${mode === 'party' ? 'text-primary-300' : 'text-dark'}`}>
                2,000+ Events Served
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏆</span>
              <span className={`font-semibold ${mode === 'party' ? 'text-primary-300' : 'text-dark'}`}>
                Austin&apos;s #1 Choice
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 cursor-pointer
                ${isVisible ? 'animate-fade-up opacity-100' : 'opacity-0'}
                ${hoveredIndex === index ? 'scale-105 z-10' : 'scale-100'}
                ${mode === 'party' ? 'hover:shadow-neon' : 'hover:shadow-xl'}
              `}
              style={{ 
                animationDelay: `${index * 100}ms`,
                transform: hoveredIndex === index ? 'translateY(-10px)' : 'translateY(0)'
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Background Image with Parallax Effect */}
              <div className="absolute inset-0">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  priority={index < 2}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${
                  feature.color === 'primary' ? 'from-primary-900/90 via-primary-900/70 to-primary-900/40' :
                  feature.color === 'secondary' ? 'from-secondary-900/90 via-secondary-900/70 to-secondary-900/40' :
                  feature.color === 'accent' ? 'from-accent-900/90 via-accent-900/70 to-accent-900/40' :
                  'from-dark/80 via-dark/60 to-dark/30'
                }`} />
              </div>

              {/* Content */}
              <div className="relative h-80 p-6 flex flex-col justify-between">
                {/* Icon and Stats */}
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm transition-all duration-300
                    ${hoveredIndex === index ? 'scale-110 rotate-12' : ''}
                    ${mode === 'party' ? 'animate-pulse-slow' : ''}
                  `}>
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>
                  {feature.stats && (
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-xs font-bold text-white">{feature.stats}</span>
                    </div>
                  )}
                </div>

                {/* Text Content */}
                <div className="space-y-3">
                  <h3 className={`font-display text-xl font-bold text-white transition-all duration-300
                    ${hoveredIndex === index ? 'translate-x-2' : ''}
                  `}>
                    {mode === 'party' ? feature.titleParty : feature.title}
                  </h3>
                  <p className={`text-sm text-white/90 leading-relaxed transition-all duration-300
                    ${hoveredIndex === index ? 'translate-x-1' : ''}
                  `}>
                    {mode === 'party' ? feature.descriptionParty : feature.description}
                  </p>
                  
                  {/* Hover CTA */}
                  <div className={`flex items-center space-x-2 text-white font-semibold transition-all duration-300
                    ${hoveredIndex === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}>
                    <span className="text-sm">Learn More</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              {mode === 'party' && (
                <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-full blur-xl animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 text-center">
          <div className={`inline-block p-6 rounded-2xl ${
            mode === 'party' 
              ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 backdrop-blur-sm' 
              : 'bg-white shadow-lg'
          }`}>
            <p className={`text-lg font-semibold mb-4 ${
              mode === 'party' ? 'text-primary-300' : 'text-dark'
            }`}>
              Ready to experience the difference?
            </p>
            <a 
              href="/book-now" 
              className={`btn-primary inline-flex items-center space-x-2 ${
                mode === 'party' ? 'animate-pulse-slow' : ''
              }`}
            >
              <span>Book Your Delivery</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
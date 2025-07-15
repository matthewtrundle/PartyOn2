'use client'

import { useState } from 'react'
import VideoHero from '@/components/VideoHero'
import CTA from '@/components/CTA'
import Section from '@/components/Section'
import AIConcierge from '@/components/AIConcierge'
import ExperienceSelector from '@/components/ExperienceSelector'

type PartyMode = 'normal' | 'bachelor' | 'bachelorette'

export default function BachPartiesPage() {
  const [mode, setMode] = useState<PartyMode>('normal')
  const [isAnimating, setIsAnimating] = useState(false)

  const modeConfigs = {
    normal: {
      title: "Bachelor & Bachelorette Parties",
      subtitle: "Premium Party Services for Austin&apos;s Best Celebrations",
      description: "Professional service for unforgettable bachelor and bachelorette parties across Austin.",
      backgroundImage: "/images/hero/neon-nights-hero.webp",
      theme: "elegant"
    },
    bachelor: {
      title: "LEGENDARY BACHELOR PARTY",
      subtitle: "WHERE LEGENDS ARE MADE",
      description: "Epic bachelor parties that Austin will never forget. No rules, no limits, just legendary nights!",
      backgroundImage: "/images/services/bach-parties/late-night-party-supplies.webp",
      theme: "extreme"
    },
    bachelorette: {
      title: "GLAM BACHELORETTE EXPERIENCE",
      subtitle: "Sparkle, Shine & Celebrate Like Queens",
      description: "Fabulous bachelorette parties fit for Austin royalty. Champagne bubbles, glam vibes, and unforgettable memories!",
      backgroundImage: "/images/services/bach-parties/brunch-mimosa-bar.webp",
      theme: "glamorous"
    }
  }

  const currentConfig = modeConfigs[mode]

  const handleModeChange = (newMode: PartyMode) => {
    if (newMode === mode) return
    setIsAnimating(true)
    setTimeout(() => {
      setMode(newMode)
      setIsAnimating(false)
    }, 300)
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['normal', 'bachelor', 'bachelorette'] as const}
        currentMode={mode}
        onModeChange={handleModeChange}
        modeLabels={{
          normal: 'Professional',
          bachelor: 'Bachelor',
          bachelorette: 'Bachelorette'
        }}
        modeColors={{
          normal: 'bg-gradient-to-r from-gold-500 to-amber-500',
          bachelor: 'bg-gradient-to-r from-red-600 to-orange-600',
          bachelorette: 'bg-gradient-to-r from-pink-500 to-purple-500'
        }}
      />

      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={mode === 'bachelor' ? "/videos/backgrounds/bachelor-party-6th-street.mp4" : mode === 'bachelorette' ? "/videos/backgrounds/bachelorette-party-glamorous.mp4" : "/videos/hero/luxury-wedding.mp4"}
        fallbackImage={currentConfig.backgroundImage}
        ctaText="Book Your Party"
        ctaLink="/book-now"
        height="tall"
      />

      {/* Services Section */}
      <Section className="py-20 bg-neutral-50">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
              {mode === 'bachelor' ? 'EPIC BACHELOR PACKAGES' : mode === 'bachelorette' ? 'GLAMOROUS BACHELORETTE PACKAGES' : 'Bachelor & Bachelorette Packages'}
            </h2>
            <p className="font-sans text-lg text-neutral-600">
              {mode === 'bachelor' 
                ? 'Legendary party packages that turn Austin into your personal playground'
                : mode === 'bachelorette' 
                ? 'Luxury party experiences designed for queens and their courts'
                : 'Premium party packages for unforgettable celebrations'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Package 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <h3 className="font-serif text-2xl text-navy-500 mb-4">
                {mode === 'bachelor' ? 'BOYS NIGHT OUT' : mode === 'bachelorette' ? 'GIRLS NIGHT GLAM' : 'Essential Party Package'}
              </h3>
              <p className="text-neutral-600 mb-6">
                {mode === 'bachelor' 
                  ? "Epic night package for the crew. Austin&apos;s wildest spots await!"
                  : mode === 'bachelorette'
                  ? "Champagne dreams and Austin glamour for the perfect girls' weekend!"
                  : 'Everything you need for an amazing bachelor or bachelorette celebration'
                }
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">Premium spirits & mixers</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">Party games & supplies</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">Delivery to any Austin location</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-serif text-3xl text-gold-500">$599</p>
                <a href="/book-now" className="btn-primary">
                  Book Now
                </a>
              </div>
            </div>

            {/* Package 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-gold-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-2xl text-navy-500">
                  {mode === 'bachelor' ? 'LEGENDARY EXPERIENCE' : mode === 'bachelorette' ? 'ROYAL TREATMENT' : 'VIP Party Experience'}
                </h3>
                <span className="bg-gradient-to-r from-gold-500 to-gold-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <p className="text-neutral-600 mb-6">
                {mode === 'bachelor' 
                  ? 'The ultimate bachelor party with professional service and epic experiences!'
                  : mode === 'bachelorette'
                  ? 'Luxury experience fit for a queen and her royal court!'
                  : 'Level up with professional service and premium experiences'
                }
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">Professional bartender service</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">Premium bar setup</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">Custom cocktail menu</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gold-500 mr-2">✓</span>
                  <span className="text-sm text-neutral-700">6-hour service coverage</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-serif text-3xl text-gold-500">$1,299</p>
                <a href="/book-now" className="btn-primary">
                  Book Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <CTA
        title={mode === 'bachelor' ? "READY TO BECOME A LEGEND?" : mode === 'bachelorette' ? "READY TO PARTY LIKE ROYALTY?" : "Ready to Party?"}
        description={mode === 'bachelor' ? "Book the most epic bachelor party Austin has ever seen. Your crew will thank you forever!" : mode === 'bachelorette' ? "Create magical memories with Austin&apos;s most glamorous bachelorette experience!" : "Let's make your bach party legendary. Book Austin&apos;s favorite party delivery service!"}
        primaryButtonText={mode === 'bachelor' ? "BOOK EPIC PARTY" : mode === 'bachelorette' ? "BOOK ROYAL TREATMENT" : "Start Planning"}
        primaryButtonLink="/book-now"
        secondaryButtonText="View All Packages"
        secondaryButtonLink="/packages"
      />

      {/* AI Concierge */}
      <AIConcierge mode={mode} />
    </div>
  )
}
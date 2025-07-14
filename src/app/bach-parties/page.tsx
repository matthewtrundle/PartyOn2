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
      title: "Bach Party Planning Made Easy",
      subtitle: "Premium Parties for Austin&apos;s Best Celebrations",
      description: "Professional service for unforgettable bachelor and bachelorette parties across Austin.",
      backgroundImage: "/images/hero/neon-nights-hero.jpg",
      primaryColor: "gold",
      accentColor: "austin-sunset",
      theme: "elegant"
    },
    bachelor: {
      title: "BACHELOR MODE: ACTIVATED",
      subtitle: "LEGENDS ARE MADE HERE",
      description: "Epic bachelor parties that Austin will never forget. No rules, no limits, just legendary nights!",
      backgroundImage: "/images/services/bach-parties/late-night-party-supplies.png",
      primaryColor: "red",
      accentColor: "orange",
      theme: "extreme"
    },
    bachelorette: {
      title: "Queen Mode: Activated",
      subtitle: "Sparkle, Shine & Celebrate",
      description: "Fabulous bachelorette parties fit for Austin royalty. Champagne bubbles, pink vibes, and unforgettable memories!",
      backgroundImage: "/images/services/bach-parties/brunch-mimosa-bar.png",
      primaryColor: "pink",
      accentColor: "purple",
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

  const getPartyPackages = () => {
    if (mode === 'bachelor') {
      return [
        {
          title: "BOYS NIGHT OUT",
          description: "Epic night package for the crew. Austin&apos;s wildest spots await!",
          image: "/images/backgrounds/chic-austin-airbnb.png",
          features: [
            "Pre-game supplies delivered",
            "6th Street party guide",
            "Group shots & beer towers",
            "Late night recovery kit",
            "Uber credits included"
          ],
          price: "$499",
          link: "/book-now?package=boys-night",
          featured: true
        },
        {
          title: "LEGEND STATUS",
          description: "Go all out for the groom. VIP treatment and premium everything!",
          image: "/images/products/premium-spirits-boutique.png",
          features: [
            "VIP bar service",
            "Premium whiskey selection",
            "Party bus bar setup",
            "Professional wingmen",
            "8-hour coverage"
          ],
          price: "$1,299",
          link: "/book-now?package=legend"
        }
      ]
    } else if (mode === 'bachelorette') {
      return [
        {
          title: "BRIDE TRIBE VIBES",
          description: "Champagne dreams and Austin scenes for the perfect girls&apos; weekend!",
          image: "/images/gallery/sunset-champagne-pontoon.png",
          features: [
            "Champagne & prosecco bar",
            "Instagram-worthy setups",
            "Pink party decorations",
            "Mimosa brunches delivered",
            "Queen treatment all day"
          ],
          price: "$699",
          link: "/book-now?package=bride-tribe",
          featured: true
        },
        {
          title: "ROYAL TREATMENT",
          description: "Luxury experience fit for a queen and her court!",
          image: "/images/gallery/ai-recommended-setup.png",
          features: [
            "Personal cocktail concierge",
            "Rose gold everything",
            "Spa day drink delivery",
            "Custom pink cocktails",
            "Royal treatment package"
          ],
          price: "$1,599",
          link: "/book-now?package=royal"
        }
      ]
    } else {
      return [
        {
          title: "Last Fling Before the Ring",
          description: "The essential bach party package. Stocked bar delivered to your Airbnb with party favorites.",
          image: "/images/backgrounds/chic-austin-airbnb.png",
          features: [
            "Premium spirits & mixers",
            "Champagne & prosecco",
            "Party games included",
            "Bach party swag bag",
            "Delivery to any Austin location"
          ],
          price: "$599",
          link: "/book-now?package=last-fling"
        },
        {
          title: "VIP Party Experience",
          description: "Level up with professional bartender service and custom cocktails for your crew.",
          image: "/images/products/premium-spirits-boutique.png",
          features: [
            "2 Professional bartenders",
            "Custom cocktail menu",
            "Premium bar setup",
            "Themed decorations",
            "6-hour service"
          ],
          price: "$1,299",
          link: "/book-now?package=vip-bach",
          featured: true
        }
      ]
    }
  }

  // Dynamic styles based on mode
  const styles = mode === 'bachelor' ? {
    container: "bg-gradient-to-br from-red-900 via-black to-orange-900",
    text: "text-orange-400",
    accent: "text-red-500",
    button: "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700",
    card: "bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30"
  } : mode === 'bachelorette' ? {
    container: "bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100",
    text: "text-pink-600",
    accent: "text-purple-600",
    button: "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600",
    card: "bg-gradient-to-br from-pink-100/80 to-purple-100/80 border-pink-300"
  } : {
    container: "bg-gradient-to-br from-navy-50 to-gold-50",
    text: "text-navy-500",
    accent: "text-gold-500",
    button: "bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500",
    card: "bg-white border-gold-200"
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['normal', 'bachelor', 'bachelorette'] as const}
        currentMode={mode}
        onModeChange={handleModeChange}
        modeLabels={{
          normal: 'Normal',
          bachelor: 'Bachelor',
          bachelorette: 'Bachelorette'
        }}
        modeColors={{
          normal: 'bg-gradient-to-r from-gold-500 to-amber-500',
          bachelor: 'bg-gradient-to-r from-red-600 to-orange-600',
          bachelorette: 'bg-gradient-to-r from-pink-500 to-purple-500'
        }}
        label="PARTY MODE"
      />

      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={mode === 'bachelor' ? "/videos/backgrounds/bachelor-party.mp4" : mode === 'bachelorette' ? "/videos/backgrounds/bachelorette-party.mp4" : "/videos/backgrounds/austin-party-setup.mp4"}
        fallbackImage={currentConfig.backgroundImage}
        ctaText="Plan Your Party"
        ctaLink="/book-now"
        height="tall"
      />

      {/* Party Vibes Section */}
      <Section className={styles.container}>
        <div className="text-center max-w-4xl mx-auto space-y-8">
          {mode === 'bachelor' && (
            <>
              <h2 className="font-display text-8xl text-red-500 animate-pulse">
                LEGEND MODE
              </h2>
              <p className="font-sans text-2xl text-orange-400 leading-relaxed">
                Time to make some BAD DECISIONS and GOOD MEMORIES! 
                Austin&apos;s wildest bachelor party experience awaits the crew.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-8">
                <div className="bg-red-900/50 px-8 py-4 rounded-full shadow-md border border-red-500">
                  <p className="font-display text-3xl text-orange-400">EPIC NIGHTS</p>
                </div>
                <div className="bg-red-900/50 px-8 py-4 rounded-full shadow-md border border-red-500">
                  <p className="font-display text-3xl text-orange-400">WILD STORIES</p>
                </div>
                <div className="bg-red-900/50 px-8 py-4 rounded-full shadow-md border border-red-500">
                  <p className="font-display text-3xl text-orange-400">ZERO REGRETS</p>
                </div>
              </div>
            </>
          )}

          {mode === 'bachelorette' && (
            <>
              <h2 className="font-serif text-6xl bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                QUEEN ENERGY ACTIVATED
              </h2>
              <p className="font-sans text-2xl text-pink-600 leading-relaxed">
                Sparkle, sip, and celebrate like the QUEENS you are! 
                Austin&apos;s most fabulous bachelorette experience awaits your royal court.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-8">
                <div className="bg-pink-100 px-8 py-4 rounded-full shadow-md border-2 border-pink-300">
                  <p className="font-serif text-2xl text-pink-600">ROYAL VIBES</p>
                </div>
                <div className="bg-purple-100 px-8 py-4 rounded-full shadow-md border-2 border-purple-300">
                  <p className="font-serif text-2xl text-purple-600">CHAMPAGNE DREAMS</p>
                </div>
                <div className="bg-pink-100 px-8 py-4 rounded-full shadow-md border-2 border-pink-300">
                  <p className="font-serif text-2xl text-pink-600">QUEEN TREATMENT</p>
                </div>
              </div>
            </>
          )}

          {mode === 'normal' && (
            <>
              <h2 className="font-display text-6xl text-navy-500">
                LET&apos;S GET THIS PARTY STARTED
              </h2>
              <p className="font-sans text-xl text-neutral-600 leading-relaxed">
                Your last hurrah deserves the best. Party On Delivery brings premium bar service 
                to bachelor and bachelorette parties across Austin. No hassle, no cleanup, 
                just unforgettable memories with your crew.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-8">
                <div className="bg-white px-6 py-3 rounded-full shadow-md border border-gold-200">
                  <p className="font-display text-2xl text-navy-500">BRIDE TRIBE</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-full shadow-md border border-gold-200">
                  <p className="font-display text-2xl text-navy-500">GROOM&apos;S CREW</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-full shadow-md border border-gold-200">
                  <p className="font-display text-2xl text-navy-500">PARTY PROS</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* Packages Section */}
      <Section className={mode === 'bachelor' ? 'bg-black' : mode === 'bachelorette' ? 'bg-pink-50' : 'bg-neutral-50'}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`font-serif text-4xl md:text-5xl mb-4 ${styles.text}`}>
            Choose Your Party Level
          </h2>
          <p className={`font-sans text-lg ${mode === 'bachelor' ? 'text-orange-300' : mode === 'bachelorette' ? 'text-pink-600' : 'text-neutral-600'}`}>
            {mode === 'bachelor' ? 'From wild to absolutely legendary' : 
             mode === 'bachelorette' ? 'From fabulous to absolutely royal' : 
             &apos;From chill to wild, we&apos;ve got your celebration covered&apos;}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {getPartyPackages().map((pkg, index) => (
            <div key={pkg.title} className={`animate-fade-up ${styles.card} p-8 rounded-2xl border-2`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="relative h-48 -mx-8 -mt-8 mb-6 overflow-hidden rounded-t-2xl">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
                {pkg.featured && (
                  <span className={`absolute top-4 right-4 ${styles.button} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                    {mode === 'bachelor' ? 'LEGENDARY' : mode === 'bachelorette' ? 'ROYAL' : 'MOST POPULAR'}
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className={`font-serif text-2xl ${styles.text}`}>
                  {pkg.title}
                </h3>
                <p className={`font-sans ${mode === 'bachelor' ? 'text-orange-200' : mode === 'bachelorette' ? 'text-pink-600' : 'text-neutral-600'}`}>
                  {pkg.description}
                </p>
                <ul className="space-y-2">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className={`${styles.accent} mt-1`}>
                        {mode === 'bachelor' ? '→' : mode === 'bachelorette' ? '→' : '✓'}
                      </span>
                      <span className={`font-sans text-sm ${mode === 'bachelor' ? 'text-orange-200' : mode === 'bachelorette' ? 'text-pink-600' : 'text-neutral-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 flex items-center justify-between">
                  <p className={`font-serif text-3xl ${styles.accent}`}>{pkg.price}</p>
                  <a 
                    href={pkg.link}
                    className={`${styles.button} text-white px-6 py-3 rounded-full font-semibold transition-all hover:scale-105`}
                  >
                    {mode === 'bachelor' ? "LET'S GO!" : mode === 'bachelorette' ? 'Book Royal Treatment' : 'Book Now'}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA Section */}
      <CTA
        title={mode === 'bachelor' ? "READY TO BECOME A LEGEND?" : 
               mode === 'bachelorette' ? "Ready to Live Your Princess Dreams?" : 
               "Ready to Party?"}
        description={mode === 'bachelor' ? "Book the most epic bachelor party Austin has ever seen. Your crew will thank you forever!" :
                    mode === 'bachelorette' ? "Book the most fabulous bachelorette party fit for Austin royalty!" :
                    "Let&apos;s make your bach party legendary. Book Austin&apos;s favorite party delivery service!"}
        primaryButtonText={mode === 'bachelor' ? "BOOK EPIC PARTY" : 
                          mode === 'bachelorette' ? "Book Royal Treatment" : 
                          "Start Planning"}
        primaryButtonLink="/book-now?service=bach-party"
        secondaryButtonText="Party Packages"
        secondaryButtonLink="/packages"
        backgroundStyle="gradient"
      />

      {/* AI Concierge */}
      <AIConcierge mode={mode} />
    </div>
  )
}
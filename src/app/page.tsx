'use client'

import { useState } from 'react'
import VideoHero from '@/components/VideoHero'
import ServiceCard from '@/components/ServiceCard'
import CTA from '@/components/CTA'
import AIConcierge from '@/components/AIConcierge'
import ExperienceSelector from '@/components/ExperienceSelector'
import FeatureCards from '@/components/FeatureCards'

type HomeMode = 'normal' | 'party'

export default function Home() {
  const [mode, setMode] = useState<HomeMode>('normal')

  const modeConfigs = {
    normal: {
      title: "Austin's Premier Party Delivery",
      subtitle: "From Lake Travis to Downtown",
      description: "ORDER 72 HOURS IN ADVANCE • Premium alcohol delivery • Licensed & insured • Ready to make your event unforgettable",
      backgroundImage: "/images/hero/austin-skyline-hero.webp",
      theme: "elegant"
    },
    party: {
      title: "AUSTIN'S PARTY HEADQUARTERS",
      subtitle: "WHERE LEGENDS ARE MADE",
      description: "ORDER 72 HOURS IN ADVANCE • EPIC parties • WILD nights • UNFORGETTABLE memories • We turn Austin celebrations UP TO 11!",
      backgroundImage: "/images/hero/neon-nights-hero.webp",
      theme: "explosive"
    }
  }

  const getServices = () => {
    if (mode === 'party') {
      return [
        {
          title: "WEDDING MAYHEM",
          description: "Turn your wedding into the WILDEST party Austin has ever seen! Premium chaos with professional precision.",
          image: "/images/services/weddings/outdoor-bar-setup.webp",
          features: [
            "EPIC bartender entertainment",
            "Signature WILD cocktails",
            "Party games & activities",
            "Dance floor domination",
            "Zero boring moments"
          ],
          price: "$899",
          link: "/weddings",
          featured: true
        },
        {
          title: "LAKE TRAVIS CHAOS",
          description: "Boat parties that make WAVES! Turn Lake Travis into your personal party paradise!",
          image: "/images/services/boat-parties/luxury-yacht-deck.webp",
          features: [
            "Floating bar MADNESS",
            "Coolers packed with FUN",
            "Safety? We got that too!",
            "Lake Travis takeover",
            "Splash zone service"
          ],
          price: "$399",
          link: "/boat-parties"
        },
        {
          title: "CORPORATE TAKEOVER",
          description: "Business parties that break ALL the rules! Turn boring events into LEGENDARY celebrations!",
          image: "/images/services/corporate/penthouse-suite-setup.webp",
          features: [
            "Executive party mode",
            "Brand-crushing cocktails",
            "Professional party staff",
            "Invoice? More like INVOICE!",
            "Same-day CHAOS setup"
          ],
          price: "$1,299",
          link: "/corporate"
        }
      ]
    } else {
      return [
        {
          title: "Wedding Bar Service",
          description: "Elevate your special day with our premium bar service. From intimate Hill Country ceremonies to grand Lake Travis receptions.",
          image: "/images/services/weddings/outdoor-bar-setup.webp",
          features: [
            "Licensed bartenders & servers",
            "Premium spirits selection",
            "Custom cocktail menus",
            "Setup & breakdown included",
            "TABC certified & insured"
          ],
          price: "$899",
          link: "/weddings",
          featured: true
        },
        {
          title: "Boat Party Packages",
          description: "Make waves on Lake Travis with our exclusive boat party packages. Cold drinks delivered directly to your vessel.",
          image: "/images/services/boat-parties/luxury-yacht-deck.webp",
          features: [
            "Dock or water delivery",
            "Coolers & ice included",
            "Premium beer & spirits",
            "Safety-focused service",
            "Lake Travis specialists"
          ],
          price: "$399",
          link: "/boat-parties"
        },
        {
          title: "Corporate Events",
          description: "Impress clients and celebrate success with our corporate event packages. Professional service for Austin&apos;s business elite.",
          image: "/images/services/corporate/penthouse-suite-setup.webp",
          features: [
            "Executive bar service",
            "Brand customization",
            "Professional staff",
            "Invoice billing available",
            "Same-day setup"
          ],
          price: "$1,299",
          link: "/corporate"
        }
      ]
    }
  }

  const currentConfig = modeConfigs[mode]
  const services = getServices()

  return (
    <>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['normal', 'party'] as const}
        currentMode={mode}
        onModeChange={setMode}
        modeLabels={{
          normal: 'Professional',
          party: 'Party Mode'
        }}
        modeColors={{
          normal: 'bg-primary-500',
          party: 'bg-gradient-party'
        }}
        label="PARTY VIBE"
      />

      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={mode === 'party' ? "/videos/hero/austin-music-festival.mp4" : "/videos/hero/austin-skyline-timelapse.mp4"}
        fallbackImage={mode === 'party' ? "/images/hero/austin-6th-street-neon.webp" : "/images/hero/austin-skyline-golden-hour.webp"}
        ctaText="Book Your Delivery"
        ctaLink="/book-now"
      />

      {/* Features Section with New Cards */}
      <FeatureCards mode={mode} />

      {/* Services Section */}
      <section className={`section-padding ${mode === 'party' ? 'bg-black' : ''}`}>
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`font-serif text-4xl md:text-5xl mb-4 ${mode === 'party' ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-purple-400' : 'text-navy-500'}`}>
              {mode === 'party' ? 'DEPLOY THE PARTY WEAPONS' : 'Elevate Your Austin Experience'}
            </h2>
            <p className={`font-sans text-lg ${mode === 'party' ? 'text-orange-300' : 'text-neutral-600'}`}>
              {mode === 'party' 
                ? 'These aren\'t just party packages - they\'re REALITY-WARPING experiences that turn Austin into your personal CHAOS KINGDOM!' 
                : 'From intimate gatherings to grand celebrations, we deliver more than drinks—we deliver memories.'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={service.title} className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Austin Section - Keep this normal for now */}
      <section className="section-padding bg-gradient-to-br from-austin-sunset/10 to-austin-lake/10">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-4xl md:text-5xl text-navy-500">
                Proudly Serving Austin&apos;s Best Neighborhoods
              </h2>
              <p className="font-sans text-lg text-neutral-600 leading-relaxed">
                From the vibrant streets of South Congress to the serene shores of Lake Travis, 
                we know Austin like the back of our delivery vans. Our local expertise ensures 
                your party supplies arrive fresh, cold, and exactly when you need them.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-sans font-bold text-gold-500">Downtown & Central</h3>
                  <ul className="space-y-1 text-sm text-neutral-600">
                    <li>Rainey Street</li>
                    <li>6th Street District</li>
                    <li>The Domain</li>
                    <li>Hyde Park</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-sans font-bold text-gold-500">Lake & Hills</h3>
                  <ul className="space-y-1 text-sm text-neutral-600">
                    <li>Lake Travis</li>
                    <li>Westlake Hills</li>
                    <li>Bee Cave</li>
                    <li>Dripping Springs</li>
                  </ul>
                </div>
              </div>
              <a href="/delivery-areas" className="btn-primary inline-flex">
                View All Delivery Areas
              </a>
            </div>
            <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden shadow-premium">
              <Image
                src="/images/hero/lake-travis-yacht-sunset.webp"
                alt="Lake Travis at sunset"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <p className="font-display text-4xl">KEEP AUSTIN</p>
                <p className="font-sans text-lg">CELEBRATING</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Keep normal for now */}
      <section className="section-padding bg-neutral-50">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
              Austin Loves Party On
            </h2>
            <p className="font-sans text-lg text-neutral-600">
              Don&apos;t just take our word for it—hear from our happy customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-6 h-6 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-sans text-neutral-600 mb-4 italic">
                &quot;Party On saved our wedding! When our original bar service cancelled last minute, 
                they stepped in with premium service that our guests are still talking about.&quot;
              </p>
              <p className="font-sans font-semibold text-navy-500">Sarah & Mike</p>
              <p className="font-sans text-sm text-neutral-500">Westlake Wedding</p>
            </div>

            <div className="card text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-6 h-6 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-sans text-neutral-600 mb-4 italic">
                &quot;Best boat party ever! They delivered right to our dock with ice-cold drinks 
                and even helped us load the coolers. True Austin hospitality!&quot;
              </p>
              <p className="font-sans font-semibold text-navy-500">Jake Thompson</p>
              <p className="font-sans text-sm text-neutral-500">Lake Travis Party</p>
            </div>

            <div className="card text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-6 h-6 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-sans text-neutral-600 mb-4 italic">
                &quot;Professional, punctual, and perfect! Used them for our SXSW corporate event. 
                The custom cocktail menu was a huge hit with our clients.&quot;
              </p>
              <p className="font-sans font-semibold text-navy-500">Amanda Chen</p>
              <p className="font-sans text-sm text-neutral-500">Tech Company Event</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTA
        title={mode === 'party' ? "READY TO GO ABSOLUTELY WILD?" : "Ready to Party On?"}
        description={mode === 'party' 
          ? "Join thousands of Austin LEGENDS who trust us with their EPIC celebrations. Book your LEGENDARY delivery today!"
          : "Join thousands of satisfied Austinites who trust us with their celebrations. Book your premium delivery today and let&apos;s make memories!"
        }
        primaryButtonText="Book Your Delivery"
        primaryButtonLink="/book-now"
        secondaryButtonText="View Packages"
        secondaryButtonLink="/packages"
      />

      {/* AI Concierge */}
      <AIConcierge mode={mode} />
    </>
  )
}
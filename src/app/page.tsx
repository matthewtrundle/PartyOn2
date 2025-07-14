'use client'

import { useState } from 'react'
import VideoHero from '@/components/VideoHero'
import ServiceCard from '@/components/ServiceCard'
import CTA from '@/components/CTA'
import AIConcierge from '@/components/AIConcierge'
import ExperienceSelector from '@/components/ExperienceSelector'

type HomeMode = 'normal' | 'party'

export default function Home() {
  const [mode, setMode] = useState<HomeMode>('normal')

  const modeConfigs = {
    normal: {
      title: "Austin&apos;s Premier Party Delivery",
      subtitle: "From Lake Travis to Downtown",
      description: "ORDER 72 HOURS IN ADVANCE • Premium alcohol delivery • Licensed & insured • Ready to make your event unforgettable",
      backgroundImage: "/images/hero/austin-skyline-hero.png",
      theme: "elegant"
    },
    party: {
      title: "AUSTIN'S PARTY HEADQUARTERS",
      subtitle: "WHERE LEGENDS ARE MADE",
      description: "ORDER 72 HOURS IN ADVANCE • EPIC parties • WILD nights • UNFORGETTABLE memories • We turn Austin celebrations UP TO 11!",
      backgroundImage: "/images/hero/neon-nights-hero.jpg",
      theme: "explosive"
    }
  }

  const getServices = () => {
    if (mode === 'party') {
      return [
        {
          title: "WEDDING MAYHEM",
          description: "Turn your wedding into the WILDEST party Austin has ever seen! Premium chaos with professional precision.",
          image: "/images/services/weddings/outdoor-bar-setup.png",
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
          image: "/images/services/boat-parties/luxury-yacht-deck.png",
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
          image: "/images/services/corporate/penthouse-suite-setup.png",
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
          image: "/images/services/weddings/outdoor-bar-setup.png",
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
          image: "/images/services/boat-parties/luxury-yacht-deck.png",
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
          image: "/images/services/corporate/penthouse-suite-setup.png",
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
          normal: 'bg-gradient-to-r from-gold-500 to-amber-500',
          party: 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500'
        }}
        label="EXPERIENCE"
      />

      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={mode === 'party' ? "/social_biff01_A_cinematic_establishing_shot_of_Austins_vibrant_night_a572f3ef-7895-4d69-8bc7-96dfcaf7e6cb_3.mp4" : "/videos/hero/austin-skyline-timelapse.mp4"}
        fallbackImage={mode === 'party' ? "/biff01_Neon-lit_Austin_6th_Street_at_night_vibrant_party_atmo_3117185a-bdab-453c-9ca8-675cd5581dc5_0.png" : "/biff01_Austin_skyline_at_golden_hour_from_Mount_Bonnell_viewp_70e449d9-34ee-4d92-89c9-7db7800d8f1f_3.png"}
        ctaText="Book Your Delivery"
        ctaLink="/book-now"
      />

      {/* Features Section */}
      <section className={`section-padding ${mode === 'party' ? 'bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900' : 'bg-neutral-50'}`}>
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`font-serif text-4xl md:text-5xl mb-4 ${mode === 'party' ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400' : 'text-navy-500'}`}>
              {mode === 'party' ? 'Austin\'s ULTIMATE Party Powerhouse' : 'Why Austin Chooses Party On'}
            </h2>
            <p className={`font-sans text-lg ${mode === 'party' ? 'text-orange-200' : 'text-neutral-600'}`}>
              {mode === 'party' 
                ? "We don&apos;t just deliver booze - we deliver PURE CHAOS, EPIC VIBES, and memories so WILD they become Austin LEGENDS!" 
                : "We&apos;re not just another delivery service. We&apos;re your premium party partners, bringing the celebration to you with style and sophistication."
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4 animate-fade-up">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${mode === 'party' ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-gold'}`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className={`font-serif text-xl ${mode === 'party' ? 'text-orange-400' : 'text-navy-500'}`}>
                {mode === 'party' ? 'WARP SPEED DELIVERY' : '30-Minute Delivery'}
              </h3>
              <p className={`font-sans text-sm ${mode === 'party' ? 'text-orange-200' : 'text-neutral-600'}`}>
                {mode === 'party' 
                  ? 'We move at LUDICROUS SPEED! Drinks arrive before the beat drops!' 
                  : 'Fast, reliable service across Austin and Lake Travis'
                }
              </p>
            </div>

            <div className="text-center space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${mode === 'party' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gradient-gold'}`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className={`font-serif text-xl ${mode === 'party' ? 'text-pink-400' : 'text-navy-500'}`}>
                {mode === 'party' ? 'LEGAL AF PROTECTION' : 'Licensed & Insured'}
              </h3>
              <p className={`font-sans text-sm ${mode === 'party' ? 'text-pink-200' : 'text-neutral-600'}`}>
                {mode === 'party' 
                  ? 'BULLETPROOF permits so you can party FEARLESSLY!' 
                  : 'TABC certified with full liability coverage'
                }
              </p>
            </div>

            <div className="text-center space-y-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${mode === 'party' ? 'bg-gradient-to-r from-green-600 to-blue-600' : 'bg-gradient-gold'}`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className={`font-serif text-xl ${mode === 'party' ? 'text-blue-400' : 'text-navy-500'}`}>
                {mode === 'party' ? 'INSANE PARTY ARSENAL' : 'Premium Selection'}
              </h3>
              <p className={`font-sans text-sm ${mode === 'party' ? 'text-blue-200' : 'text-neutral-600'}`}>
                {mode === 'party' 
                  ? 'WEAPONIZED alcohol selection for MAXIMUM CHAOS!' 
                  : 'Curated spirits, craft cocktails, and local favorites'
                }
              </p>
            </div>

            <div className="text-center space-y-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${mode === 'party' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'bg-gradient-gold'}`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className={`font-serif text-xl ${mode === 'party' ? 'text-yellow-400' : 'text-navy-500'}`}>
                {mode === 'party' ? 'HYPE SQUAD LEGENDS' : 'Professional Staff'}
              </h3>
              <p className={`font-sans text-sm ${mode === 'party' ? 'text-yellow-200' : 'text-neutral-600'}`}>
                {mode === 'party' 
                  ? 'Our crew doesn\'t just serve drinks - they AMPLIFY THE MADNESS!' 
                  : 'Experienced bartenders and courteous delivery team'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

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
              <img
                src="/images/hero/lake-travis-sunset.jpg"
                alt="Lake Travis at sunset"
                className="w-full h-full object-cover"
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
              Don't just take our word for it—hear from our happy customers
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
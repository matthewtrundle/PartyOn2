'use client'

import { useState, useRef } from 'react'
import VideoHero from '@/components/VideoHero'
import CTA from '@/components/CTA'
import ExperienceSelector from '@/components/ExperienceSelector'
import Image from 'next/image'

type AIMode = 'refined' | 'wild'

export default function AIPartyPlanner() {
  const [mode, setMode] = useState<AIMode>('refined')
  const [userInput, setUserInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showThoughts, setShowThoughts] = useState(false)
  const [aiThoughts, setAiThoughts] = useState<string[]>([])
  const [response, setResponse] = useState('')
  const thoughtsRef = useRef<HTMLDivElement>(null)

  const modeConfigs = {
    refined: {
      title: "Meet Biff - Your AI Bartender",
      subtitle: "Austin's Most Sophisticated Party Planning Intelligence",
      description: "Advanced AI-powered event curation with deep Austin expertise and professional service standards",
      videoSrc: "/videos/hero/luxury-wedding.mp4",
      placeholder: "Describe your event vision (e.g., 'Sophisticated rooftop wedding for 200 guests with Hill Country views')",
      thoughts: [
        "Analyzing Austin venue compatibility...",
        "Cross-referencing seasonal cocktail trends...",
        "Calculating optimal service ratios...",
        "Evaluating premium supplier networks...",
        "Designing bespoke beverage programs...",
        "Optimizing logistics for seamless execution...",
        "Finalizing expert-level recommendations..."
      ]
    },
    wild: {
      title: "BIFF UNLEASHED - AI PARTY ARCHITECT", 
      subtitle: "MAXIMUM CHAOS ENGINEERING PROTOCOL ACTIVATED",
      description: "LEGENDARY PARTY INTELLIGENCE WITH ZERO LIMITS AND AUSTIN ATTITUDE",
      videoSrc: "/social_biff01_Austin_music_festival_crowd_going_wild_stage_lights_cr_073e551a-07a8-4bc6-a593-dfd47c0472d1_1.mp4",
      placeholder: "UNLEASH YOUR WILDEST PARTY VISION",
      thoughts: [
        "SCANNING AUSTIN FOR MAXIMUM PARTY POTENTIAL...",
        "DEPLOYING LEGENDARY EVENT PROTOCOLS...",
        "CALCULATING EPIC SCALE POSSIBILITIES...",
        "ACTIVATING NETWORK OF PARTY SPECIALISTS...",
        "ENGINEERING UNFORGETTABLE EXPERIENCES...",
        "MAXIMIZING CELEBRATION IMPACT VECTORS...",
        "INITIATING LEGENDARY STATUS CONFIRMATION..."
      ]
    }
  }

  const currentConfig = modeConfigs[mode]

  const simulateAIThinking = async () => {
    setIsProcessing(true)
    setShowThoughts(true)
    setAiThoughts([])
    setResponse('')

    // Simulate AI processing with thoughts
    for (let i = 0; i < currentConfig.thoughts.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setAiThoughts(prev => [...prev, currentConfig.thoughts[i]])
      
      if (thoughtsRef.current) {
        thoughtsRef.current.scrollTop = thoughtsRef.current.scrollHeight
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // Generate sophisticated response
    const mockResponse = mode === 'refined' 
      ? `BIFF'S EXPERT ANALYSIS & RECOMMENDATIONS:

VENUE OPTIMIZATION:
• Strategic positioning for 150+ guests with Austin skyline backdrop
• Climate-controlled beverage stations with premium glassware
• Coordinated lighting to complement golden hour timing

BEVERAGE PROGRAM:
• Signature cocktails featuring local TX distilleries (Tito's, Deep Eddy)
• Wine selection: Hill Country vintages + California imports
• Premium bar setup with certified mixology team

SERVICE EXECUTION:
• 4-hour premium service with setup/breakdown included
• Dedicated event coordinator for seamless operation
• Emergency contingency protocols activated

INVESTMENT: $3,299 (includes all service, setup, premium selections)`

      : `BIFF'S LEGENDARY PARTY BLUEPRINT:

MAXIMUM IMPACT STRATEGY:
• EPIC scale coordination for legendary Austin celebration
• AMPLIFIED experiences that break conventional limits
• REALITY-WARPING entertainment integration protocols

PARTY ARSENAL DEPLOYMENT:
• WEAPONIZED cocktail stations with extreme flavor profiles
• AMPLIFIED sound integration with professional DJ coordination
• LEGENDARY photo/video documentation for maximum social impact

EXECUTION PARAMETERS:
• ELITE party squad deployment (6+ specialists)
• MAXIMUM coverage protocols (8+ hours)
• LEGENDARY status guarantee with backup contingencies

TOTAL INVESTMENT: $4,999 (LEGENDARY TIER PACKAGE)`

    setResponse(mockResponse)
    setIsProcessing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim()) {
      simulateAIThinking()
    }
  }

  return (
    <>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['refined', 'wild'] as const}
        currentMode={mode}
        onModeChange={setMode}
        modeLabels={{
          refined: 'Refined Intelligence',
          wild: 'Wild Protocol'
        }}
        modeColors={{
          refined: 'bg-gradient-to-r from-slate-600 to-slate-800',
          wild: 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500'
        }}
        label="AI MODE"
      />

      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={currentConfig.videoSrc}
        fallbackImage={mode === 'wild' 
          ? "/biff01_Neon-lit_Austin_6th_Street_at_night_vibrant_party_atmo_3117185a-bdab-453c-9ca8-675cd5581dc5_0.png"
          : "/biff01_Elegant_rooftop_wedding_reception_in_downtown_Austin_wi_5fc4bb9f-4e50-4e09-a0e0-3a0d8bb93b76_1.png"
        }
      />

      {/* Main AI Interface */}
      <section className={`relative py-24 ${mode === 'wild' ? 'bg-black' : 'bg-gradient-to-b from-slate-50 to-white'}`}>
        <div className="absolute inset-0">
          {/* Sophisticated background pattern */}
          <div className={`absolute inset-0 ${mode === 'wild' ? 'opacity-10' : 'opacity-5'}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-current to-transparent" />
          </div>
        </div>

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            
            {/* Left Column - AI Bartender */}
            <div className="space-y-8">
              <div className={`relative rounded-3xl overflow-hidden ${mode === 'wild' ? 'shadow-[0_0_50px_rgba(251,191,36,0.3)]' : 'shadow-2xl'}`}>
                <div className={`absolute inset-0 ${mode === 'wild' ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20' : 'bg-gradient-to-br from-slate-100/50 to-white/50'} backdrop-blur-sm`} />
                <Image
                  src="/biff01_an_AI_bartender_wearing_a_comboy_hat_like_a_cowboy_who_9d615e7e-3a4c-405f-b2d7-c79648bd0534_3.png"
                  alt="Biff - AI Bartender"
                  width={600}
                  height={600}
                  className="relative z-10 w-full h-auto"
                />
                <div className={`absolute bottom-0 left-0 right-0 p-8 ${mode === 'wild' ? 'bg-gradient-to-t from-black via-black/80 to-transparent' : 'bg-gradient-to-t from-white via-white/90 to-transparent'}`}>
                  <h3 className={`text-2xl font-bold mb-2 ${mode === 'wild' ? 'text-orange-400' : 'text-slate-800'}`}>
                    Meet Biff
                  </h3>
                  <p className={`${mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}`}>
                    {mode === 'wild' 
                      ? 'Austin\'s Most Legendary AI Party Architect' 
                      : 'Your Expert AI Event Planning Specialist'
                    }
                  </p>
                </div>
              </div>

              {/* AI Capabilities */}
              <div className={`p-8 rounded-2xl ${mode === 'wild' ? 'bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-orange-500/30' : 'bg-white shadow-lg border border-slate-200'}`}>
                <h4 className={`text-xl font-bold mb-6 ${mode === 'wild' ? 'text-orange-400' : 'text-slate-800'}`}>
                  {mode === 'wild' ? 'LEGENDARY CAPABILITIES' : 'Expert Capabilities'}
                </h4>
                <div className="space-y-4">
                  {(mode === 'wild' ? [
                    'MAXIMUM party impact analysis',
                    'LEGENDARY venue coordination', 
                    'EPIC scale event logistics',
                    'REALITY-WARPING experience design'
                  ] : [
                    'Advanced event requirement analysis',
                    'Premium vendor network integration',
                    'Sophisticated logistics coordination',
                    'Bespoke experience curation'
                  ]).map((capability, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${mode === 'wild' ? 'bg-orange-500' : 'bg-slate-400'}`} />
                      <span className={`${mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}`}>
                        {capability}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Interface */}
            <div className="space-y-8">
              {/* Input Interface */}
              <form onSubmit={handleSubmit}>
                <div className={`relative rounded-2xl overflow-hidden ${
                  mode === 'wild' 
                    ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 p-1' 
                    : 'bg-gradient-to-r from-slate-200 to-slate-300 p-1'
                }`}>
                  <div className={`relative ${mode === 'wild' ? 'bg-black' : 'bg-white'} rounded-xl p-8`}>
                    <label className={`block text-sm font-semibold mb-4 ${
                      mode === 'wild' ? 'text-orange-400' : 'text-slate-700'
                    }`}>
                      DESCRIBE YOUR EVENT VISION
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={currentConfig.placeholder}
                      rows={5}
                      className={`w-full px-6 py-4 rounded-lg border-2 transition-all resize-none ${
                        mode === 'wild'
                          ? 'bg-gray-900 border-orange-500/50 text-orange-100 placeholder:text-orange-500/50 focus:border-orange-400 focus:shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                          : 'bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:shadow-lg'
                      } focus:outline-none`}
                      disabled={isProcessing}
                    />
                    
                    <button
                      type="submit"
                      disabled={isProcessing || !userInput.trim()}
                      className={`mt-6 w-full py-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        mode === 'wild'
                          ? 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]'
                          : 'bg-gradient-to-r from-slate-700 to-slate-900 text-white hover:shadow-lg'
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" />
                          Processing Analysis...
                        </span>
                      ) : (
                        mode === 'wild' ? 'ACTIVATE LEGENDARY PROTOCOL' : 'Initiate Expert Analysis'
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* AI Processing Thoughts */}
              {showThoughts && (
                <div className={`rounded-2xl overflow-hidden ${
                  mode === 'wild' 
                    ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 p-1' 
                    : 'bg-gradient-to-r from-slate-100 to-slate-200 p-1'
                }`}>
                  <div className={`${mode === 'wild' ? 'bg-gray-900' : 'bg-white'} rounded-xl p-6`}>
                    <h3 className={`text-sm font-mono font-bold mb-4 ${
                      mode === 'wild' ? 'text-orange-400' : 'text-slate-600'
                    }`}>
                      BIFF PROCESSING STATUS:
                    </h3>
                    <div 
                      ref={thoughtsRef}
                      className="max-h-48 overflow-y-auto space-y-3 scrollbar-hide"
                    >
                      {aiThoughts.map((thought, index) => (
                        <div
                          key={index}
                          className={`text-sm font-mono flex items-center space-x-3 animate-fade-in ${
                            mode === 'wild' ? 'text-orange-300' : 'text-slate-600'
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className={`w-2 h-2 rounded-full ${mode === 'wild' ? 'bg-orange-500' : 'bg-slate-400'} animate-pulse`} />
                          <span>{thought}</span>
                        </div>
                      ))}
                      {isProcessing && (
                        <div className={`text-sm font-mono flex items-center space-x-3 ${
                          mode === 'wild' ? 'text-orange-400' : 'text-slate-500'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${mode === 'wild' ? 'bg-orange-500' : 'bg-slate-400'} animate-ping`} />
                          <span>Processing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {response && !isProcessing && (
                <div className={`rounded-2xl overflow-hidden animate-fade-in ${
                  mode === 'wild' 
                    ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 p-1' 
                    : 'bg-gradient-to-r from-slate-200 to-slate-300 p-1'
                }`}>
                  <div className={`${mode === 'wild' ? 'bg-black' : 'bg-white'} rounded-xl p-8`}>
                    <h3 className={`text-2xl font-bold mb-6 ${
                      mode === 'wild' 
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400' 
                        : 'text-slate-800'
                    }`}>
                      Expert Analysis Complete
                    </h3>
                    <div className={`whitespace-pre-line font-mono text-sm leading-relaxed ${
                      mode === 'wild' ? 'text-orange-100' : 'text-slate-700'
                    }`}>
                      {response}
                    </div>
                    <div className="mt-8 flex gap-4">
                      <button className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                        mode === 'wild'
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}>
                        Proceed with This Plan
                      </button>
                      <button 
                        onClick={() => {
                          setUserInput('')
                          setResponse('')
                          setShowThoughts(false)
                          setAiThoughts([])
                        }}
                        className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                          mode === 'wild'
                            ? 'border-2 border-orange-500 text-orange-400 hover:bg-orange-500/10'
                            : 'border-2 border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        New Analysis
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className={`py-20 ${mode === 'wild' ? 'bg-gradient-to-b from-black to-gray-900' : 'bg-slate-100'}`}>
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-4 ${
              mode === 'wild' 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400' 
                : 'text-slate-800'
            }`}>
              {mode === 'wild' ? 'LEGENDARY AI ARCHITECTURE' : 'Advanced AI Architecture'}
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}`}>
              {mode === 'wild' 
                ? 'Powered by LEGENDARY algorithms and Austin expertise networks for MAXIMUM party impact'
                : 'Powered by sophisticated machine learning and extensive Austin hospitality networks'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(mode === 'wild' ? [
              {
                title: 'LEGENDARY PROCESSING',
                description: 'MAXIMUM computational power for EPIC event analysis and coordination'
              },
              {
                title: 'NETWORK AMPLIFICATION', 
                description: 'LEGENDARY vendor relationships and REALITY-WARPING logistics coordination'
              },
              {
                title: 'PRECISION EXECUTION',
                description: 'FLAWLESS delivery protocols with LEGENDARY status guarantees'
              }
            ] : [
              {
                title: 'Deep Learning Analysis',
                description: 'Advanced pattern recognition for optimal event planning and resource allocation'
              },
              {
                title: 'Network Integration',
                description: 'Seamless coordination with Austin\'s premium vendor and venue networks'
              },
              {
                title: 'Precision Execution',
                description: 'Real-time optimization and quality assurance for flawless event delivery'
              }
            ]).map((spec, index) => (
              <div 
                key={index}
                className={`p-8 rounded-2xl text-center transition-all hover:scale-105 ${
                  mode === 'wild'
                    ? 'bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-orange-500/30'
                    : 'bg-white shadow-lg hover:shadow-xl border border-slate-200'
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${
                  mode === 'wild' ? 'text-orange-400' : 'text-slate-800'
                }`}>
                  {spec.title}
                </h3>
                <p className={mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}>
                  {spec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTA
        title={mode === 'wild' ? "READY FOR LEGENDARY AI PARTY PLANNING?" : "Experience AI-Powered Event Excellence"}
        description={mode === 'wild' 
          ? "Let Biff architect your most LEGENDARY celebration. EPIC results guaranteed with Austin attitude."
          : "Discover the future of sophisticated event planning with Biff's expert AI analysis and Austin expertise."
        }
        primaryButtonText="Start Planning"
        primaryButtonLink="#"
        secondaryButtonText="Learn More"
        secondaryButtonLink="/how-it-works"
      />

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}
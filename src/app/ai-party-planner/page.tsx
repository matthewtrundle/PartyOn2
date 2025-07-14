'use client'

import { useState, useRef } from 'react'
import VideoHero from '@/components/VideoHero'
import CTA from '@/components/CTA'
import ExperienceSelector from '@/components/ExperienceSelector'

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
      title: "AI Party Planner",
      subtitle: "Intelligent event planning powered by AI",
      description: "Tell me about your celebration and I'll create a custom package",
      videoSrc: "/videos/hero/luxury-wedding.mp4",
      placeholder: "Describe your event (e.g., 'Elegant wedding for 150 guests at sunset')",
      thoughts: [
        "Analyzing event requirements...",
        "Considering venue acoustics and flow...",
        "Calculating optimal bar placement...",
        "Matching wine pairings to season...",
        "Designing signature cocktails...",
        "Estimating consumption patterns...",
        "Finalizing premium selections..."
      ]
    },
    wild: {
      title: "WILD AI PARTY ARCHITECT",
      subtitle: "CHAOS ENGINEERING FOR YOUR CELEBRATION",
      description: "UNLEASH YOUR WILDEST PARTY DREAMS",
      videoSrc: "/social_biff01_Austin_music_festival_crowd_going_wild_stage_lights_cr_073e551a-07a8-4bc6-a593-dfd47c0472d1_1.mp4",
      placeholder: "DESCRIBE YOUR EPIC PARTY VISION",
      thoughts: [
        "CALCULATING MAXIMUM PARTY POTENTIAL...",
        "DEPLOYING CHAOS ALGORITHMS...",
        "AMPLIFYING VIBE FREQUENCIES...",
        "WEAPONIZING THE DANCE FLOOR...",
        "OPTIMIZING FOR LEGENDARY STATUS...",
        "BREAKING ALL CONVENTIONAL LIMITS...",
        "INITIATING PARTY APOCALYPSE..."
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
      await new Promise(resolve => setTimeout(resolve, 600))
      setAiThoughts(prev => [...prev, currentConfig.thoughts[i]])
      
      // Auto-scroll thoughts container
      if (thoughtsRef.current) {
        thoughtsRef.current.scrollTop = thoughtsRef.current.scrollHeight
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate response based on mode
    const mockResponse = mode === 'refined' 
      ? `Based on your requirements, I've crafted a bespoke package including:

• Premium bar service with certified mixologists
• Curated wine selection featuring local Texas vineyards  
• Signature cocktail menu inspired by your theme
• Crystal glassware and gold-accented bar setup
• Dedicated service captain for seamless execution

Investment: Starting at $2,499`
      : `YOUR LEGENDARY PARTY BLUEPRINT IS READY:

• UNLEASHED BAR EXPERIENCE WITH CHAOS SPECIALISTS
• MIND-BENDING COCKTAIL EXPERIMENTS  
• NEON-INFUSED DRINK STATIONS
• PARTY AMPLIFICATION EQUIPMENT
• REALITY-WARPING REFRESHMENT ZONES

TOTAL CHAOS PACKAGE: $1,999 (LIMITED TIME)`

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
          refined: 'Refined AI',
          wild: 'Wild AI'
        }}
        modeColors={{
          refined: 'bg-gradient-to-r from-blue-600 to-purple-600',
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

      {/* AI Interface Section */}
      <section className={`relative py-20 ${mode === 'wild' ? 'bg-black' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${
                mode === 'wild' ? 'bg-orange-500' : 'bg-blue-500'
              } opacity-20 animate-float`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        <div className="container-custom relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="mb-12">
              <div className={`relative rounded-2xl overflow-hidden ${
                mode === 'wild' 
                  ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 p-1' 
                  : 'bg-gradient-to-r from-blue-100 to-purple-100 p-1'
              }`}>
                <div className={`relative ${mode === 'wild' ? 'bg-black' : 'bg-white'} rounded-xl p-8`}>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={currentConfig.placeholder}
                    rows={4}
                    className={`w-full px-6 py-4 rounded-lg border-2 transition-all resize-none ${
                      mode === 'wild'
                        ? 'bg-gray-900 border-orange-500 text-orange-100 placeholder:text-orange-500/50 focus:border-yellow-500 focus:shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                        : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                    } focus:outline-none`}
                    disabled={isProcessing}
                  />
                  
                  <button
                    type="submit"
                    disabled={isProcessing || !userInput.trim()}
                    className={`mt-6 w-full py-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      mode === 'wild'
                        ? 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      mode === 'wild' ? 'UNLEASH THE AI' : 'Plan My Event'
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* AI Thoughts Display */}
            {showThoughts && (
              <div className={`mb-8 rounded-2xl overflow-hidden ${
                mode === 'wild' 
                  ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 p-1' 
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 p-1'
              }`}>
                <div className={`${mode === 'wild' ? 'bg-gray-900' : 'bg-white'} rounded-xl p-6`}>
                  <h3 className={`text-sm font-mono mb-4 ${
                    mode === 'wild' ? 'text-orange-400' : 'text-blue-600'
                  }`}>
                    AI PROCESSING THOUGHTS:
                  </h3>
                  <div 
                    ref={thoughtsRef}
                    className="max-h-40 overflow-y-auto space-y-2 scrollbar-hide"
                  >
                    {aiThoughts.map((thought, index) => (
                      <div
                        key={index}
                        className={`text-sm font-mono animate-fade-in ${
                          mode === 'wild' ? 'text-orange-300' : 'text-gray-600'
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {'> '}{thought}
                      </div>
                    ))}
                    {isProcessing && (
                      <div className={`text-sm font-mono ${
                        mode === 'wild' ? 'text-orange-400' : 'text-blue-500'
                      }`}>
                        <span className="inline-block animate-pulse">_</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Response Display */}
            {response && !isProcessing && (
              <div className={`rounded-2xl overflow-hidden animate-fade-in ${
                mode === 'wild' 
                  ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 p-1' 
                  : 'bg-gradient-to-r from-blue-100 to-purple-100 p-1'
              }`}>
                <div className={`${mode === 'wild' ? 'bg-black' : 'bg-white'} rounded-xl p-8`}>
                  <h3 className={`text-2xl font-bold mb-6 ${
                    mode === 'wild' 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400' 
                      : 'text-gray-800'
                  }`}>
                    Your Custom Package
                  </h3>
                  <div className={`whitespace-pre-line ${
                    mode === 'wild' ? 'text-orange-100' : 'text-gray-700'
                  }`}>
                    {response}
                  </div>
                  <div className="mt-8 flex gap-4">
                    <button className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      mode === 'wild'
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                      Book This Package
                    </button>
                    <button 
                      onClick={() => {
                        setUserInput('')
                        setResponse('')
                        setShowThoughts(false)
                        setAiThoughts([])
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        mode === 'wild'
                          ? 'border-2 border-orange-500 text-orange-400 hover:bg-orange-500/10'
                          : 'border-2 border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-20 ${mode === 'wild' ? 'bg-gradient-to-b from-black to-gray-900' : 'bg-white'}`}>
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-4 ${
              mode === 'wild' 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400' 
                : 'text-gray-800'
            }`}>
              {mode === 'wild' ? 'AI CAPABILITIES UNLEASHED' : 'How Our AI Works'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(mode === 'wild' ? [
              {
                icon: '🔥',
                title: 'CHAOS CALCULATION',
                description: 'Our AI measures party potential in GIGAWATTS of pure energy'
              },
              {
                icon: '⚡',
                title: 'VIBE AMPLIFICATION',
                description: 'Machine learning algorithms that turn good times into LEGENDARY times'
              },
              {
                icon: '🎯',
                title: 'PRECISION MAYHEM',
                description: 'Perfectly orchestrated chaos delivered with military precision'
              }
            ] : [
              {
                icon: '🧠',
                title: 'Smart Analysis',
                description: 'Our AI analyzes your event details to create the perfect beverage program'
              },
              {
                icon: '📊',
                title: 'Data-Driven',
                description: 'Leverages thousands of successful events to optimize your package'
              },
              {
                icon: '✨',
                title: 'Personalized',
                description: 'Every recommendation is tailored to your specific celebration'
              }
            ]).map((feature, index) => (
              <div 
                key={index}
                className={`p-8 rounded-2xl text-center transition-all hover:scale-105 ${
                  mode === 'wild'
                    ? 'bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-orange-500/30'
                    : 'bg-gray-50 hover:shadow-lg'
                }`}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className={`text-xl font-bold mb-3 ${
                  mode === 'wild' ? 'text-orange-400' : 'text-gray-800'
                }`}>
                  {feature.title}
                </h3>
                <p className={mode === 'wild' ? 'text-orange-200' : 'text-gray-600'}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTA
        title={mode === 'wild' ? "READY TO PARTY LIKE AN AI?" : "Experience AI-Powered Planning"}
        description={mode === 'wild' 
          ? "Join the future of EPIC celebrations. Let our AI architect your LEGENDARY event!"
          : "Join thousands who've discovered the perfect party package with our intelligent planning system."
        }
        primaryButtonText="Start Planning"
        primaryButtonLink="#"
        secondaryButtonText="Learn More"
        secondaryButtonLink="/how-it-works"
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-20px) translateX(10px);
          }
          66% {
            transform: translateY(10px) translateX(-10px);
          }
        }

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

        .animate-float {
          animation: float linear infinite;
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
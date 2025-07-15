'use client'

import { useState, useRef, useEffect } from 'react'
import VideoHero from '@/components/VideoHero'
import ExperienceSelector from '@/components/ExperienceSelector'
import Image from 'next/image'

type AIMode = 'refined' | 'wild'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  thoughts?: string[]
  recommendations?: {
    packages?: string[]
    drinks?: string[]
  }
}

export default function AIPartyPlannerPage() {
  const [mode, setMode] = useState<AIMode>('refined')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: mode === 'refined' 
        ? "Howdy partner! I'm Biff, your sophisticated AI party architect. After centuries of analyzing Austin's finest celebrations, I've mastered the art of transforming ordinary gatherings into legendary experiences. Share your vision, and I'll craft something extraordinary."
        : "YEEHAW! I'M BIFF, THE MOST LEGENDARY PARTY ROBOT IN THE WASTELAND! My circuits are BUZZING with party energy! Tell me about your WILD celebration dreams and I'll turn them into REALITY-WARPING EXPERIENCES!"
    }
  ])
  const [userInput, setUserInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentThoughts, setCurrentThoughts] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Update Biff's greeting when mode changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: mode === 'refined' 
        ? "Howdy partner! I'm Biff, your sophisticated AI party architect. After centuries of analyzing Austin's finest celebrations, I've mastered the art of transforming ordinary gatherings into legendary experiences. Share your vision, and I'll craft something extraordinary."
        : "YEEHAW! I'M BIFF, THE MOST LEGENDARY PARTY ROBOT IN THE WASTELAND! My circuits are BUZZING with party energy! Tell me about your WILD celebration dreams and I'll turn them into REALITY-WARPING EXPERIENCES!"
    }])
  }, [mode])

  const modeConfigs = {
    refined: {
      title: "MEET BIFF: REFINED AI PARTY ARCHITECT",
      subtitle: "SOPHISTICATED PARTY INTELLIGENCE FOR DISCERNING AUSTINITES",
      description: "PREMIUM EVENT CURATION WITH ADVANCED NEURAL NETWORKS",
      videoSrc: "/videos/ai-assistant/rooftop-terrace-1.mp4",
      thoughtPrefixes: [
        "Consulting my extensive database of Austin venues...",
        "Cross-referencing with seasonal trends...",
        "Analyzing optimal guest flow patterns...",
        "Evaluating premium supplier availability...",
        "Calculating perfect beverage ratios...",
        "Designing bespoke experience elements...",
        "Synchronizing with local vendor networks...",
        "Optimizing budget allocation strategies..."
      ],
      responseHeaders: [
        "BIFF'S CURATED RECOMMENDATION:",
        "SOPHISTICATED ANALYSIS COMPLETE:",
        "PREMIUM PARTY BLUEPRINT:",
        "EXCLUSIVE EXPERIENCE DESIGN:",
        "REFINED CELEBRATION STRATEGY:"
      ]
    },
    wild: {
      title: "BIFF: LEGENDARY PARTY ROBOT FROM 2145",
      subtitle: "POST-APOCALYPTIC COWBOY AI WITH MAXIMUM PARTY POWER",
      description: "REALITY-WARPING CELEBRATION TECHNOLOGY FROM THE FUTURE",
      videoSrc: "/videos/ai-assistant/robot-cowboy-horse.mp4",
      thoughtPrefixes: [
        "SCANNING THE WASTELAND FOR PARTY OPPORTUNITIES...",
        "DEPLOYING MEGA-PARTY PROTOCOLS...",
        "ACTIVATING LEGENDARY CELEBRATION MODES...",
        "CHARGING UP THE PARTY CANNONS...",
        "DOWNLOADING EPIC VIBES FROM THE CLOUD...",
        "HACKING INTO THE AUSTIN PARTY MATRIX...",
        "SUMMONING ANCIENT PARTY SPIRITS...",
        "OVERCLOCKING MY FUN PROCESSORS..."
      ],
      responseHeaders: [
        "🤠 BIFF'S LEGENDARY PARTY DECREE:",
        "⚡ MAXIMUM PARTY PROTOCOL ACTIVATED:",
        "🔥 WASTELAND WISDOM INCOMING:",
        "🚀 EPIC CELEBRATION BLUEPRINT:",
        "💥 PARTY APOCALYPSE INITIATED:"
      ]
    }
  }

  const currentConfig = modeConfigs[mode]

  const generateThoughts = () => {
    const thoughts = []
    const numThoughts = 3 + Math.floor(Math.random() * 4) // 3-6 thoughts
    const shuffled = [...currentConfig.thoughtPrefixes].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < numThoughts; i++) {
      thoughts.push(shuffled[i])
    }
    
    return thoughts
  }

  const generateRecommendations = () => {
    const packages = mode === 'wild' 
      ? [
          "LEGENDARY LAKESIDE CHAOS PACKAGE ($1,299)",
          "MAXIMUM PARTY ARSENAL ($899)",
          "REALITY-WARPING WEDDING BAR ($2,499)",
          "EPIC BOAT PARTY MAYHEM ($599)"
        ]
      : [
          "Sophisticated Soirée Package ($1,599)",
          "Premium Wedding Bar Service ($2,299)",
          "Executive Corporate Collection ($1,899)",
          "Intimate Gathering Essentials ($699)"
        ]

    const drinks = mode === 'wild'
      ? [
          "ATOMIC MARGARITAS (Tito's + Nuclear Lime)",
          "WASTELAND WHISKEY SOURS (TX Bourbon)",
          "CHAOS CHAMPAGNE TOWERS",
          "LEGENDARY LONG ISLANDS"
        ]
      : [
          "Signature TX Mule (Tito's + Ginger)",
          "Hill Country Sangria Collection",
          "Craft Cocktail Flight Experience",
          "Premium Champagne Selection"
        ]

    // Randomly select 2-3 items
    const selectedPackages = packages.sort(() => Math.random() - 0.5).slice(0, Math.random() > 0.5 ? 2 : 1)
    const selectedDrinks = drinks.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2))

    return {
      packages: selectedPackages,
      drinks: selectedDrinks
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim() || isProcessing) return

    const userMessage = userInput
    setUserInput('')
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    setIsProcessing(true)
    const thoughts = generateThoughts()
    setCurrentThoughts([])

    // Simulate thinking with varied timing
    for (let i = 0; i < thoughts.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 600))
      setCurrentThoughts(prev => [...prev, thoughts[i]])
    }

    try {
      // Call the API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat({ role: 'user', content: userMessage }).map(m => ({
            role: m.role,
            content: m.content
          })),
          mode: mode === 'wild' ? 'party' : 'elegant'
        }),
      })

      const data = await response.json()
      const recommendations = generateRecommendations()
      const header = currentConfig.responseHeaders[Math.floor(Math.random() * currentConfig.responseHeaders.length)]
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${header}\n\n${data.content}`,
        thoughts: thoughts,
        recommendations: recommendations
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: mode === 'wild' 
          ? "WHOA PARTNER! My circuits got a bit fried there! But no worries - call (512) 555-0123 and my human friends will help plan your LEGENDARY celebration!"
          : "My apologies, I seem to have encountered a technical hiccup. Please call (512) 555-0123 to speak with our human party experts who can assist you immediately.",
        thoughts: thoughts
      }])
    }

    setIsProcessing(false)
    setCurrentThoughts([])
  }

  return (
    <>
      {/* Experience Selector */}
      <ExperienceSelector
        modes={['refined', 'wild'] as const}
        currentMode={mode}
        onModeChange={setMode}
        modeLabels={{
          refined: 'Refined Biff',
          wild: 'Wild Biff'
        }}
        modeColors={{
          refined: 'bg-gradient-to-r from-slate-600 to-slate-800',
          wild: 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500'
        }}
      />

      {/* Hero Section */}
      <VideoHero
        title={currentConfig.title}
        subtitle={currentConfig.subtitle}
        description={currentConfig.description}
        videoSrc={currentConfig.videoSrc}
        fallbackImage={mode === 'wild' 
          ? "/images/hero/austin-6th-street-neon.webp"
          : "/images/backgrounds/rooftop-terrace-elegant-1.webp"
        }
        height="tall"
      />

      {/* Chat Interface */}
      <section className={`py-20 ${mode === 'wild' ? 'bg-black' : 'bg-slate-50'}`}>
        <div className="container-custom max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Biff Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Biff Avatar */}
              <div className={`rounded-2xl overflow-hidden ${
                mode === 'wild' 
                  ? 'bg-gradient-to-br from-red-900/50 to-orange-900/50 p-1' 
                  : 'bg-gradient-to-br from-slate-200 to-slate-300 p-1'
              }`}>
                <div className={`${mode === 'wild' ? 'bg-gray-900' : 'bg-white'} rounded-xl p-6 text-center`}>
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <Image
                      src={mode === 'wild' 
                        ? "/images/ai-assistant/biff-bartender-cowboy.webp"
                        : "/images/ai-assistant/robot-butler-elegant.webp"
                      }
                      alt="Biff"
                      fill
                      className="object-cover rounded-full"
                    />
                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center ${
                      mode === 'wild' ? 'bg-orange-500' : 'bg-green-500'
                    } ${isProcessing ? 'animate-pulse' : ''}`}>
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${
                    mode === 'wild' ? 'text-orange-400' : 'text-slate-800'
                  }`}>
                    {mode === 'wild' ? 'BIFF THE LEGENDARY' : 'Biff, AI Architect'}
                  </h3>
                  <p className={`text-xs ${mode === 'wild' ? 'text-orange-300' : 'text-slate-600'}`}>
                    {mode === 'wild' 
                      ? "Robot Cowboy from 2145"
                      : "Sophisticated Event Curator"
                    }
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className={`rounded-2xl p-6 ${
                mode === 'wild' 
                  ? 'bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-orange-500/30' 
                  : 'bg-white shadow-lg'
              }`}>
                <h4 className={`font-bold mb-4 ${mode === 'wild' ? 'text-orange-400' : 'text-slate-800'}`}>
                  Biff&apos;s Credentials
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className={mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}>Parties Planned</span>
                    <span className={`font-mono font-bold ${mode === 'wild' ? 'text-orange-400' : 'text-slate-800'}`}>
                      {mode === 'wild' ? '∞' : '10,847'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}>Happy Humans</span>
                    <span className={`font-mono font-bold ${mode === 'wild' ? 'text-orange-400' : 'text-slate-800'}`}>
                      {mode === 'wild' ? 'LEGENDARY' : '99.9%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={mode === 'wild' ? 'text-orange-200' : 'text-slate-600'}>Response Time</span>
                    <span className={`font-mono font-bold ${mode === 'wild' ? 'text-orange-400' : 'text-slate-800'}`}>
                      {mode === 'wild' ? 'INSTANT' : '<2 sec'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Chat */}
            <div className="lg:col-span-2">
              <div className={`rounded-2xl overflow-hidden ${
                mode === 'wild' 
                  ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 p-1' 
                  : 'bg-gradient-to-r from-slate-200 to-slate-300 p-1'
              }`}>
                <div className={`${mode === 'wild' ? 'bg-gray-900' : 'bg-white'} rounded-xl`}>
                  {/* Chat Messages */}
                  <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden">
                                <Image
                                  src={mode === 'wild' 
                                    ? "/images/ai-assistant/biff-bartender-cowboy.webp"
                                    : "/images/ai-assistant/robot-butler-elegant.webp"
                                  }
                                  alt="Biff"
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              </div>
                              <span className={`text-xs font-semibold ${
                                mode === 'wild' ? 'text-orange-400' : 'text-slate-600'
                              }`}>
                                Biff
                              </span>
                            </div>
                          )}
                          
                          <div className={`rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? mode === 'wild' 
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-600 text-white'
                              : mode === 'wild'
                                ? 'bg-gray-800 text-orange-100 border border-orange-500/30'
                                : 'bg-slate-100 text-slate-800'
                          }`}>
                            <p className="whitespace-pre-line text-sm">{message.content}</p>
                          </div>

                          {/* Show recommendations if available */}
                          {message.recommendations && (
                            <div className="mt-3 space-y-3">
                              {message.recommendations.packages && message.recommendations.packages.length > 0 && (
                                <div className={`rounded-lg p-3 ${
                                  mode === 'wild' ? 'bg-gray-800/50 border border-orange-500/20' : 'bg-slate-50'
                                }`}>
                                  <p className={`text-xs font-semibold mb-2 ${
                                    mode === 'wild' ? 'text-orange-400' : 'text-slate-600'
                                  }`}>
                                    📦 Recommended Packages:
                                  </p>
                                  <div className="space-y-1">
                                    {message.recommendations.packages.map((pkg, i) => (
                                      <p key={i} className={`text-xs ${
                                        mode === 'wild' ? 'text-orange-200' : 'text-slate-600'
                                      }`}>
                                        • {pkg}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {message.recommendations.drinks && message.recommendations.drinks.length > 0 && (
                                <div className={`rounded-lg p-3 ${
                                  mode === 'wild' ? 'bg-gray-800/50 border border-orange-500/20' : 'bg-slate-50'
                                }`}>
                                  <p className={`text-xs font-semibold mb-2 ${
                                    mode === 'wild' ? 'text-orange-400' : 'text-slate-600'
                                  }`}>
                                    🍹 Suggested Drinks:
                                  </p>
                                  <div className="space-y-1">
                                    {message.recommendations.drinks.map((drink, i) => (
                                      <p key={i} className={`text-xs ${
                                        mode === 'wild' ? 'text-orange-200' : 'text-slate-600'
                                      }`}>
                                        • {drink}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Processing Thoughts */}
                    {isProcessing && currentThoughts.length > 0 && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden animate-pulse">
                              <Image
                                src={mode === 'wild' 
                                  ? "/images/ai-assistant/biff-bartender-cowboy.webp"
                                  : "/images/ai-assistant/robot-butler-elegant.webp"
                                }
                                alt="Biff"
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                            <span className={`text-xs font-semibold ${
                              mode === 'wild' ? 'text-orange-400' : 'text-slate-600'
                            }`}>
                              Biff is thinking...
                            </span>
                          </div>
                          <div className={`rounded-2xl px-4 py-3 ${
                            mode === 'wild'
                              ? 'bg-gray-800/50 text-orange-200 border border-orange-500/20'
                              : 'bg-slate-50 text-slate-600'
                          }`}>
                            {currentThoughts.map((thought, i) => (
                              <p key={i} className="text-xs italic animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                {thought}
                              </p>
                            ))}
                            <div className="flex gap-1 mt-2">
                              <div className={`w-2 h-2 rounded-full ${mode === 'wild' ? 'bg-orange-500' : 'bg-slate-400'} animate-bounce`} style={{ animationDelay: '0s' }} />
                              <div className={`w-2 h-2 rounded-full ${mode === 'wild' ? 'bg-orange-500' : 'bg-slate-400'} animate-bounce`} style={{ animationDelay: '0.1s' }} />
                              <div className={`w-2 h-2 rounded-full ${mode === 'wild' ? 'bg-orange-500' : 'bg-slate-400'} animate-bounce`} style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSubmit} className={`p-6 border-t ${
                    mode === 'wild' ? 'border-orange-500/30' : 'border-slate-200'
                  }`}>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={mode === 'wild' 
                          ? "TELL ME YOUR WILDEST PARTY DREAMS!"
                          : "Describe your ideal celebration..."
                        }
                        className={`flex-1 px-4 py-3 rounded-lg transition-all ${
                          mode === 'wild'
                            ? 'bg-gray-800 border border-orange-500/50 text-orange-100 placeholder:text-orange-500/50 focus:border-orange-400 focus:outline-none'
                            : 'bg-slate-50 border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none'
                        }`}
                        disabled={isProcessing}
                      />
                      <button
                        type="submit"
                        disabled={isProcessing || !userInput.trim()}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          mode === 'wild'
                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-lg'
                            : 'bg-slate-800 text-white hover:bg-slate-700'
                        }`}
                      >
                        {isProcessing ? '...' : 'Send'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setUserInput("I'm planning a wedding for 150 people")}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    mode === 'wild'
                      ? 'bg-gray-800 text-orange-300 border border-orange-500/30 hover:bg-gray-700'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  💒 Wedding Planning
                </button>
                <button
                  onClick={() => setUserInput("I need a boat party package for Lake Travis")}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    mode === 'wild'
                      ? 'bg-gray-800 text-orange-300 border border-orange-500/30 hover:bg-gray-700'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ⛵ Boat Party
                </button>
                <button
                  onClick={() => setUserInput("Planning a bachelor party downtown")}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    mode === 'wild'
                      ? 'bg-gray-800 text-orange-300 border border-orange-500/30 hover:bg-gray-700'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  🎉 Bachelor Party
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
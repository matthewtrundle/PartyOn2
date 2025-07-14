'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface Message {
  text: string
  isUser: boolean
  timestamp: Date
}

export default function AIPartyPlannerPage() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: "Hi! I'm your AI party planning assistant. Tell me about your event and I'll help create the perfect celebration.", 
      isUser: false, 
      timestamp: new Date() 
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mode, setMode] = useState<'refined' | 'wild'>('refined')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (mode === 'wild') {
      if (lowerInput.includes('wedding')) {
        return "WEDDING PARTY TIME! Let's turn your reception into Austin's most legendary celebration. We're talking champagne fountains, signature shots, and a bar setup that'll have guests talking for years. Budget range $3k-10k for absolute mayhem. How wild are we going?"
      }
      if (lowerInput.includes('boat') || lowerInput.includes('lake')) {
        return "LAKE TRAVIS TAKEOVER! Picture this: floating bars, waterproof speakers cranked to 11, and enough party supplies to turn your boat into a floating festival. Full chaos packages from $1,500. What's your vessel situation?"
      }
      if (lowerInput.includes('bachelor') || lowerInput.includes('bachelorette')) {
        return "THE ULTIMATE SEND-OFF! We're building you a legendary night with VIP everything - party bus bars, downtown domination, and recovery brunch that'll save lives. $2k-5k gets you hall-of-fame status. How many party warriors we talking?"
      }
      return "LET'S GET WILD! Tell me about your party vision and I'll craft something EPIC. What kind of chaos are we creating?"
    } else {
      if (lowerInput.includes('wedding')) {
        return "A wedding celebration! I'd recommend our premium bar service starting at $2,500. This includes professional bartenders, custom cocktail menu, and full setup/breakdown. How many guests are you expecting?"
      }
      if (lowerInput.includes('boat') || lowerInput.includes('lake')) {
        return "Lake Travis boat parties are our specialty. We offer cooler delivery ($400-800) or full bartender service ($1,200-2,000). The package depends on boat size and guest count. What type of vessel will you be on?"
      }
      if (lowerInput.includes('bachelor') || lowerInput.includes('bachelorette')) {
        return "Bachelor/bachelorette parties require special attention. Our packages range from $1,500-3,500 and include party bus bar service, VIP venue access, and recovery brunch delivery. What's your group size?"
      }
      if (lowerInput.includes('corporate') || lowerInput.includes('company')) {
        return "For corporate events, we provide professional service with invoicing available. Packages start at $2,000 and include premium spirits, professional staff, and custom branding options. What type of corporate event?"
      }
      return "I'd be happy to help plan your event. Could you tell me more about: the type of celebration, number of guests, and your preferred date? This will help me create the perfect package for you."
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isTyping) return

    // Add user message
    const userMessage: Message = {
      text: inputText,
      isUser: true,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        text: generateAIResponse(inputText),
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000 + Math.random() * 1000)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Spacer for fixed navigation */}
      <div className="h-20 md:h-24" />
      {/* Clean Header with Mode Selector */}
      <div className="border-b border-neutral-200 bg-white/95 backdrop-blur-sm sticky top-20 md:top-24 z-40">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">AI Party Planner</h1>
              <p className="text-sm text-neutral-500 mt-1">Intelligent event planning powered by AI</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Mode Selector */}
              <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('refined')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'refined' 
                      ? 'bg-white text-neutral-900 shadow-sm' 
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Refined
                </button>
                <button
                  onClick={() => setMode('wild')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'wild' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm' 
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Wild
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Active</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Background */}
      <div className="relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={mode === 'wild' ? "/images/hero/neon-nights-hero.jpg" : "/images/hero/austin-skyline-hero.png"}
            alt="Background"
            fill
            className="object-cover opacity-5"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-50/50 to-neutral-50" />
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
          {/* Minimal intro */}
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-light mb-4 transition-all ${
              mode === 'wild' 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600' 
                : 'text-neutral-900'
            }`}>
              {mode === 'wild' ? 'Create something legendary' : 'Plan your perfect event'}
            </h2>
            <p className="text-lg text-neutral-600">
              {mode === 'wild' 
                ? "Let's turn your party vision into Austin's next epic story" 
                : "Tell me about your celebration and I'll create a custom package"}
            </p>
          </div>

          {/* Chat Container */}
          <div className={`bg-white rounded-2xl border shadow-lg transition-all ${
            mode === 'wild' 
              ? 'border-purple-200 shadow-purple-100/50' 
              : 'border-neutral-200'
          }`}>
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6">
            {messages.map((message, index) => (
              <div key={index} className={`mb-6 ${message.isUser ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-[80%] ${message.isUser ? 'text-left' : ''}`}>
                  <div className="text-xs text-neutral-500 mb-1">
                    {message.isUser ? 'You' : 'AI Assistant'}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 transition-all ${message.isUser 
                    ? mode === 'wild' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                      : 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-900'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="mb-6">
                <div className="inline-block">
                  <div className="text-xs text-neutral-500 mb-1">AI Assistant</div>
                  <div className="bg-neutral-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse"></span>
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-neutral-200 p-6">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your event..."
                className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 focus:bg-white transition-colors"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className={`px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === 'wild'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                Send
              </button>
            </form>
          </div>
        </div>

          {/* Quick suggestions */}
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-500 mb-4">Popular requests:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Wedding for 150 guests',
                'Bachelor party downtown',
                'Lake Travis boat party',
                'Corporate happy hour'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputText(suggestion)}
                  className={`px-4 py-2 text-sm bg-white border rounded-lg transition-all ${
                    mode === 'wild'
                      ? 'border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  )
}
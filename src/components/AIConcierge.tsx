'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIConciergeProps {
  mode?: 'normal' | 'party' | 'bachelor' | 'bachelorette' | 'elegant' | 'luxury' | 'boho' | 'chill' | 'wild'
}

export default function AIConcierge({ mode = 'normal' }: AIConciergeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey there! I'm your Party On AI Concierge! I can help you plan the perfect Austin party, recommend packages, or answer any questions about our services. What kind of celebration are you planning?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Debounce scroll to avoid excessive reflows
    const scrollTimeout = setTimeout(() => {
      scrollToBottom()
    }, 100)
    
    return () => clearTimeout(scrollTimeout)
  }, [messages])

  // Dynamic styling based on mode
  const getModeStyles = () => {
    switch (mode) {
      case 'party':
        return {
          button: 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 shadow-lg shadow-purple-500/25',
          panel: 'bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-orange-900/95',
          header: 'bg-gradient-to-r from-purple-600 to-pink-600',
          input: 'border-purple-400 focus:border-pink-500 focus:ring-pink-500/20',
          userBubble: 'bg-gradient-to-r from-purple-500 to-pink-500',
          assistantBubble: 'bg-gradient-to-r from-gray-700 to-gray-600',
          pulse: 'animate-pulse shadow-lg shadow-purple-500/50'
        }
      case 'bachelor':
        return {
          button: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg shadow-red-500/25',
          panel: 'bg-gradient-to-br from-red-900/95 via-black/95 to-orange-900/95',
          header: 'bg-gradient-to-r from-red-600 to-orange-600',
          input: 'border-red-400 focus:border-orange-500 focus:ring-orange-500/20 bg-black/50 text-orange-200',
          userBubble: 'bg-gradient-to-r from-red-500 to-orange-500',
          assistantBubble: 'bg-gradient-to-r from-gray-800 to-red-800',
          pulse: 'animate-pulse shadow-lg shadow-red-500/50'
        }
      case 'bachelorette':
        return {
          button: 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25',
          panel: 'bg-gradient-to-br from-pink-100/98 via-purple-50/98 to-pink-100/98 border-2 border-pink-200',
          header: 'bg-gradient-to-r from-pink-500 to-purple-500',
          input: 'border-pink-300 focus:border-purple-400 focus:ring-purple-400/20',
          userBubble: 'bg-gradient-to-r from-pink-400 to-purple-400',
          assistantBubble: 'bg-gradient-to-r from-pink-50 to-purple-50 text-pink-800 border border-pink-200',
          pulse: 'animate-bounce shadow-lg shadow-pink-400/30'
        }
      case 'elegant':
        return {
          button: 'bg-gradient-to-r from-gold-600 to-amber-600 hover:from-gold-700 hover:to-amber-700 shadow-lg shadow-gold-500/25',
          panel: 'bg-gradient-to-br from-cream-50/98 via-gold-50/98 to-amber-50/98 border border-gold-200',
          header: 'bg-gradient-to-r from-gold-600 to-amber-600',
          input: 'border-gold-300 focus:border-amber-400 focus:ring-amber-400/20',
          userBubble: 'bg-gradient-to-r from-gold-500 to-amber-500',
          assistantBubble: 'bg-gradient-to-r from-gold-50 to-amber-50 text-gold-800 border border-gold-200',
          pulse: 'animate-pulse shadow-lg shadow-gold-400/30'
        }
      default:
        return {
          button: 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500 shadow-lg shadow-gold-500/25',
          panel: 'bg-white/95 backdrop-blur-xl border border-neutral-200',
          header: 'bg-gradient-to-r from-gold-500 to-gold-400',
          input: 'border-neutral-300 focus:border-gold-500 focus:ring-gold-500/20',
          userBubble: 'bg-gradient-to-r from-gold-500 to-gold-400',
          assistantBubble: 'bg-gradient-to-r from-neutral-100 to-neutral-50 text-neutral-800',
          pulse: 'animate-pulse shadow-lg shadow-gold-400/30'
        }
    }
  }

  const styles = getModeStyles()

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // TODO: Replace with actual OpenRouter API call
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          mode
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      // Fallback response for now
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now, but I'd love to help you plan your Austin party! Feel free to call us at (512) 555-0123 or book directly through our website. What kind of celebration are you planning?",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getModeGreeting = () => {
    switch (mode) {
      case 'bachelor':
        return "LEGEND! Ready to plan the most EPIC bachelor party Austin has ever seen? Let's GO!"
      case 'bachelorette':
        return "Hey Queen! Ready to plan the most FABULOUS bachelorette party? Let's make you feel like royalty!"
      case 'party':
        return "PARTY TIME! Let's turn your celebration up to 11! What's the vibe you're going for?"
      case 'elegant':
        return "Welcome! I'm here to help you create an elegant, sophisticated celebration. How may I assist you today?"
      default:
        return "Hey there! I'm your Party On AI Concierge! Ready to plan something amazing?"
    }
  }

  return (
    <>
      {/* Chat Button - Subtle Help Box */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 
                     border border-neutral-200 hover:border-neutral-300 transition-colors 
                     hover:shadow-xl group"
          >
            <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-neutral-700">Need help?</span>
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(false)}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center
                     border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat Panel - Subtle Help Box */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-[360px] h-[480px] bg-white rounded-2xl shadow-xl z-50 
                      transform scale-100 border border-neutral-200">
          {/* Header - Clean ElevenLabs Style */}
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl flex items-center justify-center">
                  <span className="text-lg">AI</span>
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">Party AI Assistant</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <p className="text-xs text-neutral-500">
                      {mode === 'bachelor' ? 'Bachelor Mode' : 
                       mode === 'bachelorette' ? 'Bachelorette Mode' : 
                       mode === 'party' ? 'Party Mode' : 
                       mode === 'luxury' ? 'Luxury Mode' :
                       mode === 'elegant' ? 'Elegant Mode' :
                       mode === 'boho' ? 'Boho Mode' :
                       mode === 'wild' ? 'Wild Mode' :
                       mode === 'chill' ? 'Chill Mode' :
                       'Active'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] px-4 py-3 rounded-2xl text-sm
                    ${message.role === 'user' 
                      ? 'bg-neutral-900 text-white' 
                      : 'bg-neutral-100 text-neutral-800'
                    }
                  `}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Clean ElevenLabs Style */}
          <div className="p-6 border-t border-neutral-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  mode === 'bachelor' ? "What's the plan, legend?" :
                  mode === 'bachelorette' ? "What's the dream, queen?" :
                  "Ask me anything about your party..."
                }
                className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm 
                         placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 
                         focus:bg-white transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl 
                         font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center min-w-[80px]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
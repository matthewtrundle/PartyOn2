'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getAttribution } from '@/lib/analytics/attribution'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIConciergeProps {
  mode?: 'normal' | 'party' | 'bachelor' | 'bachelorette' | 'elegant' | 'luxury' | 'boho' | 'chill' | 'wild' | 'event-planning'
  isOpen?: boolean
  onClose?: () => void
}

export default function AIConcierge({ mode = 'normal', isOpen: controlledIsOpen, onClose }: AIConciergeProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const isControlled = controlledIsOpen !== undefined
  const router = useRouter()
  const pathname = usePathname()

  // Per-page-session conversation id so the backend can thread every Wayne turn
  // into one ChatConversation row. Held in a ref (not localStorage) and minted
  // lazily on the first send. It deliberately does NOT persist across reloads or
  // devices: a permanent shared localStorage id let a second person on a shared
  // browser inherit the first person's conversation (their PII would land on the
  // first person's lead) and let a returning visit overwrite the earlier
  // transcript (security review 2026-07-22, MEDIUM-1 / transcript-integrity).
  // Because this component stays mounted for the life of the page (WidgetMenu
  // never unmounts it), the id + full message history survive open/close and
  // back-to-menu within a visit — capture.ts's "client posts the full transcript"
  // assumption holds; a page reload correctly starts a fresh conversation row.
  const conversationIdRef = useRef<string | null>(null)
  const getConversationId = (): string => {
    if (!conversationIdRef.current) {
      conversationIdRef.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `wayne_${Date.now()}_${Math.random().toString(36).slice(2)}`
    }
    return conversationIdRef.current
  }

  const handleOpen = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(true)
    }
  }
  
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }
  
  // Parse product recommendations and packages from message
  const parseMessage = (content: string): { 
    text: string; 
    products: string[]; 
    package: { name: string; items: { quantity: number; product: string }[] } | null 
  } => {
    // Check for package format
    const packageMatch = content.match(/\[PACKAGE:\s*"([^"]+)"\]([\s\S]*?)\[\/PACKAGE\]/);
    if (packageMatch) {
      const text = content.replace(packageMatch[0], '').trim();
      const packageName = packageMatch[1];
      const packageContent = packageMatch[2];
      
      // Parse package items (e.g., "2x Tito's Vodka (1.75L)")
      const items: { quantity: number; product: string }[] = [];
      const itemRegex = /(\d+)x\s+([^\n]+)/g;
      let match;
      while ((match = itemRegex.exec(packageContent)) !== null) {
        items.push({
          quantity: parseInt(match[1]),
          product: match[2].trim()
        });
      }
      
      return { text, products: [], package: { name: packageName, items } };
    }
    
    // Check for simple product list
    const productMatch = content.match(/\[PRODUCTS:\s*([^\]]+)\]/);
    if (productMatch) {
      const text = content.replace(productMatch[0], '').trim();
      const products = productMatch[1].split(',').map(p => p.trim());
      return { text, products, package: null };
    }
    
    return { text: content, products: [], package: null };
  }
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Howdy! I'm Wayne, your friendly Texas party planning professional, what can I help you with?",
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
      // Attach capture context so /api/chat can persist the transcript, run
      // escalation detection, and create a Lead when Wayne collects contact info.
      // The backend only persists when conversationId is a string (legacy embeds
      // that omit it are unaffected).
      const attribution = getAttribution()
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
          mode,
          conversationId: getConversationId(),
          page: pathname ?? undefined,
          utmSource: attribution?.utmSource ?? undefined,
          utmMedium: attribution?.utmMedium ?? undefined,
          utmCampaign: attribution?.utmCampaign ?? undefined,
          // Full snapshot (utm ×5 + click ids + landing/referrer) — the 3
          // fields above stay for old server bundles during deploy overlap.
          attribution: attribution ?? undefined,
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
    } catch {
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


  return (
    <>
      {/* Chat Button — only rendered when uncontrolled. When a parent controls
          open/close (e.g. the site-wide WidgetMenu), the parent owns the FAB and
          positioning; suppressing this avoids a duplicate floating button. */}
      {!isControlled && (
      <div className="fixed bottom-6 right-6 z-50 hidden md:block">
        {!isOpen ? (
          <button
            onClick={handleOpen}
            className="bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 
                     border border-gray-200 hover:border-gray-200 transition-colors 
                     hover:shadow-xl group"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Need help?</span>
          </button>
        ) : (
          <button
            onClick={handleClose}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center
                     border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      )}

      {/* Chat Panel - Subtle Help Box */}
      {isOpen && (
        <div className={`fixed bottom-20 right-6 w-[min(480px,calc(100vw-2rem))] h-[min(520px,calc(100vh-7rem))] bg-white rounded-2xl shadow-xl
                      transform scale-100 border border-gray-200 ${isControlled ? 'z-[150]' : 'z-50'}`}>
          {/* Header - Clean ElevenLabs Style */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    {/* Bowler hat */}
                    <ellipse cx="12" cy="6" rx="5" ry="2" />
                    <path d="M7 6c0-1 0-2 5-2s5 1 5 2v1.5c0 .5-2.2 1-5 1s-5-.5-5-1V6z" />
                    {/* Head and bow tie */}
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 13c-3 0-5 1.5-5 3v5h10v-5c0-1.5-2-3-5-3z" />
                    {/* Bow tie */}
                    <path d="M9 13.5l3-1 3 1-3 1z" fill="white" opacity="0.8" />
                    {/* Mustache */}
                    <path d="M9 11c.5.3 1.5.5 3 0c1.5.5 2.5.3 3 0" stroke="white" strokeWidth="0.5" fill="none" />
                  </svg>
                  {/* Animated monocle */}
                  <div className="absolute right-2 top-2 w-3 h-3 border-2 border-yellow-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Wayne - Texas Party Pro</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <p className="text-xs text-gray-500">
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
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => {
              const { text, products, package: pkg } = message.role === 'assistant' ? parseMessage(message.content) : { text: message.content, products: [], package: null };
              
              return (
                <div key={message.id} className="space-y-2">
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                  >
                    {/* Butler Avatar for Assistant Messages */}
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center overflow-hidden animate-pulse">
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            {/* Bowler hat */}
                            <ellipse cx="12" cy="6" rx="5" ry="2" />
                            <path d="M7 6c0-1 0-2 5-2s5 1 5 2v1.5c0 .5-2.2 1-5 1s-5-.5-5-1V6z" />
                            {/* Head and bow tie */}
                            <circle cx="12" cy="10" r="3" />
                            <path d="M12 13c-3 0-5 1.5-5 3v5h10v-5c0-1.5-2-3-5-3z" />
                            {/* Bow tie */}
                            <path d="M9 13.5l3-1 3 1-3 1z" fill="white" opacity="0.8" />
                          </svg>
                        </div>
                        {/* Monocle animation */}
                        <div className="absolute -right-1 top-0 w-2.5 h-2.5 border border-brand-yellow rounded-full animate-bounce bg-white/50" />
                      </div>
                    )}
                    
                    <div
                      className={`
                        max-w-[85%] px-4 py-3 rounded-2xl text-sm
                        ${message.role === 'user' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-gray-100 text-gray-900'
                        }
                      `}
                    >
                      {text}
                    </div>
                  </div>
                  
                  {/* Custom Package */}
                  {pkg && pkg.items.length > 0 && (
                    <div className="flex justify-start pl-10">
                      <div className="max-w-[85%] bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-heading text-sm text-gray-900 mb-2 tracking-[0.1em]">{pkg.name}</h4>
                        <div className="space-y-1 mb-3">
                          {pkg.items.map((item, index) => (
                            <div key={index} className="flex items-center text-xs text-gray-700">
                              <span className="font-medium text-brand-yellow mr-2">{item.quantity}x</span>
                              <span>{item.product}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            // Store package data in localStorage
                            const packageData = {
                              name: pkg.name,
                              items: pkg.items,
                              createdAt: new Date().toISOString()
                            };
                            localStorage.setItem('ai-package', JSON.stringify(packageData));
                            
                            // Navigate to custom package page
                            router.push('/custom-package');
                          }}
                          className="w-full px-4 py-2 bg-brand-yellow text-gray-900 text-xs rounded hover:bg-yellow-600 transition-colors tracking-[0.1em]"
                        >
                          BUILD THIS PACKAGE
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Simple Product Recommendations */}
                  {products.length > 0 && (
                    <div className="flex justify-start pl-10">
                      <div className="max-w-[85%] space-y-2">
                        <p className="text-xs text-gray-500 mb-1">Recommended products:</p>
                        <div className="flex flex-wrap gap-2">
                          {products.map((product, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                // Extract just the product name without size
                                const cleanProduct = product.replace(/\s*\([^)]*\)/g, '').trim();
                                router.push(`/products?search=${encodeURIComponent(cleanProduct)}`);
                              }}
                              className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-full text-xs hover:bg-yellow-100 transition-colors border border-yellow-200"
                            >
                              {product} →
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Clean ElevenLabs Style */}
          <div className="p-6 border-t border-gray-100">
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
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm 
                         placeholder:text-gray-500 focus:outline-none focus:border-gray-200 
                         focus:bg-white transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-3 bg-gray-900 hover:bg-gray-900 text-white rounded-xl 
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
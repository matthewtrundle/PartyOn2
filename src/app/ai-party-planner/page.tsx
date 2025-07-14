'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  text: string
  isUser: boolean
  timestamp: Date
}

export default function AIPartyPlannerPage() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: "OMG HI!!! Welcome to my TOTALLY AWESOME party planning page!!! Tell me about your party and I'll help you make it THE BEST EVER!!! 🎉✨", 
      isUser: false, 
      timestamp: new Date() 
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mode, setMode] = useState<'nice' | 'degen'>('nice')
  const [visitorCount, setVisitorCount] = useState(4269)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
    // Simulate visitor count increment
    const interval = setInterval(() => {
      setVisitorCount(prev => prev + Math.floor(Math.random() * 3))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

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
        text: generateAIResponse(inputText, mode),
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500 + Math.random() * 1500)
  }

  const generateAIResponse = (input: string, currentMode: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (currentMode === 'degen') {
      if (lowerInput.includes('wedding')) {
        return "YOOOOO WEDDING PARTY?? 💀💀💀 aight bet we're gonna need AT LEAST 10 kegs, champagne fountains EVERYWHERE, and probably a professional cleanup crew for the morning after. thinking $3k gets you LEGENDARY status. want me to put together the full degen package?? NO CAP FR FR"
      }
      if (lowerInput.includes('boat') || lowerInput.includes('lake')) {
        return "LAKE TRAVIS BOAT PARTY INCOMING!!! 🚤💥⚡ ok so we're talking floating bars, waterproof speakers that go to 11, and enough coolers to sink a yacht. $2k gets you the ULTIMATE lake takeover. should we add jetskis to deliver shots?? LETS GOOOOO"
      }
      if (lowerInput.includes('bachelor')) {
        return "BACHELOR PARTY MODE ACTIVATED!!! 🔥🔥🔥 this is gonna be EPIC. thinking downtown austin bar crawl starter pack, party bus with built-in bar, and emergency recovery brunch. $2.5k for memories you won't remember. ready to go FULL SEND?? YOLO"
      }
      return "OK OK OK i see you BESTIE!!! 💯💯 sounds like we need to go MAXIMUM PARTY MODE. tell me more - how many people we talking? what's the vibe? what's your budget looking like? i got connects all over austin, we can make ANYTHING happen NO CAP"
    } else {
      if (lowerInput.includes('wedding')) {
        return "OMG a WEDDING!!! 💕💕💕 That's like, SO exciting!!! For a super special Austin wedding, I'd totally recommend our premium bar package - professional bartenders, yummy cocktails, champagne service!!! Usually runs $2-4k depending on guest count. What's your venue and how many people??? I'm SO excited to help!!! ✨"
      }
      if (lowerInput.includes('boat') || lowerInput.includes('lake')) {
        return "LAKE TRAVIS BOAT PARTY!!! 🌊⛵ OMG that sounds like SO much fun!!! We can do cooler delivery right to your dock, or full bartender service on board!!! Most people go with the $800-1500 range for a totally awesome setup. What size boat and how many people??? This is gonna be AMAZING!!! 🎉"
      }
      if (lowerInput.includes('bachelor')) {
        return "A bachelor party!!! 🎊🎊 That's gonna be SO fun!!! We've got packages from chill brewery tours to full downtown experiences!!! Typical budget is $1-2k for a totally memorable weekend. What's the groom into? craft beer, whiskey, full party mode??? I'm here to help make it PERFECT!!! 💫"
      }
      return "OMG this sounds AMAZING!!! 🌟 To give you the BEST recommendations ever, tell me a bit more - what kind of event, how many people, what's your vibe??? I'll put together something totally perfect for your Austin party!!! This is gonna be SO good!!! 💖"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 font-comic">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white p-3 border-b-4 border-black shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold animate-pulse" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              ✨ PARTY AI GENIE ✨
            </h1>
            <div className="text-sm">🎉 Chat with me about your party!!! 🎉</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('nice')}
              className={`px-4 py-2 text-sm font-bold rounded-full border-2 border-black shadow-lg transform hover:scale-105 transition-all ${
                mode === 'nice' 
                  ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white' 
                  : 'bg-white text-black hover:bg-pink-100'
              }`}
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              💖 NICE AI
            </button>
            <button
              onClick={() => setMode('degen')}
              className={`px-4 py-2 text-sm font-bold rounded-full border-2 border-black shadow-lg transform hover:scale-105 transition-all ${
                mode === 'degen' 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' 
                  : 'bg-white text-black hover:bg-red-100'
              }`}
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              🔥 DEGEN AI
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Input Form - PROMINENT */}
        <div className="bg-white border-8 border-black rounded-3xl shadow-2xl p-4 mb-4">
          <div className="text-center mb-3">
            <h2 className="text-2xl font-bold text-black" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              💬 TELL ME ABOUT YOUR PARTY!!! 💬
            </h2>
            <div className="text-sm text-gray-600">
              Visitors: <span className="bg-red-500 text-white px-2 py-1 rounded font-bold animate-pulse">{visitorCount}</span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type here!!! Wedding? Bachelor party? Boat party? Tell me EVERYTHING!!!"
              className="w-full p-6 text-2xl border-4 border-black rounded-2xl focus:outline-none focus:border-purple-500 bg-gradient-to-r from-white to-pink-50"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold rounded-full border-4 border-black shadow-lg hover:scale-105 transition-all disabled:opacity-50"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
              disabled={isTyping || !inputText.trim()}
            >
              🚀 SEND 🚀
            </button>
          </form>
        </div>

        {/* Chat Messages - Compact */}
        <div className="bg-white border-8 border-black rounded-3xl shadow-2xl p-4 mb-4">

          {/* Messages */}
          <div className="bg-gradient-to-br from-pink-100 to-purple-100 border-4 border-black rounded-2xl p-4 h-[40vh] overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{message.isUser ? '🙋‍♂️' : '🧞‍♀️'}</span>
                  <span className="font-bold text-lg" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    {message.isUser ? 'YOU' : 'PARTY GENIE'}
                  </span>
                  <span className="text-xs bg-yellow-300 px-2 py-1 rounded border border-black">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border-2 border-black ${
                  message.isUser 
                    ? 'bg-gradient-to-r from-blue-200 to-cyan-200 ml-8' 
                    : 'bg-gradient-to-r from-pink-200 to-yellow-200 mr-8'
                }`} style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  {message.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🧞‍♀️</span>
                  <span className="font-bold text-lg" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    PARTY GENIE
                  </span>
                  <span className="text-xs bg-yellow-300 px-2 py-1 rounded border border-black animate-pulse">
                    typing...
                  </span>
                </div>
                <div className="p-3 rounded-xl border-2 border-black bg-gradient-to-r from-pink-200 to-yellow-200 mr-8">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tell me about your AWESOME party plans!!!"
              className="w-full p-4 text-xl border-4 border-black rounded-2xl focus:outline-none focus:border-purple-500 bg-gradient-to-r from-white to-pink-50"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold rounded-full border-4 border-black shadow-lg hover:scale-105 transition-all disabled:opacity-50"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
              disabled={isTyping || !inputText.trim()}
            >
              🚀 SEND 🚀
            </button>
          </form>
        </div>

        {/* Fun Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-yellow-300 to-orange-300 border-4 border-black rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              PARTIES PLANNED
            </div>
            <div className="text-3xl font-bold text-red-600 animate-pulse">
              {(visitorCount * 0.23).toFixed(0)}
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-300 to-blue-300 border-4 border-black rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">⭐</div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              HAPPINESS LEVEL
            </div>
            <div className="text-3xl font-bold text-purple-600 animate-pulse">
              💯%
            </div>
          </div>
          <div className="bg-gradient-to-r from-pink-300 to-purple-300 border-4 border-black rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              AUSTIN RANKING
            </div>
            <div className="text-3xl font-bold text-green-600 animate-pulse">
              #1
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 border-4 border-black rounded-2xl p-4 text-center text-white">
          <p className="text-xl font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            🌟 THANKS FOR VISITING MY AWESOME PAGE!!! 🌟
          </p>
          <p className="text-sm">
            Made with 💖 by Party On Delivery | Austin, TX | Best viewed with 🎵 music on!!!
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        
        .font-comic {
          font-family: 'Comic Sans MS', cursive, sans-serif;
        }
        
        input::placeholder {
          color: #9CA3AF;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
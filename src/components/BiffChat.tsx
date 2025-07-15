/**
 * Biff Chat Component - Example implementation
 * Shows how to integrate Biff AI into your components
 */

'use client'

import { useState } from 'react';
import { useBiffAI } from '@/hooks/useBiffAI';

interface BiffChatProps {
  apiKey: string;
  className?: string;
}

export default function BiffChat({ apiKey, className = '' }: BiffChatProps) {
  const [input, setInput] = useState('');
  const [partySize, setPartySize] = useState<number | undefined>();
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    getGreeting,
    lastBiffResponse
  } = useBiffAI({ 
    apiKey,
    onError: (err) => console.error('Biff Error:', err)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input, { partySize });
    setInput('');
  };

  const handleQuickAction = async (action: string) => {
    await sendMessage(action);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {/* Biff Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
          <span className="text-2xl">🤠🤖</span>
        </div>
        <div>
          <h3 className="font-display text-2xl text-dark">Chat with Biff</h3>
          <p className="text-sm text-dark/60">Your Post-Apocalyptic Party Planner</p>
        </div>
      </div>

      {/* Party Metrics */}
      {lastBiffResponse?.partyMetrics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-primary-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-500">
              {lastBiffResponse.partyMetrics.funLevel}/10
            </div>
            <div className="text-xs text-dark/60">Fun Level</div>
          </div>
          <div className="text-center p-3 bg-secondary-50 rounded-lg">
            <div className="text-2xl font-bold text-secondary-500">
              {lastBiffResponse.partyMetrics.yeehawFactor}/10
            </div>
            <div className="text-xs text-dark/60">Yeehaw Factor</div>
          </div>
          <div className="text-center p-3 bg-accent-50 rounded-lg">
            <div className="text-2xl font-bold text-accent-600">
              {lastBiffResponse.partyMetrics.survivalChance}%
            </div>
            <div className="text-xs text-dark/60">Survival Rate</div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-light rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-dark/40 mb-4">Start planning your apocalyptic party!</p>
            <button
              onClick={getGreeting}
              className="btn-primary text-sm"
              disabled={isLoading}
            >
              Say Howdy to Biff!
            </button>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-dark/10'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.response?.suggestedItems && msg.response.suggestedItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dark/10">
                    <p className="text-xs font-semibold mb-2">Biff Recommends:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.response.suggestedItems.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-dark/10 p-4 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            Error: {error.message}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleQuickAction("What drinks do you recommend for a wedding?")}
          className="text-xs px-3 py-1 bg-light hover:bg-dark/10 rounded-full transition-colors"
          disabled={isLoading}
        >
          Wedding Drinks
        </button>
        <button
          onClick={() => handleQuickAction("I need party supplies for 30 people")}
          className="text-xs px-3 py-1 bg-light hover:bg-dark/10 rounded-full transition-colors"
          disabled={isLoading}
        >
          Supplies for 30
        </button>
        <button
          onClick={() => handleQuickAction("What's your craziest party package?")}
          className="text-xs px-3 py-1 bg-light hover:bg-dark/10 rounded-full transition-colors"
          disabled={isLoading}
        >
          Go Crazy!
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Guests"
            value={partySize || ''}
            onChange={(e) => setPartySize(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-24 px-3 py-2 border border-dark/20 rounded-lg focus:outline-none focus:border-primary-500"
            min="1"
            max="1000"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Biff about your party..."
            className="flex-1 px-4 py-2 border border-dark/20 rounded-lg focus:outline-none focus:border-primary-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn-primary text-sm"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </form>

      {/* Special Effect Display */}
      {lastBiffResponse?.specialEffect && (
        <div className="mt-4 text-center text-sm text-primary-500 animate-pulse">
          {lastBiffResponse.specialEffect}
        </div>
      )}

      {/* Clear History */}
      {messages.length > 0 && (
        <button
          onClick={clearHistory}
          className="mt-4 text-xs text-dark/40 hover:text-dark/60 transition-colors"
        >
          Clear Chat History
        </button>
      )}
    </div>
  );
}
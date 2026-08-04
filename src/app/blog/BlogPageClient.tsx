'use client'

import React, { useState } from 'react'
import { getAttribution } from '@/lib/analytics/attribution'

export default function BlogPageClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'blog',
          attribution: getAttribution(),
        })
      })

      const data = await response.json()

      if (response.ok) {
        setOk(true)
        setMessage(data.message || 'Almost there! Check your email to confirm.')
        setEmail('')
      } else {
        setOk(false)
        setMessage(data.error || 'Something went wrong')
      }
    } catch {
      setOk(false)
      setMessage('Failed to subscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-12 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-8">
        <div className="text-center">
          <h2 className="font-heading text-3xl mb-4 tracking-[0.1em]">
            JOIN OUR INNER CIRCLE
          </h2>
          <p className="text-gray-300 mb-8">
            Get exclusive discounts, party planning tips, and be the first to know about new offerings
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="submit"
              className="px-8 py-3 bg-yellow-500 text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.1em] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'SUBSCRIBING...' : 'SUBSCRIBE'}
            </button>
          </form>
          {message && (
            <p className={`text-sm mt-4 ${ok ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Join 5,000+ Austin party planners. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState, type FormEvent } from 'react'
import { getAttribution } from '@/lib/analytics/attribution'

/**
 * Footer newsletter signup form. Posts to /api/newsletter, which persists the
 * email as a Lead. Replaces the previous static <form> in Footer.tsx that had
 * no submit handler and silently discarded every email typed into it.
 *
 * Styling is kept identical to the original footer form (dark background) so
 * this is a behavior-only fix, not a redesign.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'footer',
          attribution: getAttribution(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
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
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
      >
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-grow px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-200 focus:outline-none focus:border-yellow-500 transition-colors duration-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary whitespace-nowrap disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm mt-4 ${ok ? 'text-green-400' : 'text-red-400'}`}
        >
          {message}
        </p>
      )}
    </>
  )
}

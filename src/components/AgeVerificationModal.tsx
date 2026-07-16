'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface AgeVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: () => void
}

/** Self-certification age gate: visitor checks a box confirming they're 21+. */
export default function AgeVerificationModal({ isOpen, onClose, onVerify }: AgeVerificationModalProps) {
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmed) {
      setError('Please confirm you are 21 or older to enter this site.')
      return
    }
    localStorage.setItem('age_verified', 'true')
    onVerify()
    onClose()
  }

  const handleUnder = () => {
    onClose()
    // Send under-age / declining visitors away from the site.
    window.location.href = 'https://www.google.com'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white max-w-sm w-full mx-4 border border-brand-yellow/20 shadow-2xl"
          >
            {/* Logo Header */}
            <div className="bg-gradient-to-b from-gray-50 to-white px-6 pt-5 pb-2 sm:px-8 sm:pt-8 sm:pb-4">
              <div className="flex justify-center">
                <Image
                  src="/images/pod-logo-2025.svg"
                  alt="Party On Delivery"
                  width={140}
                  height={47}
                  className="sm:w-[180px]"
                  priority
                />
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-5 sm:px-8 sm:pb-8">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="font-heading text-lg sm:text-xl text-gray-900 tracking-[0.1em]">
                  Age Verification
                </h2>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Age self-certification */}
                <div className="bg-gray-50 py-4 px-4 mb-4 sm:py-6 sm:px-6 sm:mb-6">
                  <label htmlFor="age-gate-confirm" className="flex items-start gap-3 cursor-pointer">
                    <input
                      id="age-gate-confirm"
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => {
                        setConfirmed(e.target.checked)
                        setError('')
                      }}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-brand-yellow border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                    />
                    <span className="text-base text-gray-800 font-light tracking-wide">
                      Yes, I&apos;m over 21 years old
                    </span>
                  </label>
                  {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3 sm:py-4 bg-brand-yellow text-gray-900 font-medium tracking-[0.08em] text-sm hover:bg-yellow-600 transition-colors"
                  >
                    ENTER SITE
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUnder}
                    className="py-3 sm:py-4 border border-gray-300 text-gray-700 font-medium tracking-[0.08em] text-sm hover:bg-gray-50 transition-colors"
                  >
                    I&apos;M UNDER 21
                  </motion.button>
                </div>
              </form>

              {/* Legal Text */}
              <p className="mt-4 sm:mt-6 text-xs text-gray-500 text-center leading-relaxed px-2">
                By entering this site, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-brand-yellow">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline hover:text-brand-yellow">Privacy Policy</Link>,
                and confirm that you are of legal drinking age in your jurisdiction.
              </p>
            </div>

            {/* Decorative Bottom Border */}
            <div className="h-1 bg-gradient-to-r from-yellow-500 via-brand-yellow to-yellow-500"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

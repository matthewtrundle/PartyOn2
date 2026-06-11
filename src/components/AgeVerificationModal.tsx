'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { setAgeVerified } from '@/lib/utils/age-verification'

interface AgeVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: () => void
}

export default function AgeVerificationModal({ isOpen, onClose, onVerify }: AgeVerificationModalProps) {
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);
  const handleYes = () => {
    setAgeVerified()
    onVerify()
    onClose()
  }

  const handleNo = () => {
    onClose()
    // Optionally redirect to a different page
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
            transition={{ type: "spring", duration: 0.5 }}
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

              {/* Question */}
              <div className="bg-gray-50 py-4 px-4 mb-4 sm:py-6 sm:px-6 sm:mb-6 text-center">
                <p className="text-base sm:text-lg text-gray-800 font-light tracking-wide">
                  Are you 21 years of age or older?
                </p>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleYes}
                  className="py-3 sm:py-4 bg-brand-yellow text-gray-900 font-medium tracking-[0.08em] text-sm hover:bg-yellow-600 transition-colors"
                >
                  YES, I AM 21+
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNo}
                  className="py-3 sm:py-4 border border-gray-300 text-gray-700 font-medium tracking-[0.08em] text-sm hover:bg-gray-50 transition-colors"
                >
                  NO
                </motion.button>
              </div>

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
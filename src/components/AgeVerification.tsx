'use client'

import { useState, useEffect } from 'react'

export default function AgeVerification() {
  const [isVisible, setIsVisible] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if user has already verified age
    const ageVerified = localStorage.getItem('ageVerified')
    if (!ageVerified) {
      setIsVisible(true)
    }
  }, [])

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!birthDate) {
      setError('Please enter your date of birth')
      return
    }

    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    if (age >= 21) {
      localStorage.setItem('ageVerified', 'true')
      setIsVisible(false)
    } else {
      setError('You must be 21 or older to enter this site')
    }
  }

  const handleExit = () => {
    window.location.href = 'https://www.google.com'
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 md:p-10 animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2">
            <span className="font-display text-4xl text-gradient-gold">
              PARTY ON
            </span>
            <span className="font-sans font-bold text-sm text-navy-500">
              DELIVERY
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-4 mb-8">
          <h2 className="font-serif text-3xl text-navy-500">
            Age Verification Required
          </h2>
          <p className="font-sans text-neutral-600">
            You must be 21 or older to enter this site. Please enter your date of birth to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label htmlFor="birthdate" className="block font-sans font-medium text-navy-500 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              id="birthdate"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="input-premium"
              required
            />
          </div>

          {error && (
            <p className="text-austin-live text-sm font-sans text-center">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Enter Site
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="btn-outline w-full"
            >
              Exit
            </button>
          </div>
        </form>

        {/* Legal Text */}
        <p className="mt-6 text-xs text-neutral-500 text-center leading-relaxed">
          By entering this site, you agree to our Terms of Service and confirm that you are of legal drinking age in your jurisdiction.
        </p>

        {/* Austin Touch */}
        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-400 italic">
            "Keep Austin Weird... and Responsibly Served!"
          </p>
        </div>
      </div>
    </div>
  )
}
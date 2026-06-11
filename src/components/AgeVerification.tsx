'use client'

import { useState, useEffect } from 'react'
import AgeVerificationModal from './AgeVerificationModal'
import { isAgeVerified } from '@/lib/utils/age-verification'

export default function AgeVerification() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already verified age
    if (!isAgeVerified()) {
      setIsVisible(true)
    }
  }, [])

  const handleVerify = () => {
    setIsVisible(false)
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  return (
    <AgeVerificationModal 
      isOpen={isVisible}
      onClose={handleClose}
      onVerify={handleVerify}
    />
  )
}
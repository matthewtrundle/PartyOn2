'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCustomerContext } from '@/contexts/CustomerContext'
import Navigation from "@/components/Navigation"
import { useState, useRef, ChangeEvent } from 'react'

interface AccountLayoutProps {
  children: React.ReactNode
  title?: string
}

// Membership tiers configuration
const MEMBERSHIP_TIERS = [
  { name: 'Bronze', min: 0, max: 499, color: 'from-orange-400 to-orange-600', textColor: 'text-orange-600', bgColor: 'bg-orange-100' },
  { name: 'Silver', min: 500, max: 999, color: 'from-gray-400 to-gray-600', textColor: 'text-gray-600', bgColor: 'bg-gray-100' },
  { name: 'Gold', min: 1000, max: 2499, color: 'from-brand-yellow to-brand-yellow', textColor: 'text-brand-yellow', bgColor: 'bg-yellow-100' },
  { name: 'Platinum', min: 2500, max: 4999, color: 'from-purple-400 to-purple-600', textColor: 'text-purple-600', bgColor: 'bg-purple-100' },
  { name: 'Diamond', min: 5000, max: Infinity, color: 'from-blue-400 to-blue-600', textColor: 'text-blue-600', bgColor: 'bg-blue-100' }
]

export default function AccountLayout({ children, title }: AccountLayoutProps) {
  const pathname = usePathname()
  const { customer } = useCustomerContext()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [savedAddressCount, setSavedAddressCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const navigation = [
    { 
      href: '/account', 
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: '/account/orders',
      label: 'Order History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      href: '/account/group-orders',
      label: 'Group Orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: '/account/addresses', 
      label: 'Addresses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      href: '/account/preferences', 
      label: 'Preferences',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]
  
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.charAt(0) || ''
    const l = lastName?.charAt(0) || ''
    return (f + l).toUpperCase() || 'U'
  }
  
  const getMemberSince = () => {
    if (!customer?.createdAt) return 'New Member'
    const date = new Date(customer.createdAt)
    return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  }

  // TODO: Fetch order totals from /api/v1/orders with customer ID
  const totalSpent = 0

  const getCurrentTier = () => {
    return MEMBERSHIP_TIERS.find(tier => totalSpent >= tier.min && totalSpent <= tier.max) || MEMBERSHIP_TIERS[0]
  }

  const getNextTier = () => {
    const currentIndex = MEMBERSHIP_TIERS.findIndex(tier => totalSpent >= tier.min && totalSpent <= tier.max)
    return currentIndex < MEMBERSHIP_TIERS.length - 1 ? MEMBERSHIP_TIERS[currentIndex + 1] : null
  }

  const currentTier = getCurrentTier()
  const nextTier = getNextTier()
  const progressToNextTier = nextTier 
    ? ((totalSpent - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100

  // Load profile image and addresses count from localStorage on mount
  useState(() => {
    if (typeof window !== 'undefined' && customer) {
      const savedImage = localStorage.getItem(`profileImage_${customer.id}`)
      if (savedImage) {
        setProfileImage(savedImage)
      }
      
      // Count saved addresses
      const savedAddresses = localStorage.getItem(`addresses_${customer.id}`)
      if (savedAddresses) {
        try {
          const addresses = JSON.parse(savedAddresses)
          setSavedAddressCount(Array.isArray(addresses) ? addresses.length : 0)
        } catch {
          setSavedAddressCount(0)
        }
      } else {
        setSavedAddressCount(0)
      }
    }
  })

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && customer) {
      try {
        // customerId is no longer sent — the server takes it from the session.
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/profile/upload-image', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        
        if (data.url) {
          setProfileImage(data.url)
          // Store in localStorage as fallback
          if (data.storage === 'localStorage') {
            localStorage.setItem(`profileImage_${customer.id}`, data.url)
          }
        }
      } catch (error) {
        console.error('Failed to upload profile image:', error)
      }
    }
  }
  
  return (
    <>
      {/* Include main navigation */}
      <Navigation />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section with Dark Background */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-32 pb-20">
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(212, 175, 55, 0.1) 35px, rgba(212, 175, 55, 0.1) 70px)`,
            }} />
          </div>
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
          
          {/* Content */}
          <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Avatar with upload */}
                <div className="relative group">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-brand-yellow/30 shadow-2xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white text-3xl font-heading shadow-2xl border-4 border-brand-yellow/30">
                      {getInitials(customer?.firstName, customer?.lastName)}
                    </div>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 border-3 border-gray-900 rounded-full"></div>
                </div>
                
                {/* User Info */}
                <div>
                  <h1 className="text-3xl font-heading text-white tracking-[0.1em]">
                    {customer?.firstName || customer?.lastName 
                      ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                      : 'Welcome Back'}
                  </h1>
                  <p className="text-gray-300 mt-1">{customer?.email}</p>
                  <div className="flex items-center space-x-3 mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 tracking-wider">
                      {currentTier.name.toUpperCase()} MEMBER
                    </span>
                    <span className="text-xs text-gray-400 tracking-wider">{getMemberSince()}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-12">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">0</p>
                  <p className="text-xs text-gray-400 tracking-[0.08em] mt-1">ORDERS</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-brand-yellow">{currentTier.name}</p>
                  <p className="text-xs text-gray-400 tracking-[0.08em] mt-1">TIER</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{savedAddressCount}</p>
                  <p className="text-xs text-gray-400 tracking-[0.08em] mt-1">ADDRESSES</p>
                </div>
              </div>
            </div>

            {/* Tier Progress Bar */}
            {nextTier && (
              <div className="mt-8">
                <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                  <span>{currentTier.name} Member</span>
                  <span className="text-brand-yellow">${(nextTier.min - totalSpent).toFixed(0)} to {nextTier.name}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-yellow to-brand-yellow transition-all duration-500"
                    style={{ width: `${progressToNextTier}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">${currentTier.min}</span>
                  <span className="text-xs text-gray-500">${nextTier.min}</span>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-brand-yellow text-brand-yellow'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {item.icon}
                    <span className="tracking-[0.1em]">{item.label.toUpperCase()}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="bg-gray-50 min-h-[60vh]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {title && (
              <h2 className="text-3xl font-heading text-gray-900 mb-8 tracking-[0.1em]">
                {title}
              </h2>
            )}
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
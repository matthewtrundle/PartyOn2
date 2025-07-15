'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/ai-party-planner', label: 'AI Planner' },
    { href: '/fast-delivery', label: 'Order Now' },
    { href: '/weddings', label: 'Weddings' },
    { href: '/boat-parties', label: 'Boat Parties' },
    { href: '/bach-parties', label: 'Bach Parties' },
    { href: '/products', label: 'Browse' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-premium py-4'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
              <div className="relative flex flex-col items-center leading-none">
                <span className="font-display text-2xl lg:text-3xl text-gradient-primary">
                  PARTY ON
                </span>
                <span className={`font-sans font-bold text-xs lg:text-sm mt-1 ${
                  isScrolled ? 'text-dark' : 'text-white'
                }`}>
                  DELIVERY
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans font-medium text-sm xl:text-base transition-all duration-300 relative group whitespace-nowrap ${
                  isScrolled
                    ? 'text-dark hover:text-primary-500'
                    : 'text-white hover:text-accent-500'
                }`}
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>
          
          {/* Phone & CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Social Media Icons */}
            <div className="flex items-center space-x-2 mr-2">
              <a
                href="https://facebook.com/partyondelivery"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-all duration-300 ${
                  isScrolled
                    ? 'text-dark/40 hover:text-primary-500'
                    : 'text-white/60 hover:text-white'
                }`}
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com/partyondelivery"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-all duration-300 ${
                  isScrolled
                    ? 'text-dark/40 hover:text-primary-500'
                    : 'text-white/60 hover:text-white'
                }`}
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12c0-3.403 2.759-6.162 6.162-6.162s6.162 2.759 6.162 6.162-2.759 6.162-6.162 6.162S5.838 15.403 5.838 12zm6.162 4.003c-2.209 0-4.003-1.794-4.003-4.003s1.794-4.003 4.003-4.003 4.003 1.794 4.003 4.003-1.794 4.003-4.003 4.003zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.44-.645 1.44-1.44-.644-1.44-1.44-1.44z"/>
                </svg>
              </a>
            </div>
            <a
              href="tel:7373719700"
              className={`font-sans font-bold text-sm xl:text-base transition-all duration-300 whitespace-nowrap ${
                isScrolled
                  ? 'text-primary-500 hover:text-primary-600'
                  : 'text-accent-500 hover:text-accent-400'
              }`}
            >
              (737) 371-9700
            </a>
            <Link
              href="/book-now"
              className="btn-primary text-sm"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden relative w-10 h-10 flex flex-col items-center justify-center ${
              isScrolled ? 'text-dark' : 'text-white'
            }`}
            aria-label="Toggle menu"
          >
            <span
              className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${
                isMobileMenuOpen ? 'rotate-45' : '-translate-y-2'
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-current transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${
                isMobileMenuOpen ? '-rotate-45' : 'translate-y-2'
              }`}
            />
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden fixed inset-0 top-[72px] bg-white transition-transform duration-300 ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 space-y-4">
            <a
              href="tel:7373719700"
              className="block py-3 text-lg font-sans font-bold text-gold-500 hover:text-gold-600 transition-colors duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              (737) 371-9700
            </a>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-3 text-lg font-sans font-medium text-navy-500 hover:text-gold-500 transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/book-now"
              onClick={() => setIsMobileMenuOpen(false)}
              className="btn-primary w-full text-center mt-6"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
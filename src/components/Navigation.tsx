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
          <Link href="/" className="flex flex-col items-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-gold blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
              <span className="relative font-display text-3xl md:text-4xl text-gradient-gold text-center">
                PARTY ON
              </span>
            </div>
            <span className={`font-sans font-bold text-sm text-center ${
              isScrolled ? 'text-navy-500' : 'text-white'
            }`}>
              DELIVERY
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center space-x-8">
            <a
              href="tel:7373719700"
              className={`font-sans font-bold transition-all duration-300 ${
                isScrolled
                  ? 'text-gold-500 hover:text-gold-600'
                  : 'text-gold-400 hover:text-gold-300'
              }`}
            >
              (737) 371-9700
            </a>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans font-medium transition-all duration-300 relative group ${
                  isScrolled
                    ? 'text-navy-500 hover:text-gold-500'
                    : 'text-white hover:text-gold-400'
                }`}
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
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
              isScrolled ? 'text-navy-500' : 'text-white'
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
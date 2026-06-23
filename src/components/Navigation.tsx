'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import CartButton from '@/components/shopify/CartButton';
import ProductSearch from '@/components/ProductSearch';
import { useCustomerContext } from '@/contexts/CustomerContext';

// Routes where navigation should be hidden
const NAV_HIDDEN_ROUTES = [
  '/partners/',
  '/bach-parties',
  '/weddings',
  '/corporate',
  '/checkout',
  '/group/',
];

// Routes where nav uses transparent bg (page has dark background behind nav area, NO mt-24).
// All other routes default to OPAQUE (white bg, dark text) for readability.
const NAV_TRANSPARENT_ROUTES = [
  '/',          // Homepage - h-screen dark hero covers nav area
  '/services',  // Dark gradient (from-slate-900) starts from top of page
  '/partners',  // Partners directory - dark hero image covers nav area
  '/partners/mobile-bartenders',
  '/partners/hotels-resorts',
  '/partners/property-management',
  '/austin-4th-of-july-delivery',  // Dark navy fireworks hero covers the nav area
];

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isScrolled: boolean;
  onClick?: () => void;
}

function NavLink({ href, children, isScrolled, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium tracking-[0.05em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
        isScrolled
          ? 'text-gray-700 hover:text-brand-yellow'
          : 'text-white/90 hover:text-brand-yellow'
      }`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

interface NavigationProps {
  forceScrolled?: boolean;
  /** Hide navigation (slides up out of view) */
  hidden?: boolean;
  /** Hide logo on mobile (only show hamburger menu) */
  hideMobileLogo?: boolean;
  /** Force hamburger icon to be white (for dark hero backgrounds) */
  forceWhiteHamburger?: boolean;
}

export default function Navigation({
  forceScrolled = false,
  hidden = false,
  hideMobileLogo = false,
  forceWhiteHamburger = false,
}: NavigationProps) {
  const { customer, isAuthenticated, logout } = useCustomerContext();
  const pathname = usePathname();

  // Check if nav should be hidden on current route
  const shouldHideNav = pathname ? NAV_HIDDEN_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route)
  ) : false;

  // Check if nav should be transparent (page has dark bg behind nav area).
  // Exact-match only — subpages must be listed explicitly. Prefix matching
  // previously made every /partners/* page transparent, which broke any
  // partner subpage with a light bg or `mt-24` (invisible white-on-white nav).
  const shouldBeTransparent = pathname
    ? NAV_TRANSPARENT_ROUTES.some(route => pathname === route)
    : false;

  const [isScrolled, setIsScrolled] = useState(forceScrolled || !shouldBeTransparent);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isRentalsOpen, setIsRentalsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleScroll = () => {
      setIsScrolled(forceScrolled || !shouldBeTransparent || window.scrollY > 50);
    };

    // Set initial scroll state
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceScrolled, shouldBeTransparent]);

  // If navigation should be hidden on this route, return null
  if (shouldHideNav) {
    return null;
  }

  // Prevent hydration mismatch by using consistent initial state
  const shouldStartOpaque = forceScrolled || !shouldBeTransparent;
  if (!isMounted) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        shouldStartOpaque ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center -ml-4">
              <img
                src="/images/pod-logo-2025.svg"
                alt="Party On Delivery"
                className="h-14 md:h-16 w-auto"
              />
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const services = [
    { href: '/weddings', label: 'WEDDINGS' },
    { href: '/wedding-drink-calculator', label: 'WEDDING CALCULATOR' },
    { href: '/austin-wedding-venue-boats', label: 'WEDDING VENUE BOATS' },
    { href: '/austin-bachelor-party-delivery', label: 'BACHELOR PARTIES' },
    { href: '/austin-bachelorette-party-delivery', label: 'BACHELORETTE PARTIES' },
    { href: '/boat-parties', label: 'BOAT PARTIES' },
    { href: '/austin-corporate-event-delivery', label: 'CORPORATE' },
    { href: '/kegs', label: 'KEG DELIVERY' },
    { href: '/cocktail-kits', label: 'COCKTAIL KITS' },
  ];

  const rentals = [
    { href: '/rentals/chair-rentals-austin', label: 'CHAIR RENTALS' },
    { href: '/rentals/cocktail-table-rentals-austin', label: 'TABLE RENTALS' },
    { href: '/rentals/cooler-rentals-austin', label: 'COOLER RENTALS' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200'
          : 'bg-transparent'
      } ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo - hidden on mobile when hideMobileLogo is true */}
            <Link
              href="/"
              className={`flex items-center -ml-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 rounded-lg ${hideMobileLogo ? 'hidden md:flex' : ''}`}
            >
              <img
                src="/images/pod-logo-2025.svg"
                alt="Party On Delivery"
                className="h-14 md:h-16 w-auto"
              />
            </Link>

            {/* Desktop Navigation - Centered Links */}
            <div className="hidden md:flex flex-1 items-center justify-center space-x-8 lg:space-x-10">
              {/* Services Dropdown */}
              <div className="relative group">
                <button
                  className={`flex items-center text-sm font-medium tracking-[0.05em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 rounded ${
                    isScrolled
                      ? 'text-gray-700 hover:text-brand-yellow'
                      : 'text-white/90 hover:text-brand-yellow'
                  }`}
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  SERVICES
                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute top-full left-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-200 ${
                    isServicesOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'
                  }`}
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  {services.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className="block px-4 py-3 text-sm font-medium tracking-[0.05em] text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors first:rounded-t-lg last:rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
                    >
                      {service.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Rentals Dropdown */}
              <div className="relative group">
                <button
                  className={`flex items-center text-sm font-medium tracking-[0.05em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 rounded ${
                    isScrolled
                      ? 'text-gray-700 hover:text-brand-yellow'
                      : 'text-white/90 hover:text-brand-yellow'
                  }`}
                  onMouseEnter={() => setIsRentalsOpen(true)}
                  onMouseLeave={() => setIsRentalsOpen(false)}
                >
                  RENTALS
                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-200 ${
                    isRentalsOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'
                  }`}
                  onMouseEnter={() => setIsRentalsOpen(true)}
                  onMouseLeave={() => setIsRentalsOpen(false)}
                >
                  {rentals.map((rental) => (
                    <Link
                      key={rental.href}
                      href={rental.href}
                      className="block px-4 py-3 text-sm font-medium tracking-[0.05em] text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors first:rounded-t-lg last:rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
                    >
                      {rental.label}
                    </Link>
                  ))}
                </div>
              </div>

              <NavLink href="/contact" isScrolled={isScrolled}>CONTACT</NavLink>
              <NavLink href="/partners" isScrolled={isScrolled}>PARTNERS</NavLink>
            </div>

            {/* Desktop Utility Items - Right */}
            <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
              <ProductSearch isScrolled={isScrolled} />
              <CartButton isScrolled={isScrolled} />

              {/* Account Section - only show when logged in */}
              {isAuthenticated && customer && (
                <div className="relative group">
                  <button
                    className={`flex items-center text-sm font-medium tracking-[0.05em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 rounded ${
                      isScrolled
                        ? 'text-gray-700 hover:text-brand-yellow'
                        : 'text-white/90 hover:text-brand-yellow'
                    }`}
                  >
                    {customer.firstName || 'ACCOUNT'}
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                  </button>

                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      href="/account"
                      className="block px-4 py-3 text-sm font-medium tracking-[0.05em] text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
                    >
                      MY ACCOUNT
                    </Link>
                    <Link
                      href="/account/orders"
                      className="block px-4 py-3 text-sm font-medium tracking-[0.05em] text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
                    >
                      ORDER HISTORY
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="block w-full text-left px-4 py-3 text-sm font-medium tracking-[0.05em] text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors border-t border-gray-200 rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
                    >
                      SIGN OUT
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className={`md:hidden p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
                forceWhiteHamburger
                  ? 'text-white'
                  : isScrolled
                    ? 'text-gray-900'
                    : 'text-white'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className="space-y-1.5">
                <span className={`block w-6 h-0.5 bg-current transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-6 h-0.5 bg-current transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-6 h-0.5 bg-current transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-white z-[100] md:hidden transition-all duration-300 ${
          isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6">
            <Link href="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
              <img
                src="/images/pod-logo-2025.svg"
                alt="Party On Delivery"
                className="h-12 w-auto"
              />
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-900 text-3xl font-light rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 space-y-6 overflow-y-auto">
            {/* Search Bar for Mobile */}
            <div className="pt-4">
              <ProductSearch isScrolled={true} />
            </div>

            {/* Services Section */}
            <div className="space-y-3">
              <p className="text-xl font-heading font-semibold tracking-[0.04em] text-gray-900">SERVICES</p>
              <div className="pl-4 space-y-2">
                {services.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    className="block text-base font-medium tracking-[0.05em] text-gray-600 hover:text-brand-blue transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {service.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Rentals Section */}
            <div className="space-y-3">
              <p className="text-xl font-heading font-semibold tracking-[0.04em] text-gray-900">RENTALS</p>
              <div className="pl-4 space-y-2">
                {rentals.map((rental) => (
                  <Link
                    key={rental.href}
                    href={rental.href}
                    className="block text-base font-medium tracking-[0.05em] text-gray-600 hover:text-brand-blue transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {rental.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/contact"
              className="text-xl font-heading font-semibold tracking-[0.04em] text-gray-900 hover:text-brand-blue transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              CONTACT
            </Link>
            <Link
              href="/partners"
              className="text-xl font-heading font-semibold tracking-[0.04em] text-gray-900 hover:text-brand-blue transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              PARTNERS
            </Link>

            {/* Account link for mobile - only show when logged in */}
            {isAuthenticated && customer && (
              <div className="space-y-3">
                <p className="text-xl font-heading font-semibold tracking-[0.04em] text-gray-900">
                  {customer.firstName || 'ACCOUNT'}
                </p>
                <div className="pl-4 space-y-2">
                  <Link
                    href="/account"
                    className="block text-base font-medium tracking-[0.05em] text-gray-600 hover:text-brand-blue transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    MY ACCOUNT
                  </Link>
                  <Link
                    href="/account/orders"
                    className="block text-base font-medium tracking-[0.05em] text-gray-600 hover:text-brand-blue transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    ORDER HISTORY
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="block text-base font-medium tracking-[0.05em] text-gray-600 hover:text-brand-blue transition-colors"
                  >
                    SIGN OUT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

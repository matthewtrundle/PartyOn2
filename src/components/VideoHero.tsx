'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface VideoHeroProps {
  title: string
  subtitle?: string
  description?: string
  videoSrc?: string
  fallbackImage: string
  ctaText?: string
  ctaLink?: string
  overlayOpacity?: number
  height?: 'full' | 'tall' | 'medium'
}

export default function VideoHero({
  title,
  subtitle,
  description,
  videoSrc,
  fallbackImage,
  ctaText,
  ctaLink,
  overlayOpacity = 0.5,
  height = 'tall'
}: VideoHeroProps) {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const heightClasses = {
    full: 'h-screen',
    tall: 'h-[80vh]',
    medium: 'h-[60vh]'
  }

  return (
    <section className={`relative ${heightClasses[height]} min-h-[600px] flex items-center justify-center overflow-hidden`}>
      {/* Video Background */}
      {videoSrc && !videoError && (
        <video
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Fallback Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          videoLoaded && !videoError ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${fallbackImage})` }}
      />

      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white px-6 max-w-5xl mx-auto animate-fade-up">
        <h1 className="font-serif text-5xl md:text-7xl mb-6 text-shadow-lg">
          {title}
        </h1>
        
        {subtitle && (
          <h2 className="font-display text-2xl md:text-3xl mb-6 text-shadow">
            {subtitle}
          </h2>
        )}
        
        {description && (
          <p className="font-sans text-lg md:text-xl mb-8 text-neutral-100 max-w-3xl mx-auto text-shadow">
            {description}
          </p>
        )}
        
        {ctaText && ctaLink && (
          <Link 
            href={ctaLink} 
            className="btn-primary px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            {ctaText}
          </Link>
        )}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}
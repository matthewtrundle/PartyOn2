'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
  const [isVisible, setIsVisible] = useState(false)
  
  // Debug logging
  useEffect(() => {
    console.log('VideoHero Debug:', {
      videoSrc,
      videoLoaded,
      videoError,
      isVisible
    })
  }, [videoSrc, videoLoaded, videoError, isVisible])

  // Reset video state when source changes
  useEffect(() => {
    setVideoLoaded(false)
    setVideoError(false)
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [videoSrc])
  const videoRef = useRef<HTMLVideoElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  
  // Intersection Observer for lazy loading and pausing
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting)
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {})
            } else {
              videoRef.current.pause()
            }
          }
        })
      },
      { threshold: 0.1 }
    )
    
    observer.observe(section)
    
    return () => {
      observer.disconnect()
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [])

  const heightClasses = {
    full: 'h-screen',
    tall: 'h-[80vh]',
    medium: 'h-[60vh]'
  }

  return (
    <section ref={sectionRef} className={`relative ${heightClasses[height]} min-h-[600px] flex items-center justify-center overflow-hidden`}>
      {/* Video Background */}
      {videoSrc && !videoError && isVisible && (
        <video
          key={videoSrc}
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Fallback Image */}
      <Image
        key={fallbackImage}
        src={fallbackImage}
        alt={title}
        fill
        className={`absolute inset-0 object-cover ${
          videoLoaded && !videoError && isVisible ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-500`}
        priority={height === 'full'}
        loading={height === 'full' ? 'eager' : 'lazy'}
        sizes="100vw"
      />

      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white px-6 max-w-5xl mx-auto">
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
            className="btn-primary px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-transform"
          >
            {ctaText}
          </Link>
        )}
      </div>

      {/* Scroll Indicator - Reduced animation */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <svg className="w-6 h-6 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}
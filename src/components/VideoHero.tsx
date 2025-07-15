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
  const [parallaxOffset, setParallaxOffset] = useState(0)
  
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
    const video = videoRef.current
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
      if (video) {
        video.pause()
      }
    }
  }, [])

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset
      const speed = 0.5
      setParallaxOffset(scrolled * speed)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const heightClasses = {
    full: 'h-[85vh]',
    tall: 'h-[70vh]',
    medium: 'h-[50vh]'
  }

  return (
    <section ref={sectionRef} className={`relative ${heightClasses[height]} min-h-[500px] flex items-center justify-center overflow-hidden`}>
      {/* Video Background with Parallax */}
      {videoSrc && !videoError && isVisible && (
        <video
          key={videoSrc}
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500`}
          style={{ transform: `translateY(${parallaxOffset}px)` }}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          poster={fallbackImage}
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Fallback Image with Parallax */}
      <div 
        className="absolute inset-0"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <Image
          key={fallbackImage}
          src={fallbackImage}
          alt={title}
          fill
          className={`object-cover ${
            videoLoaded && !videoError && isVisible ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-500`}
        priority={height === 'full'}
        loading={height === 'full' ? 'eager' : 'lazy'}
        sizes="100vw"
        />
      </div>

      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content - Compact & Clean */}
      <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto">
        <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl mb-4 text-shadow">
          {title}
        </h1>
        
        {subtitle && (
          <p className="font-sans font-medium text-accent-500 uppercase tracking-widest text-xs md:text-sm mb-4">
            {subtitle}
          </p>
        )}
        
        {description && (
          <p className="font-sans text-base md:text-lg lg:text-xl mb-6 text-white/90 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
        
        {ctaText && ctaLink && (
          <Link 
            href={ctaLink} 
            className="btn-primary text-base md:text-lg"
          >
            {ctaText}
          </Link>
        )}
      </div>

      {/* Subtle scroll hint */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-pulse">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 p-1">
          <div className="w-1 h-2 bg-white/50 rounded-full mx-auto animate-bounce" />
        </div>
      </div>
    </section>
  )
}
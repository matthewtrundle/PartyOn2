'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface ParallaxSectionProps {
  children: ReactNode
  speed?: number
  className?: string
}

export default function ParallaxSection({ children, speed = 0.5, className = '' }: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !contentRef.current) return

      const scrolled = window.pageYOffset
      const rect = sectionRef.current.getBoundingClientRect()
      const sectionTop = rect.top + scrolled
      const sectionHeight = rect.height
      
      // Calculate if section is in viewport
      const windowHeight = window.innerHeight
      const sectionBottom = sectionTop + sectionHeight
      
      if (scrolled + windowHeight > sectionTop && scrolled < sectionBottom) {
        const yPos = -(scrolled - sectionTop) * speed
        contentRef.current.style.transform = `translateY(${yPos}px)`
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial call

    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return (
    <div ref={sectionRef} className={`parallax-container ${className}`}>
      <div ref={contentRef} className="parallax-element">
        {children}
      </div>
    </div>
  )
}
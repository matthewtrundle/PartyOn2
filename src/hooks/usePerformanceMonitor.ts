'use client'

import { useEffect } from 'react'

export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return
    }

    // Measure FPS
    let frameCount = 0
    let lastTime = performance.now()
    const measureFPS = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        if (fps < 30) {
          console.warn(`[${componentName}] Low FPS detected: ${fps}`)
        }
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(measureFPS)
    }

    // Start FPS monitoring
    requestAnimationFrame(measureFPS)

    // Monitor memory usage
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory
        if (!memory) return
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
        const totalMB = Math.round(memory.totalJSHeapSize / 1048576)
        
        if (usedMB > totalMB * 0.9) {
          console.warn(`[${componentName}] High memory usage: ${usedMB}MB / ${totalMB}MB`)
        }
      }
    }

    const fpsInterval = setInterval(checkMemory, 5000)

    return () => {
      clearInterval(fpsInterval)
    }
  }, [componentName])
}
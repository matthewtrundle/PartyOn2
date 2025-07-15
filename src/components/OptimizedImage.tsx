import Image from 'next/image'
import { useState } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  sizes?: string
  quality?: number
}

export default function OptimizedImage({
  src,
  alt,
  fill = false,
  priority = false,
  className = '',
  sizes,
  quality = 85,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  
  // Generate blur placeholder data URL
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f8f9fa" offset="20%" />
          <stop stop-color="#e9ecef" offset="50%" />
          <stop stop-color="#f8f9fa" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f8f9fa" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
    </svg>`

  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str)

  const dataUrl = `data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`
  
  // Default sizes for responsive images
  const defaultSizes = fill 
    ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    : sizes
  
  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''} ${isLoading ? 'animate-pulse' : ''}`}>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        quality={quality}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        sizes={defaultSizes}
        placeholder="blur"
        blurDataURL={dataUrl}
        onLoadingComplete={() => setIsLoading(false)}
        {...props}
      />
    </div>
  )
}
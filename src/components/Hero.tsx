import Image from 'next/image'

interface HeroProps {
  title: string
  subtitle?: string
  description?: string
  backgroundImage: string
  ctaText?: string
  ctaLink?: string
  overlay?: boolean
  height?: 'full' | 'large' | 'medium'
}

export default function Hero({
  title,
  subtitle,
  description,
  backgroundImage,
  ctaText,
  ctaLink,
  overlay = true,
  height = 'full'
}: HeroProps) {
  const heightClasses = {
    full: 'h-[85vh]',
    large: 'h-[70vh]',
    medium: 'h-[50vh]'
  }

  return (
    <section className={`relative ${heightClasses[height]} flex items-center justify-center overflow-hidden`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage}
          alt={title}
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {overlay && <div className="hero-overlay" />}
      </div>

      {/* Subtle animated accents */}
      <div className="absolute inset-0 z-10 opacity-50">
        <div className="absolute top-1/4 -left-10 w-64 h-64 bg-primary-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-10 w-64 h-64 bg-secondary-500/20 rounded-full blur-[100px]" />
      </div>

      {/* Content - More compact */}
      <div className="container-custom relative z-20 text-center text-white">
        <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
          {subtitle && (
            <p className="font-sans font-medium text-accent-500 uppercase tracking-widest text-xs md:text-sm">
              {subtitle}
            </p>
          )}
          
          <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-tight text-shadow">
            {title}
          </h1>
          
          {description && (
            <p className="font-sans text-base md:text-lg lg:text-xl text-white/90 max-w-xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
          
          {ctaText && ctaLink && (
            <div className="pt-6">
              <a
                href={ctaLink}
                className="btn-primary text-base md:text-lg"
              >
                {ctaText}
              </a>
            </div>
          )}
        </div>

        {/* Subtle scroll hint */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-pulse">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 p-1">
            <div className="w-1 h-2 bg-white/50 rounded-full mx-auto animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  )
}
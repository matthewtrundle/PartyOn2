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
    full: 'min-h-screen',
    large: 'min-h-[80vh]',
    medium: 'min-h-[60vh]'
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

      {/* Animated background elements */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-austin-lake/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Content */}
      <div className="container-custom relative z-20 text-center text-white">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
          {subtitle && (
            <p className="font-sans font-semibold text-gold-400 uppercase tracking-wider text-sm md:text-base">
              {subtitle}
            </p>
          )}
          
          <h1 className="font-serif font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-tight text-shadow-lg">
            {title}
          </h1>
          
          {description && (
            <p className="font-sans text-lg md:text-xl lg:text-2xl text-neutral-100 max-w-2xl mx-auto leading-relaxed text-shadow">
              {description}
            </p>
          )}
          
          {ctaText && ctaLink && (
            <div className="pt-8">
              <a
                href={ctaLink}
                className="btn-primary text-lg px-8 py-4 hover:scale-105 transform transition-all duration-300"
              >
                {ctaText}
              </a>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-white/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
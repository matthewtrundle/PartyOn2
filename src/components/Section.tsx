interface SectionProps {
  children: React.ReactNode
  className?: string
  background?: 'white' | 'neutral' | 'gradient' | 'dark'
  padding?: 'sm' | 'md' | 'lg'
  id?: string
}

export default function Section({
  children,
  className = '',
  background = 'white',
  padding = 'md',
  id
}: SectionProps) {
  const backgrounds = {
    white: 'bg-white',
    neutral: 'bg-neutral-50',
    gradient: 'bg-gradient-to-br from-austin-sunset/10 to-austin-lake/10',
    dark: 'bg-navy-900 text-white'
  }

  const paddings = {
    sm: 'py-12 md:py-16 lg:py-20',
    md: 'py-20 md:py-28 lg:py-32',
    lg: 'py-28 md:py-36 lg:py-44'
  }

  return (
    <section
      id={id}
      className={`${backgrounds[background]} ${paddings[padding]} ${className}`}
    >
      <div className="container-custom">
        {children}
      </div>
    </section>
  )
}
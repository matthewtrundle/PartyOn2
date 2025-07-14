import Image from 'next/image'
import Link from 'next/link'

interface ServiceCardProps {
  title: string
  description: string
  image: string
  features: string[]
  price?: string
  link: string
  featured?: boolean
}

export default function ServiceCard({
  title,
  description,
  image,
  features,
  price,
  link,
  featured = false
}: ServiceCardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl transition-all duration-500 ${
      featured ? 'ring-2 ring-gold-500 shadow-glow' : ''
    }`}>
      <div className={`card ${featured ? 'border-2 border-gold-500' : ''} h-full flex flex-col`}>
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 right-4 z-10">
            <span className="bg-gradient-gold text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </span>
          </div>
        )}

        {/* Image */}
        <div className="relative h-64 -mx-8 -mt-8 mb-6 overflow-hidden rounded-t-2xl">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Content */}
        <div className="flex-grow space-y-4">
          <h3 className="font-serif text-2xl md:text-3xl text-navy-500 group-hover:text-gold-500 transition-colors duration-300">
            {title}
          </h3>
          
          <p className="font-sans text-neutral-600 leading-relaxed">
            {description}
          </p>

          {/* Features */}
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-sans text-sm text-neutral-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price and CTA */}
        <div className="mt-6 pt-6 border-t border-neutral-200 flex items-center justify-between">
          {price && (
            <div>
              <p className="text-sm text-neutral-500">Starting from</p>
              <p className="font-serif text-2xl text-navy-500">{price}</p>
            </div>
          )}
          
          <Link
            href={link}
            className={`${price ? 'btn-outline' : 'btn-primary w-full justify-center'} group-hover:scale-105 transform transition-all duration-300`}
          >
            Learn More
          </Link>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-gold-500/20 to-austin-lake/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10" />
    </div>
  )
}
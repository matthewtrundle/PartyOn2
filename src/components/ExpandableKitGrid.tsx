'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/types'
import { trackCTAClick } from '@/lib/analytics/ga4-events'

interface ExpandableKitGridProps {
  kits: Product[]
  onClickProduct?: (product: Product) => void
}

export default function ExpandableKitGrid({ kits, onClickProduct }: ExpandableKitGridProps) {
  const [showAll, setShowAll] = useState(false)
  const [initialCount, setInitialCount] = useState(9)

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    setInitialCount(isDesktop ? 8 : 9)
  }, [])

  const visibleKits = showAll ? kits : kits.slice(0, initialCount)
  const hasMore = kits.length > initialCount

  const CardWrapper = ({ kit, children }: { kit: Product; children: React.ReactNode }) => {
    if (onClickProduct) {
      return (
        <button
          key={kit.id}
          onClick={() => {
            trackCTAClick(kit.title, '#', 'packages')
            onClickProduct(kit)
          }}
          className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 text-left"
        >
          {children}
        </button>
      )
    }
    return (
      <Link
        key={kit.id}
        href={`/products/${kit.handle}`}
        onClick={() => trackCTAClick(kit.title, `/products/${kit.handle}`, 'packages')}
        className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
      >
        {children}
      </Link>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
        {visibleKits.map((kit: Product) => {
          const kitImage = kit.images.edges[0]?.node.url
          const kitPrice = kit.priceRange.minVariantPrice
          const kitVariant = kit.variants.edges[0]?.node
          const kitComparePrice = kitVariant?.compareAtPrice

          return (
            <CardWrapper key={kit.id} kit={kit}>
              <div className="relative aspect-square overflow-hidden">
                {kitImage ? (
                  <Image
                    src={kitImage}
                    alt={kit.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-2 sm:p-4">
                <h4 className="font-heading text-xs sm:text-base lg:text-lg text-gray-900 mb-1 sm:mb-2 group-hover:text-brand-yellow transition-colors font-semibold leading-tight">
                  {kit.title}
                </h4>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  {kitComparePrice && parseFloat(kitComparePrice.amount) > parseFloat(kitPrice.amount) && (
                    <span className="text-[10px] sm:text-sm text-gray-500 line-through">
                      ${parseFloat(kitComparePrice.amount).toFixed(2)}
                    </span>
                  )}
                  <span className="text-sm sm:text-lg font-medium text-gray-900">
                    ${parseFloat(kitPrice.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardWrapper>
          )
        })}
      </div>

      {hasMore && !showAll && (
        <div className="text-center mt-16">
          <button
            onClick={() => setShowAll(true)}
            className="inline-block border-2 border-gray-900 text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg font-medium tracking-widest transition-colors duration-200"
          >
            VIEW ALL COCKTAIL KITS
          </button>
        </div>
      )}
    </>
  )
}

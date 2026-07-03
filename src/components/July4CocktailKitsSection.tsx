'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Product } from '@/lib/types'
import ProductModal from '@/components/ProductModal'
import { trackCTAClick } from '@/lib/analytics/ga4-events'

/**
 * Seasonal "July 4th Cocktails!" section for the /cocktail-kits page.
 *
 * Renders the red/white/blue trio of pre-batched kits in a festive 3-up grid.
 * Clicking a card opens the shared {@link ProductModal}, which handles the age
 * gate and add-to-cart — the same purchase path used elsewhere on the page.
 */

// Short festive hook per kit handle (mirrors the /austin-4th-of-july-delivery copy).
const KIT_HOOKS: Record<string, string> = {
  'strawberry-lemonade-vodka-kit-serves-16': 'Bright, red, and ridiculously easy-drinking.',
  'blue-margarita-kit-serves-16': 'Our Austin margarita, gone blue.',
  'coconut-colada-kit-serves-16': 'Creamy, dreamy, and tropical.',
}

export default function July4CocktailKitsSection({ kits }: { kits: Product[] }) {
  const [modalProduct, setModalProduct] = useState<Product | null>(null)

  if (kits.length === 0) return null

  return (
    <section
      id="july-4th"
      className="relative py-16 bg-gradient-to-b from-blue-50 via-white to-white border-b border-gray-100"
    >
      {/* Festive red/white/blue top accent */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-600 via-white to-blue-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-red-600 text-white text-xs font-semibold tracking-[0.08em] px-4 py-1 mb-4">
            LIMITED TIME · RESERVE BY JULY 2
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4">
            July 4th Cocktails!
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Red, white &amp; blue — pre-batched, ice-cold, and ready to pour. Each kit serves 16, dispenser included.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {kits.map((kit) => {
            const kitImage = kit.images.edges[0]?.node.url
            const kitPrice = kit.priceRange.minVariantPrice
            const hook = KIT_HOOKS[kit.handle] ?? ''

            return (
              <button
                key={kit.id}
                onClick={() => {
                  trackCTAClick(kit.title, '#', 'packages')
                  setModalProduct(kit)
                }}
                className="group flex flex-col bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 text-left"
              >
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-heading text-lg sm:text-xl text-gray-900 font-semibold leading-tight">
                    {kit.title}
                  </h3>
                  {hook && <p className="mt-1 text-sm text-gray-600">{hook}</p>}

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-lg font-medium text-gray-900">
                      ${parseFloat(kitPrice.amount).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">serves 16</span>
                  </div>

                  <span className="mt-4 inline-block w-full rounded-lg bg-brand-yellow text-gray-900 text-center text-sm font-semibold tracking-[0.08em] py-2.5 group-hover:bg-yellow-600 transition-colors">
                    VIEW &amp; ADD TO CART
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <ProductModal
        product={modalProduct}
        isOpen={modalProduct !== null}
        onClose={() => setModalProduct(null)}
      />
    </section>
  )
}

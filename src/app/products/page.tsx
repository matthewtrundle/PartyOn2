'use client'

import { useState } from 'react'
import VideoHero from '@/components/VideoHero'
import Section from '@/components/Section'

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cartCount, setCartCount] = useState(0)

  // Placeholder products - will be replaced with Shopify Storefront API
  const products = [
    {
      id: 1,
      name: "Tito's Handmade Vodka",
      category: 'spirits',
      price: '$24.99',
      image: '/placeholder-titos.webp',
      popular: true
    },
    {
      id: 2,
      name: 'High Noon Variety Pack',
      category: 'seltzers',
      price: '$19.99',
      image: '/placeholder-highnoon.webp',
      popular: true
    },
    {
      id: 3,
      name: 'Casamigos Blanco Tequila',
      category: 'spirits',
      price: '$44.99',
      image: '/placeholder-casamigos.webp'
    },
    {
      id: 4,
      name: 'White Claw Variety Pack',
      category: 'seltzers',
      price: '$17.99',
      image: '/placeholder-whiteclaw.webp'
    },
    {
      id: 5,
      name: 'Modelo Especial 12-Pack',
      category: 'beer',
      price: '$16.99',
      image: '/placeholder-modelo.webp',
      popular: true
    },
    {
      id: 6,
      name: 'Josh Cellars Cabernet',
      category: 'wine',
      price: '$13.99',
      image: '/placeholder-josh.webp'
    },
    {
      id: 7,
      name: 'Grey Goose Vodka',
      category: 'spirits',
      price: '$39.99',
      image: '/placeholder-greygoose.webp'
    },
    {
      id: 8,
      name: 'Austin Beerworks IPA',
      category: 'beer',
      price: '$9.99',
      image: '/placeholder-austinbeer.webp',
      local: true
    }
  ]

  const categories = [
    { id: 'all', name: 'All Products', icon: '' },
    { id: 'spirits', name: 'Spirits', icon: '' },
    { id: 'wine', name: 'Wine', icon: '' },
    { id: 'beer', name: 'Beer', icon: '' },
    { id: 'seltzers', name: 'Seltzers', icon: '' },
    { id: 'mixers', name: 'Mixers', icon: '' },
    { id: 'party', name: 'Party Supplies', icon: '' }
  ]

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory)

  const handleAddToCart = (productId: number) => {
    setCartCount(cartCount + 1)
    // Shopify Storefront API integration would go here
    console.log('Added to cart:', productId)
  }

  return (
    <>
      {/* Hero Section */}
      <VideoHero
        title="Browse Our Selection"
        subtitle="Premium Spirits, Local Favorites, Party Essentials"
        description="Austin&apos;s largest selection of alcohol delivered in 30 minutes"
        videoSrc="/videos/backgrounds/boat-cooler.mp4"
        fallbackImage="/images/products/premium-spirits-boutique.webp"
        ctaText="Start Shopping"
        ctaLink="#products"
        height="medium"
      />

      {/* Shopping Cart Sticky */}
      <div className="fixed top-24 right-8 z-40 bg-white rounded-full shadow-lg p-4 hover:shadow-xl transition-shadow">
        <button className="flex items-center gap-2">
          <svg className="w-6 h-6 text-navy-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="bg-gold-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {cartCount}
          </span>
        </button>
      </div>

      {/* Category Filter */}
      <Section id="products">
        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-sans font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gold-500 text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {category.icon && <span className="mr-2">{category.icon}</span>}
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48 bg-neutral-100">
                {/* Placeholder for product image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl text-gold-500">POD</span>
                </div>
                {product.popular && (
                  <span className="absolute top-2 left-2 bg-gold-500 text-white text-xs px-2 py-1 rounded">
                    Popular
                  </span>
                )}
                {product.local && (
                  <span className="absolute top-2 left-2 bg-austin-sunset text-white text-xs px-2 py-1 rounded">
                    Local Favorite
                  </span>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">
                  {product.name}
                </h3>
                <p className="font-sans text-2xl text-gold-500 mb-4">
                  {product.price}
                </p>
                <button 
                  onClick={() => handleAddToCart(product.id)}
                  className="w-full btn-primary py-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Shopify Integration Notice */}
        <div className="mt-16 p-8 bg-gradient-to-br from-gold-50 to-austin-sunset/10 rounded-2xl text-center">
          <h3 className="font-serif text-2xl text-navy-500 mb-4">
            Full Catalog Coming Soon
          </h3>
          <p className="font-sans text-neutral-600 max-w-2xl mx-auto">
            We&apos;re integrating with Shopify to bring you real-time inventory, pricing, and checkout. 
            In the meantime, call us at (512) 555-0123 to place your order!
          </p>
        </div>
      </Section>

      {/* Features */}
      <section className="section-padding bg-neutral-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-austin-lake/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-austin-lake" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">30-Minute Delivery</h3>
              <p className="font-sans text-sm text-neutral-600">
                Lightning-fast delivery across Austin and Lake Travis
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-austin-lake/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-austin-lake" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">Age Verified</h3>
              <p className="font-sans text-sm text-neutral-600">
                Secure ID verification for every delivery
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-austin-lake/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-austin-lake" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="font-sans font-bold text-lg text-navy-500 mb-2">Premium Selection</h3>
              <p className="font-sans text-sm text-neutral-600">
                Top brands and local Austin favorites
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
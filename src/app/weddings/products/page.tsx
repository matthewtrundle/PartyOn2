'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import { useCartContext } from '@/contexts/CartContext';

export default function WeddingProductsPage() {
  const { cart } = useCartContext();
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});

  const handleAddToCart = async (productId: string) => {
    setAddingToCart({ ...addingToCart, [productId]: true });
    // This will be connected to actual Shopify products later
    console.log(`Adding product ${productId} to cart`);
    setTimeout(() => {
      setAddingToCart({ ...addingToCart, [productId]: false });
    }, 1000);
  };

  const curatedCollections = [
    {
      title: "Wedding Essentials",
      description: "Everything you need for the perfect wedding bar",
      products: [
        {
          id: 'wedding-champagne-1',
          title: 'Moët & Chandon Impérial',
          price: '$65',
          image: '/images/gallery/sunset-champagne-pontoon.webp',
          description: 'Classic champagne for toasts'
        },
        {
          id: 'wedding-champagne-2',
          title: 'Veuve Clicquot Yellow Label',
          price: '$75',
          image: '/images/gallery/sunset-champagne-pontoon.webp',
          description: 'Premium champagne selection'
        },
        {
          id: 'wedding-wine-1',
          title: 'Caymus Cabernet Sauvignon',
          price: '$95',
          image: '/images/products/wine-collection-cellar.webp',
          description: 'Napa Valley excellence'
        },
        {
          id: 'wedding-wine-2',
          title: 'Cakebread Chardonnay',
          price: '$55',
          image: '/images/products/wine-collection-cellar.webp',
          description: 'Elegant white wine'
        }
      ]
    },
    {
      title: "Signature Cocktail Bar",
      description: "Premium spirits for custom cocktails",
      products: [
        {
          id: 'wedding-spirit-1',
          title: 'Grey Goose Vodka',
          price: '$45',
          image: '/images/products/premium-spirits-wall.webp',
          description: 'French premium vodka'
        },
        {
          id: 'wedding-spirit-2',
          title: 'Hendrick\'s Gin',
          price: '$42',
          image: '/images/products/premium-spirits-boutique.webp',
          description: 'Distinctive Scottish gin'
        },
        {
          id: 'wedding-spirit-3',
          title: 'Patrón Silver Tequila',
          price: '$55',
          image: '/images/products/tequila-blanco.png',
          description: 'Ultra-premium tequila'
        },
        {
          id: 'wedding-spirit-4',
          title: 'Macallan 12 Year',
          price: '$85',
          image: '/images/products/premium-spirits-wall.webp',
          description: 'Single malt Scotch'
        }
      ]
    },
    {
      title: "Reception Packages",
      description: "Complete bar solutions for your reception",
      products: [
        {
          id: 'wedding-package-1',
          title: 'Classic Bar Package (50 guests)',
          price: '$1,299',
          image: '/images/services/weddings/outdoor-bar-setup.webp',
          description: 'Beer, wine, and standard spirits'
        },
        {
          id: 'wedding-package-2',
          title: 'Premium Bar Package (50 guests)',
          price: '$1,899',
          image: '/images/services/weddings/premium-spirits-display.webp',
          description: 'Top-shelf spirits and wines'
        },
        {
          id: 'wedding-package-3',
          title: 'Champagne Toast (100 guests)',
          price: '$650',
          image: '/images/gallery/sunset-champagne-pontoon.webp',
          description: 'Moët for ceremonial toasts'
        },
        {
          id: 'wedding-package-4',
          title: 'Wine Service (100 guests)',
          price: '$850',
          image: '/images/products/wine-collection-cellar.webp',
          description: 'Red and white selection'
        }
      ]
    }
  ];

  return (
    <div className="bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/services/weddings/outdoor-bar-setup.webp"
          alt="Wedding Bar Setup"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />

        <div className="relative text-center text-white z-10 max-w-4xl mx-auto px-8 hero-fade-in">
          <h1 className="font-heading font-light text-4xl md:text-6xl mb-4 tracking-[0.08em]">
            WEDDING COLLECTION
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-4" />
          <p className="text-lg font-light tracking-[0.1em] text-gray-200">
            Curated selections for your perfect day
          </p>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/weddings" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
                ← Back to Weddings
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/order" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
                Browse All Products
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Cart ({cart?.totalQuantity || 0})</span>
              <Link href="/checkout">
                <button className="px-4 py-2 bg-brand-yellow text-gray-900 text-sm hover:bg-yellow-600 transition-colors">
                  CHECKOUT
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Collections */}
      {curatedCollections.map((collection, collectionIndex) => (
        <section key={collection.title} className={`py-16 ${collectionIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-8">
            <ScrollRevealCSS
              duration={800}
              y={20}
              className="text-center mb-12"
            >
              <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
                {collection.title}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {collection.description}
              </p>
            </ScrollRevealCSS>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {collection.products.map((product, index) => (
                <ScrollRevealCSS
                  key={product.id}
                  duration={500}
                  y={20}
                  delay={index * 100}
                  className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="relative h-64">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-xl text-gray-900 mb-2">{product.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-2xl text-brand-yellow">{product.price}</span>
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        disabled={addingToCart[product.id]}
                        className={`px-4 py-2 text-sm font-medium transition-all ${
                          addingToCart[product.id]
                            ? 'bg-green-600 text-white'
                            : 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                        }`}
                      >
                        {addingToCart[product.id] ? 'ADDED!' : 'ADD TO CART'}
                      </button>
                    </div>
                  </div>
                </ScrollRevealCSS>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-br from-yellow-50 to-yellow-100">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
            Need a Custom Quote?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Our wedding specialists can help create the perfect bar experience for your special day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] font-medium">
                GET CUSTOM QUOTE
              </button>
            </Link>
            <Link href="/weddings/packages/classic">
              <button className="px-8 py-4 bg-white text-brand-yellow border-2 border-brand-yellow hover:bg-yellow-50 transition-colors tracking-[0.08em] font-medium">
                VIEW PACKAGES
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
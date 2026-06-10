'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import { useCartContext } from '@/contexts/CartContext';

export default function CorporateProductsPage() {
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
      title: "Executive Selections",
      description: "Premium spirits for client entertainment",
      products: [
        {
          id: 'corp-whiskey-1',
          title: 'Executive Whiskey Collection',
          price: '$450',
          image: '/images/products/premium-spirits-wall.webp',
          description: 'Macallan, Glenfiddich, Balvenie'
        },
        {
          id: 'corp-cognac-1',
          title: 'Hennessy Paradis',
          price: '$650',
          image: '/images/products/premium-spirits-boutique.webp',
          description: 'Ultra-premium cognac'
        },
        {
          id: 'corp-wine-1',
          title: 'Opus One Cabernet',
          price: '$380',
          image: '/images/products/wine-collection-cellar.webp',
          description: 'Napa Valley icon'
        },
        {
          id: 'corp-champagne-1',
          title: 'Krug Grande Cuvée',
          price: '$220',
          image: '/images/gallery/sunset-champagne-pontoon.webp',
          description: 'Prestige champagne'
        }
      ]
    },
    {
      title: "Team Building & Events",
      description: "Perfect for office celebrations",
      products: [
        {
          id: 'corp-beer-1',
          title: 'Local Craft Beer Selection',
          price: '$180',
          image: '/images/products/delivery-bag-contents.webp',
          description: '48 Austin craft beers'
        },
        {
          id: 'corp-cocktail-1',
          title: 'Cocktail Hour Kit',
          price: '$299',
          image: '/images/products/branded-delivery-bag.webp',
          description: 'Complete bar setup for 25'
        },
        {
          id: 'corp-wine-2',
          title: 'Wine & Cheese Pairing',
          price: '$425',
          image: '/images/products/wine-collection-cellar.webp',
          description: '8 wines with pairing notes'
        },
        {
          id: 'corp-na-1',
          title: 'Non-Alcoholic Premium',
          price: '$125',
          image: '/images/products/delivery-bag-contents.webp',
          description: 'Mocktails and sodas'
        }
      ]
    },
    {
      title: "Corporate Packages",
      description: "Comprehensive solutions for business events",
      products: [
        {
          id: 'corp-package-1',
          title: 'Board Meeting Package',
          price: '$899',
          image: '/images/services/corporate/penthouse-suite-setup.webp',
          description: 'Premium spirits for 12 executives'
        },
        {
          id: 'corp-package-2',
          title: 'Holiday Party (50 employees)',
          price: '$2,499',
          image: '/images/hero/corporate-hero-gala.webp',
          description: 'Full bar service'
        },
        {
          id: 'corp-package-3',
          title: 'Client Entertainment Suite',
          price: '$1,299',
          image: '/images/hero/corporate-hero-conference.webp',
          description: 'Luxury spirits and wine'
        },
        {
          id: 'corp-package-4',
          title: 'Product Launch Event',
          price: '$3,499',
          image: '/images/hero/corporate-hero-tech.webp',
          description: 'Champagne and cocktails for 100'
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
          src="/images/services/corporate/penthouse-suite-setup.webp"
          alt="Corporate Bar Setup"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />

        <div className="relative text-center text-white z-10 max-w-4xl mx-auto px-8 hero-fade-in">
          <h1 className="font-heading font-light text-4xl md:text-6xl mb-4 tracking-[0.08em]">
            CORPORATE COLLECTION
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-4" />
          <p className="text-lg font-light tracking-[0.1em] text-gray-200">
            Premium selections for business excellence
          </p>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/corporate" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
                ← Back to Corporate
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/products" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
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
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
            Need a Corporate Account?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Volume discounts and dedicated support for your business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] font-medium">
                REQUEST PROPOSAL
              </button>
            </Link>
            <Link href="/partners">
              <button className="px-8 py-4 bg-white text-brand-yellow border-2 border-brand-yellow hover:bg-yellow-50 transition-colors tracking-[0.08em] font-medium">
                PARTNER PROGRAM
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
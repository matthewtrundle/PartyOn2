'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

export default function LuxuryPrabalPage() {
  const [activeColor, setActiveColor] = useState(0);
  const colors = ['#FF1744', '#7C4DFF', '#00E676', '#FFD600'];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveColor((prev) => (prev + 1) % colors.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [colors.length]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Bold Hero with Color Transitions */}
      <section className="relative h-screen overflow-hidden">
        <div
          className="absolute inset-0 transition-colors duration-1000"
          style={{ backgroundColor: colors[activeColor] }}
        />

        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-6 hero-fade-in">
              Aperol Spritz Recipe
            </h1>
            <ScrollRevealCSS duration={800} delay={0} y={30}>
              <p className="text-2xl md:text-3xl font-light tracking-wider">
                REDEFINING ALCOHOL DELIVERY
              </p>
            </ScrollRevealCSS>
          </div>
        </div>

        {/* Geometric Overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 200" className="w-full">
            <polygon points="0,200 1200,200 1200,0 0,150" fill="black" />
          </svg>
        </div>
      </section>

      {/* Bold Statement Section */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-6xl font-bold mb-8">
                WHERE
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                  CREATIVITY
                </span>
                MEETS SERVICE
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                Austin&apos;s most innovative alcohol delivery service. Premium spirits, 
                craft cocktails, and party essentials delivered in 2 hours with style.
              </p>
              <Link href="/services">
                <button className="px-8 py-4 bg-white text-black font-bold hover:bg-gray-200 transition-colors">
                  EXPLORE OUR VISION
                </button>
              </Link>
            </div>
            <div className="relative h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 opacity-20" />
              <Image
                src="/images/services/corporate/penthouse-suite-setup.webp"
                alt="Bold Service"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Color Block Services */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-5xl font-bold text-center mb-16">OUR SPECTRUM</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="relative h-[500px] bg-gradient-to-br from-red-500 to-pink-600 p-12 flex flex-col justify-end">
              <h3 className="text-3xl font-bold mb-4">SPIRITS</h3>
              <p className="text-lg mb-6">
                Premium whiskeys, vodkas, tequilas & more. Curated selection delivered fast.
              </p>
              <Link href="/austin-corporate-event-delivery">
                <button className="text-white font-bold hover:underline">
                  LEARN MORE →
                </button>
              </Link>
            </div>
            
            <div className="relative h-[500px] bg-gradient-to-br from-purple-500 to-blue-600 p-12 flex flex-col justify-end">
              <h3 className="text-3xl font-bold mb-4">COCKTAILS</h3>
              <p className="text-lg mb-6">
                Craft cocktail kits with fresh ingredients. Mixologist-approved recipes.
              </p>
              <Link href="/weddings">
                <button className="text-white font-bold hover:underline">
                  LEARN MORE →
                </button>
              </Link>
            </div>
            
            <div className="relative h-[500px] bg-gradient-to-br from-green-500 to-teal-600 p-12 flex flex-col justify-end">
              <h3 className="text-3xl font-bold mb-4">PACKAGES</h3>
              <p className="text-lg mb-6">
                Complete party solutions with mixers, garnishes & barware included.
              </p>
              <Link href="/venues">
                <button className="text-white font-bold hover:underline">
                  LEARN MORE →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Artistic Portfolio Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-5xl font-bold text-center mb-16">PORTFOLIO</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'ai-party-setup-flatlay',
              'ai-recommended-setup',
              'headquarters-entrance',
              'party-headquarters',
              'sunset-champagne-pontoon',
              'futuristic-cocktail-menu',
              'holographic-cocktail-menu',
              'ai-party-setup-flatlay'
            ].map((image, i) => (
              <div
                key={i}
                className="relative h-64 overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer"
              >
                <Image
                  src={`/images/gallery/${image}.webp`}
                  alt={`Portfolio ${i + 1}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-90" />
        <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
          <h2 className="text-6xl font-bold mb-8">READY TO BE BOLD?</h2>
          <p className="text-2xl mb-12">
            Experience Austin&apos;s boldest alcohol delivery service.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/consultation">
              <button className="px-12 py-6 bg-black text-white font-bold hover:bg-gray-900 transition-colors">
                START YOUR JOURNEY
              </button>
            </Link>
            <Link href="/portfolio">
              <button className="px-12 py-6 border-4 border-white text-white font-bold hover:bg-white hover:text-black transition-all">
                VIEW OUR WORK
              </button>
            </Link>
            <Link href="/order-now">
              <button className="px-12 py-6 bg-white text-black font-bold hover:bg-gray-200 transition-colors">
                ORDER NOW
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bold Footer */}
      <footer className="py-16 bg-white text-black">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <h3 className="text-4xl font-bold mb-2">PARTY ON</h3>
              <p className="text-gray-600">Breaking Boundaries Since 2016</p>
            </div>
            <div className="flex space-x-8">
              <Link href="/contact" className="font-bold hover:underline">CONTACT</Link>
              <Link href="/about" className="font-bold hover:underline">ABOUT</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
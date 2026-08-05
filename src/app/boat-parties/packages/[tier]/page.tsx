'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navigation from "@/components/Navigation";
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { useCustomProducts } from '@/lib/cart/hooks/useCustomProducts';
import { useCartContext } from '@/contexts/CartContext';
import { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { calculatePackageQuantity, getUnitSize } from '@/lib/package-calculations';

interface PackageItem {
  product: Product;
  quantity: number;
  category: string;
}

const PACKAGE_CONFIGS = {
  'sunset-cruise': {
    name: 'Sunset Cruise',
    description: 'Intimate sunset experience on Lake Travis for up to 12 guests',
    guestCount: 12,
    serviceType: 'dock-delivery',
    categories: {
      wine: { count: 3, description: 'Sunset-worthy wines' },
      beer: { count: 2, description: 'Craft beer selection' },
      spirits: { count: 2, description: 'Premium spirits' },
      mixers: { count: 3, description: 'Essential mixers' }
    },
    extras: [
      'Premium cooler with ice',
      'Dock delivery service',
      'Sunset timing coordination',
      'Floating drink holders'
    ]
  },
  'lake-life-luxury': {
    name: 'Lake Life Luxury',
    description: 'Our signature package for unforgettable lake days with up to 25 guests',
    guestCount: 25,
    serviceType: 'water-delivery',
    categories: {
      spirits: { count: 6, description: 'Premium spirits selection' },
      wine: { count: 4, description: 'Wines & champagne' },
      beer: { count: 4, description: 'Variety of beers' },
      mixers: { count: 6, description: 'Full mixer selection' }
    },
    extras: [
      'Multiple premium coolers',
      'Full bar setup on deck',
      'Water or dock delivery',
      'Professional setup crew',
      'Floating bar accessories',
      'Custom playlist coordination'
    ]
  },
  'regatta-ready': {
    name: 'Regatta Ready',
    description: 'Ultimate luxury for yacht parties and regattas with up to 50 guests',
    guestCount: 50,
    serviceType: 'yacht-service',
    categories: {
      spirits: { count: 10, description: 'Ultra-premium spirits' },
      wine: { count: 8, description: 'Fine wine selection' },
      beer: { count: 6, description: 'Premium beer variety' },
      mixers: { count: 10, description: 'Complete bar program' }
    },
    extras: [
      'Complete yacht bar service',
      'Professional bartender (4 hours)',
      'Custom cocktail menu',
      'Gold-standard service',
      'Captain coordination',
      'All-day provisions',
      'Luxury glassware',
      'VIP treatment'
    ]
  }
};

export default function BoatPartyPackagePage() {
  const params = useParams();
  const router = useRouter();
  const tier = params?.tier as string;
  const { products, loading } = useCustomProducts(100);
  const { addToCart, loading: cartLoading } = useCartContext();
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [addingAll, setAddingAll] = useState(false);

  const config = PACKAGE_CONFIGS[tier as keyof typeof PACKAGE_CONFIGS];

  useEffect(() => {
    if (!config || loading || products.length === 0) return;

    // Curate package based on product types - prioritize lake/summer appropriate items
    const curatedPackage: PackageItem[] = [];
    
    // Get spirits - prioritize vodka, rum, tequila for boat parties
    const spirits = products.filter(p => {
      const type = p.productType?.toLowerCase() || '';
      return (
        type.includes('liquor') ||
        type.includes('spirit') || 
        type.includes('vodka') || 
        type.includes('rum') ||
        type.includes('tequila') ||
        type.includes('whiskey') ||
        type.includes('bourbon') ||
        type.includes('gin')
      );
    });
    
    // Get wines - prioritize rosé and white wines for boats
    const wines = products.filter(p => {
      const type = p.productType?.toLowerCase() || '';
      return (
        type.includes('wine') ||
        type.includes('rosé') ||
        type.includes('rose') ||
        type.includes('champagne') ||
        type.includes('prosecco')
      );
    });
    
    // Get beers - prioritize light beers and seltzers
    const beers = products.filter(p => {
      const type = p.productType?.toLowerCase() || '';
      return (
        type.includes('beer') ||
        type.includes('seltzer')
      );
    });
    
    // Get mixers
    const mixers = products.filter(p => {
      const type = p.productType?.toLowerCase() || '';
      return (
        type.includes('mixer') ||
        type.includes('cocktail mix') ||
        type.includes('sparkling water') ||
        type.includes('sweetener') ||
        p.tags.some(tag => tag.toLowerCase().includes('mixer'))
      );
    });

    // Add spirits to package
    spirits.slice(0, config.categories.spirits.count).forEach(product => {
      const unitSize = getUnitSize(product);
      curatedPackage.push({
        product,
        quantity: calculatePackageQuantity('spirits', config.guestCount, 'boat', 4, unitSize),
        category: 'spirits'
      });
    });

    // Add wines
    wines.slice(0, config.categories.wine.count).forEach(product => {
      const unitSize = getUnitSize(product);
      curatedPackage.push({
        product,
        quantity: calculatePackageQuantity('wine', config.guestCount, 'boat', 4, unitSize),
        category: 'wine'
      });
    });

    // Add beers
    beers.slice(0, config.categories.beer.count).forEach(product => {
      const unitSize = getUnitSize(product);
      curatedPackage.push({
        product,
        quantity: calculatePackageQuantity('beer', config.guestCount, 'boat', 4, unitSize),
        category: 'beer'
      });
    });

    // Add mixers
    mixers.slice(0, config.categories.mixers.count).forEach(product => {
      const unitSize = getUnitSize(product);
      curatedPackage.push({
        product,
        quantity: calculatePackageQuantity('mixers', config.guestCount, 'boat', 4, unitSize),
        category: 'mixers'
      });
    });

    setPackageItems(curatedPackage);

    // Calculate total price
    const total = curatedPackage.reduce((sum, item) => {
      const price = parseFloat(item.product.priceRange.minVariantPrice.amount);
      return sum + (price * item.quantity);
    }, 0);
    setTotalPrice(total);
  }, [products, loading, config]);

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const updated = [...packageItems];
    updated[index].quantity = Math.max(1, newQuantity);
    setPackageItems(updated);

    // Recalculate total
    const total = updated.reduce((sum, item) => {
      const price = parseFloat(item.product.priceRange.minVariantPrice.amount);
      return sum + (price * item.quantity);
    }, 0);
    setTotalPrice(total);
  };

  const handleRemoveItem = (index: number) => {
    const updated = packageItems.filter((_, i) => i !== index);
    setPackageItems(updated);

    // Recalculate total
    const total = updated.reduce((sum, item) => {
      const price = parseFloat(item.product.priceRange.minVariantPrice.amount);
      return sum + (price * item.quantity);
    }, 0);
    setTotalPrice(total);
  };

  const handleAddAllToCart = async () => {
    setAddingAll(true);
    try {
      for (const item of packageItems) {
        const variant = item.product.variants.edges[0]?.node;
        if (variant) {
          await addToCart(variant.id, item.quantity);
        }
      }
      // Redirect to cart or show success message
      router.push('/products');
    } catch (error) {
      console.error('Error adding items to cart:', error);
    } finally {
      setAddingAll(false);
    }
  };

  if (!config) {
    return (
      <div className="bg-white min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-8 py-16 text-center">
          <h2 className="font-heading text-2xl text-gray-900 mb-4">Package Not Found</h2>
          <Link href="/boat-parties" className="text-brand-yellow hover:text-yellow-600">
            Return to Boat Party Packages
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-8 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-yellow"></div>
          <p className="mt-4 text-gray-600">Curating your perfect lake day package...</p>
        </div>
      </div>
    );
  }

  const categoryGroups = packageItems.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
    return groups;
  }, {} as Record<string, PackageItem[]>);

  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      
      {/* Header */}
      <section className="pt-32 pb-16 px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 hero-fade-in">
            <h1 className="font-heading text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              {config.name}
            </h1>
            <p className="text-xl text-gray-600 mb-8">{config.description}</p>
            
            {/* Package Details */}
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-gray-500 tracking-[0.1em]">GUESTS</p>
                <p className="font-medium text-lg">Up to {config.guestCount}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 tracking-[0.1em]">SERVICE</p>
                <p className="font-medium text-lg capitalize">{config.serviceType.replace('-', ' ')}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 tracking-[0.1em]">LOCATION</p>
                <p className="font-medium text-lg">Lake Travis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Package Items */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-8">
          {/* Summary Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-gray-50 p-6 mb-12 flex justify-between items-center">
            <div>
              <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em]">
                Package Total
              </h2>
              <p className="text-3xl text-brand-yellow mt-2">
                {formatPrice(totalPrice.toString(), 'USD')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Plus delivery & service fees</p>
              <p className="text-xs text-gray-500 mt-2 max-w-xs">
                * Final price may vary based on product availability and current pricing
              </p>
            </div>
            <button
              onClick={handleAddAllToCart}
              disabled={packageItems.length === 0 || addingAll || cartLoading}
              className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm disabled:opacity-50"
            >
              {addingAll ? 'ADDING TO CART...' : 'ADD ALL TO CART'}
            </button>
          </div>

          {/* Items by Category */}
          {Object.entries(categoryGroups).map(([category, items]) => (
            <div key={category} className="mb-12">
              <h3 className="font-heading text-2xl text-gray-900 mb-6 tracking-[0.1em] capitalize">
                {category}
              </h3>
              <div className="space-y-6">
                {items.map((item, index) => {
                  const globalIndex = packageItems.indexOf(item);
                  return (
                    <ScrollRevealCSS key={item.product.id} delay={index * 100}>
                      <div className="bg-white border border-gray-200 p-6">
                      <div className="flex items-center gap-6">
                        {/* Product Image */}
                        <div className="w-24 h-24 flex-shrink-0">
                          {item.product.images.edges.length > 0 ? (
                            <img
                              src={item.product.images.edges[0].node.url}
                              alt={item.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1">
                          <Link href={`/products/${item.product.handle}`}>
                            <h4 className="font-medium text-lg text-gray-900 hover:text-brand-yellow transition-colors">
                              {item.product.title}
                            </h4>
                          </Link>
                          <p className="text-gray-600">
                            {formatPrice(
                              item.product.priceRange.minVariantPrice.amount,
                              item.product.priceRange.minVariantPrice.currencyCode
                            )} each
                          </p>
                          {item.product.vendor && (
                            <p className="text-sm text-gray-500">{item.product.vendor}</p>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleQuantityChange(globalIndex, item.quantity - 1)}
                            className="w-10 h-10 border border-gray-300 hover:border-brand-yellow transition-colors"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(globalIndex, item.quantity + 1)}
                            className="w-10 h-10 border border-gray-300 hover:border-brand-yellow transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <p className="font-medium text-lg">
                            {formatPrice(
                              (parseFloat(item.product.priceRange.minVariantPrice.amount) * item.quantity).toString(),
                              item.product.priceRange.minVariantPrice.currencyCode
                            )}
                          </p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(globalIndex)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          aria-label="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      </div>
                    </ScrollRevealCSS>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Service Inclusions */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-gray-50 p-8">
            <h3 className="font-heading text-2xl text-gray-900 mb-6 tracking-[0.1em]">
              Package Includes
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {config.extras.map((extra, index) => (
                <div key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-brand-yellow mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-gray-700">{extra}</p>
                </div>
              ))}
            </div>

            {/* Lake Safety Notice */}
            <div className="mt-8 p-4 bg-blue-100 border border-blue-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Lake Safety First</p>
                  <p>All packages are designed with boat safety in mind. We encourage responsible consumption and provide sealed, boat-safe packaging. Always designate a sober captain.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 flex justify-center space-x-4">
            <button
              onClick={handleAddAllToCart}
              disabled={packageItems.length === 0 || addingAll || cartLoading}
              className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm disabled:opacity-50"
            >
              {addingAll ? 'ADDING TO CART...' : 'ADD PACKAGE TO CART'}
            </button>
            <Link href="/boat-parties">
              <button className="px-8 py-4 border border-gray-300 text-gray-700 hover:border-brand-yellow transition-colors tracking-[0.08em] text-sm">
                BACK TO PACKAGES
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img 
                src="/images/pod-logo-2025.svg" 
                alt="Party On Delivery"
                className="h-16 w-auto mb-4"
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Lake Travis&apos;s premier boat party supplier since 2020.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">LAKE SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/delivery-areas#lake-travis" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Marinas</Link></li>
                <li><Link href="/safety" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Safety Info</Link></li>
                <li><Link href="/captains" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Captain Partners</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SHOP</h4>
              <ul className="space-y-2">
                <li><Link href="/order" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">All Products</Link></li>
                <li><Link href="/collections" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Collections</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Marina Hours: 8am - 8pm</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2024 Party On Delivery. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
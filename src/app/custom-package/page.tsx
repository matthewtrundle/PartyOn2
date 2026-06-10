'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import { useCustomProducts } from '@/lib/cart/hooks/useCustomProducts';
import { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';

interface PackageItem {
  quantity: number;
  product: string;
}

interface PackageData {
  name: string;
  items: PackageItem[];
  createdAt: string;
}

export default function CustomPackagePage() {
  const router = useRouter();
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<{ item: PackageItem; products: Product[] }[]>([]);
  const { products, loading, loadMore, hasNextPage } = useCustomProducts(50);
  const { addToCart, loading: cartLoading } = useCartContext();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    // Load package data from localStorage
    const storedPackage = localStorage.getItem('ai-package');
    if (storedPackage) {
      const parsed = JSON.parse(storedPackage);
      setPackageData(parsed);
    } else {
      // No package data, redirect to products
      router.push('/products');
    }
  }, [router]);
  
  // Load more products if available
  useEffect(() => {
    if (hasNextPage && !loading) {
      loadMore();
    }
  }, [hasNextPage, loading, loadMore]);

  useEffect(() => {
    if (packageData && products.length > 0) {
      // Match package items with actual products
      const matches = packageData.items.map(item => {
        // Clean up the product name
        const searchTerm = item.product.toLowerCase()
          .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
        
        const foundProducts = products.filter(product => {
          const productTitle = product.title.toLowerCase();
          const productType = product.productType?.toLowerCase() || '';
          const vendor = product.vendor?.toLowerCase() || '';
          
          // Special handling for common products
          if (searchTerm.includes('tito') && searchTerm.includes('vodka')) {
            return productTitle.includes('tito') || productTitle.includes('titos');
          }
          if (searchTerm.includes('ranch water')) {
            return productTitle.includes('ranch') && (productTitle.includes('water') || productTitle.includes('rider'));
          }
          if (searchTerm.includes('white claw')) {
            return productTitle.includes('white claw') || productTitle.includes('whiteclaw');
          }
          if (searchTerm.includes('corona')) {
            return productTitle.includes('corona');
          }
          
          // Try to match by keywords
          const keywords = searchTerm.split(' ').filter(k => k.length > 2);
          const matchScore = keywords.reduce((score, keyword) => {
            if (productTitle.includes(keyword)) score += 2;
            if (productType.includes(keyword)) score += 1;
            if (vendor.includes(keyword)) score += 1;
            return score;
          }, 0);
          
          return matchScore > 0;
        })
        .sort((a, b) => {
          // Sort by relevance (prefer title matches)
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aScore = searchTerm.split(' ').filter(k => aTitle.includes(k)).length;
          const bScore = searchTerm.split(' ').filter(k => bTitle.includes(k)).length;
          return bScore - aScore;
        })
        .slice(0, 3); // Show top 3 matches
        
        return { item, products: foundProducts };
      });
      
      setMatchedProducts(matches);
    }
  }, [packageData, products]);

  const handleAddToCart = async (product: Product, quantity: number) => {
    if (!product.variants.edges[0]) return;
    
    const variantId = product.variants.edges[0].node.id;
    console.log('Adding to cart:', { variantId, quantity });
    
    setAddingToCart(product.id);
    try {
      await addToCart(variantId, quantity);
    } catch (error) {
      console.error('Add to cart error:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  if (!packageData || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="pt-32 pb-16 text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 mx-auto rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Header */}
      <section className="pt-32 pb-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h1 className="font-heading text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.08em]">
            {packageData.name}
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Curated by Wayne, your Texas Party Pro
          </p>
        </div>
      </section>

      {/* Package Summary */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-heading text-xl text-gray-900 tracking-[0.1em]">Package Contents</h2>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Estimated Total</p>
                <p className="text-2xl font-heading text-brand-yellow">
                  {matchedProducts.length > 0 ? (
                    formatPrice(
                      matchedProducts.reduce((total, match) => {
                        const firstProduct = match.products[0];
                        if (firstProduct) {
                          return total + (parseFloat(firstProduct.priceRange.minVariantPrice.amount) * match.item.quantity);
                        }
                        return total;
                      }, 0).toString(),
                      'USD'
                    )
                  ) : (
                    'Calculating...'
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {packageData.items.map((item, index) => (
                <div key={index} className="flex items-center text-sm">
                  <span className="font-medium text-brand-yellow mr-2">{item.quantity}x</span>
                  <span className="text-gray-700">{item.product}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Package Items */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="space-y-8">
            {matchedProducts.map((match, index) => (
              <div key={index} className="border-b border-gray-200 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-2xl text-gray-900 tracking-[0.1em]">
                    {match.item.quantity}x {match.item.product}
                  </h3>
                  {match.products.length === 0 && (
                    <span className="text-sm text-gray-500">No exact matches found</span>
                  )}
                </div>
                
                {match.products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {match.products.map((product, productIndex) => (
                      <div key={`${product.id}-${index}-${productIndex}`} className="bg-gray-50 rounded-lg p-4">
                        <div className="aspect-square relative mb-4">
                          {product.images.edges[0]?.node && (
                            <Image
                              src={product.images.edges[0].node.url}
                              alt={product.title}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className="object-contain"
                            />
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{product.title}</h4>
                        <p className="text-brand-yellow font-heading text-lg mb-3">
                          {formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode)}
                        </p>
                        <button
                          onClick={() => handleAddToCart(product, match.item.quantity)}
                          disabled={addingToCart === product.id || cartLoading}
                          className="w-full py-2 bg-brand-yellow text-gray-900 text-sm hover:bg-yellow-600 transition-colors tracking-[0.1em] disabled:opacity-50"
                        >
                          {addingToCart === product.id ? 'ADDING...' : `ADD ${match.item.quantity} TO CART`}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-600 mb-4">
                      We couldn&apos;t find an exact match for &quot;{match.item.product}&quot;
                    </p>
                    <Link href="/order">
                      <button className="px-6 py-2 border border-gray-300 text-gray-700 hover:border-brand-yellow transition-colors tracking-[0.1em] text-sm">
                        BROWSE ALL PRODUCTS
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.back()}
              className="px-8 py-3 border border-gray-300 text-gray-700 hover:border-brand-yellow transition-colors tracking-[0.08em]"
            >
              BACK TO CHAT
            </button>
            <Link href="/order">
              <button className="px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em]">
                BROWSE ALL PRODUCTS
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface ProductSearchProps {
  isScrolled?: boolean;
}

export default function ProductSearch({ isScrolled = true }: ProductSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Use the working API route that properly formats search queries
        const response = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}&first=10`);
        const data = await response.json();

        setResults(data.products.edges.map((edge: { node: Product }) => edge.node));
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 transition-colors rounded-full ${isScrolled ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
        aria-label="Search products"
      >
        <svg className={`w-5 h-5 transition-colors ${isScrolled ? 'text-gray-700' : 'text-white/90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white shadow-lg border border-gray-200 z-50"
          >
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for spirits, wine, beer..."
                className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-yellow"></div>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.handle}`}
                      onClick={() => {
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <div className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-4">
                        {product.images.edges.length > 0 ? (
                          <img
                            src={product.images.edges[0].node.url}
                            alt={product.title}
                            width={48}
                            height={48}
                            loading="lazy"
                            className="w-12 h-12 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.title}</h4>
                          <p className="text-sm text-gray-600">
                            {formatPrice(
                              product.priceRange.minVariantPrice.amount,
                              product.priceRange.minVariantPrice.currencyCode
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="p-8 text-center text-gray-500">
                  No products found for &quot;{searchTerm}&quot;
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Start typing to search products...
                </div>
              )}
            </div>

            {/* View All Results */}
            {results.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <Link
                  href={`/products?search=${encodeURIComponent(searchTerm)}`}
                  onClick={() => {
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="block text-center text-sm text-brand-yellow hover:text-yellow-600 tracking-[0.1em]"
                >
                  VIEW ALL RESULTS
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
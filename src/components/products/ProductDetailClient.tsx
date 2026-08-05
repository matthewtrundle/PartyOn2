'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navigation from "@/components/Navigation";
import { useCartContext } from '@/contexts/CartContext';
import { formatPrice, getFirstAvailableVariant } from '@/lib/utils';
import { Product } from '@/lib/types';
import { trackMetaEvent } from '@/components/MetaPixel';
import { trackProductView } from '@/lib/analytics/track';

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const { addToCart, loading: cartLoading } = useCartContext();
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  // Set default variant on mount and fire view events
  useEffect(() => {
    const defaultVariant = getFirstAvailableVariant(product);
    if (defaultVariant) {
      setSelectedVariantId(defaultVariant.id);
    }

    // Fire Vercel Analytics product view event
    trackProductView(
      product.id,
      product.title,
      parseFloat(product.priceRange.minVariantPrice.amount),
      product.productType || 'Beverage'
    );

    // Fire Meta Pixel ViewContent event
    trackMetaEvent('ViewContent', {
      content_name: product.title,
      content_category: product.productType || 'Beverage',
      content_ids: product.id,
      content_type: 'product',
      value: parseFloat(product.priceRange.minVariantPrice.amount),
      currency: product.priceRange.minVariantPrice.currencyCode,
    });
  }, [product]);

  const handleAddToCart = async () => {
    if (!selectedVariantId) return;

    try {
      await addToCart(selectedVariantId, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const selectedVariant = product.variants.edges.find(({ node }) => node.id === selectedVariantId)?.node;

  return (
    <div className="bg-white min-h-screen">
      <Navigation forceScrolled={true} />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-8 py-4 text-sm">
        <nav className="flex items-center space-x-2 text-gray-500">
          <Link href="/" className="hover:text-brand-yellow transition-colors">Home</Link>
          <span>/</span>
          <Link href="/order" className="hover:text-brand-yellow transition-colors">Products</Link>
          <span>/</span>
          <span className="text-gray-900">{product.title}</span>
        </nav>
      </div>

      {/* Product Section */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-[3/4] bg-gray-50 mb-4"
            >
              {product.images.edges.length > 0 ? (
                <img
                  src={product.images.edges[selectedImageIndex]?.node.url}
                  alt={product.title}
                  width={600}
                  height={800}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Thumbnail Gallery */}
            {product.images.edges.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.edges.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square border-2 transition-colors ${
                      selectedImageIndex === index ? 'border-brand-yellow' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image.node.url}
                      alt={`${product.title} ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Title */}
              <h1 className="font-heading text-4xl text-gray-900 mb-4 tracking-[0.05em]">
                {product.title}
              </h1>

              {/* Price */}
              <div className="mb-6">
                <p className="font-light text-3xl text-gray-900 tracking-[0.05em]">
                  {selectedVariant
                    ? formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)
                    : formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode)
                  }
                </p>
                {selectedVariant?.compareAtPrice && (
                  <p className="text-gray-500 line-through">
                    {formatPrice(selectedVariant.compareAtPrice.amount, selectedVariant.compareAtPrice.currencyCode)}
                  </p>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-8">
                  <h3 className="font-heading text-xl text-gray-900 mb-4 tracking-[0.1em]">Description</h3>
                  <div
                    className="text-gray-600 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
                  />
                </div>
              )}

              {/* Variant Selection */}
              {product.variants.edges.length > 1 && (
                <div className="mb-8">
                  <h3 className="font-heading text-xl text-gray-900 mb-4 tracking-[0.1em]">Options</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {product.variants.edges.map(({ node: variant }) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        disabled={!variant.availableForSale}
                        className={`p-4 border-2 transition-all duration-300 ${
                          selectedVariantId === variant.id
                            ? 'border-brand-yellow bg-yellow-50'
                            : 'border-gray-200 hover:border-brand-yellow'
                        } ${!variant.availableForSale ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <p className="font-medium text-gray-900">{variant.title}</p>
                        <p className="text-sm text-gray-600">
                          {formatPrice(variant.price.amount, variant.price.currencyCode)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2 tracking-[0.1em]">
                    QUANTITY
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 border border-gray-300 hover:border-brand-yellow transition-colors"
                    >
                      -
                    </button>
                    <span className="w-16 text-center text-lg">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-12 h-12 border border-gray-300 hover:border-brand-yellow transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.availableForSale || cartLoading}
                  className={`w-full py-4 transition-all duration-300 tracking-[0.08em] text-sm ${
                    selectedVariant?.availableForSale
                      ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {cartLoading ? 'ADDING...' :
                   !selectedVariant?.availableForSale ? 'OUT OF STOCK' :
                   'ADD TO CART'}
                </button>

                {addedToCart && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-600 text-center"
                  >
                    ✓ Added to cart successfully!
                  </motion.p>
                )}
              </div>

              {/* Service Info */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-brand-yellow mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">72-Hour Advance Notice</p>
                      <p className="text-sm text-gray-600">All orders require 72-hour advance booking</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-brand-yellow mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Age Verification Required</p>
                      <p className="text-sm text-gray-600">Valid ID required upon delivery</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-brand-yellow mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Austin Area Delivery</p>
                      <p className="text-sm text-gray-600">Serving greater Austin metropolitan area</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

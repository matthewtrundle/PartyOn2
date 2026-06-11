'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import AgeVerificationModal from '../AgeVerificationModal';
import { setAgeVerified } from "@/lib/utils/age-verification";

interface CompactProductCardProps {
  product: Product;
  index?: number;
  onProductClick?: (product: Product) => void;
}

export default function CompactProductCard({ product, index = 0, onProductClick }: CompactProductCardProps) {
  const { addToCart, loading: cartLoading } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const imageUrl = getProductImageUrl(product);
  const variant = getFirstAvailableVariant(product);
  const price = product.priceRange.minVariantPrice;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!variant?.id || !variant.availableForSale) return;
    
    if (!canPurchaseAlcohol()) {
      setShowAgeVerification(true);
      return;
    }
    
    setIsAdding(true);
    try {
      await addToCart(variant.id, quantity);
      setQuantity(1); // Reset quantity after adding
      // Cart updates automatically, no need to open it
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newQuantity = Math.max(1, Math.min(99, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    setAgeVerified();

    if (variant?.id && variant.availableForSale) {
      setIsAdding(true);
      try {
        await addToCart(variant.id, quantity);
        setQuantity(1); // Reset quantity after adding
        // Cart updates automatically, no need to open it
      } catch (error) {
        console.error('Error adding to cart:', error);
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white border border-gray-200 hover:border-brand-yellow transition-all duration-200 overflow-hidden h-full flex flex-col">
        {/* Compact Image - Square aspect ratio */}
        <div 
          onClick={() => onProductClick?.(product)}
          className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
                fetchPriority={index < 6 ? "high" : "low"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
                  />
                </svg>
              </div>
            )}
            
            {/* Out of Stock Overlay */}
            {!variant?.availableForSale && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white font-light tracking-[0.1em] text-sm">SOLD OUT</span>
              </div>
            )}

            {/* Quick Add Button on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={handleAddToCart}
                disabled={!variant?.availableForSale || isAdding || cartLoading}
                className="absolute bottom-3 left-3 right-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white text-sm font-semibold tracking-[0.08em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding || cartLoading ? 'ADDING...' : 'QUICK ADD'}
              </button>
            </div>
          </div>

        {/* Compact Product Details */}
        <div className="p-3 flex-1 flex flex-col">
          {/* Title - Smaller and truncated */}
          <h3
            onClick={() => onProductClick?.(product)}
            className="font-heading text-sm text-gray-900 mb-1 line-clamp-2 hover:text-brand-yellow transition-colors cursor-pointer">
            {product.title}
          </h3>

          {/* Price */}
          <p className="font-medium text-base text-gray-900 mb-2">
            {formatPrice(price.amount, price.currencyCode)}
          </p>

          {/* Quantity and Add to Cart */}
          <div className="mt-auto">
          {isHovered || quantity > 1 ? (
            <div className="flex items-center gap-2">
              {/* Quantity Selector */}
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  onClick={(e) => handleQuantityChange(e, -1)}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={(e) => handleQuantityChange(e, 1)}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* Add Button */}
              <button
                onClick={handleAddToCart}
                disabled={!variant?.availableForSale || isAdding || cartLoading}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold tracking-[0.08em] transition-colors ${
                  variant?.availableForSale && !isAdding && !cartLoading
                    ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-400 active:bg-yellow-500'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isAdding || cartLoading ? 'ADDING...' : 'ADD'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!variant?.availableForSale || isAdding || cartLoading}
              className={`w-full py-1.5 rounded-lg text-sm font-semibold tracking-[0.08em] transition-colors ${
                variant?.availableForSale && !isAdding && !cartLoading
                  ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-400 active:bg-yellow-500'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {variant?.availableForSale ? 'QUICK ADD' : 'SOLD OUT'}
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Age Verification Modal */}
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onClose={() => setShowAgeVerification(false)}
        onVerify={handleAgeVerified}
      />
    </motion.div>
  );
}
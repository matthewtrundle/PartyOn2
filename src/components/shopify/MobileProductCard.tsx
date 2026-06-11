'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import AgeVerificationModal from '../AgeVerificationModal';
import { setAgeVerified } from "@/lib/utils/age-verification";

interface MobileProductCardProps {
  product: Product;
  index?: number;
  onProductClick?: (product: Product) => void;
}

export default function MobileProductCard({ product, index = 0, onProductClick }: MobileProductCardProps) {
  const { addToCart, loading: cartLoading } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [quantity] = useState(1);
  const imageUrl = getProductImageUrl(product);
  const variant = getFirstAvailableVariant(product);
  const price = product.priceRange.minVariantPrice;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!variant?.id || !variant.availableForSale) return;
    
    // Check if user needs age verification for alcohol products
    if (!canPurchaseAlcohol()) {
      setShowAgeVerification(true);
      return;
    }
    
    setIsAdding(true);
    try {
      await addToCart(variant.id, quantity);
      // Quantity is already 1, no need to reset
      
      // Quick haptic-like feedback with animation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Don't auto-open cart on mobile to keep shopping flow smooth
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };


  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    setAgeVerified();
    
    // Now add to cart
    if (variant?.id && variant.availableForSale) {
      setIsAdding(true);
      try {
        await addToCart(variant.id, quantity);
        // Quantity is already 1, no need to reset
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
      className="touch-manipulation"
    >
      <div className="bg-white rounded-lg shadow-sm overflow-hidden active:shadow-md transition-shadow h-full flex flex-col">
        {/* Product Image - Optimized for mobile */}
        <div 
          onClick={() => onProductClick?.(product)}
          className="relative aspect-square overflow-hidden bg-gray-50">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            )}
            
            {/* Out of Stock Overlay */}
            {!variant?.availableForSale && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white font-medium text-xs">OUT OF STOCK</span>
              </div>
            )}
        </div>

        {/* Product Details - Compact for mobile */}
        <div className="p-3 flex-1 flex flex-col">
          {/* Title */}
          <h3
            onClick={() => onProductClick?.(product)}
            className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
            {product.title}
          </h3>

          {/* Price and Quick Add */}
          <div className="flex items-center justify-between mt-auto">
            <p className="font-semibold text-lg text-gray-900">
              {formatPrice(price.amount, price.currencyCode)}
            </p>

            {/* Quick Add Button */}
            <button
              onClick={handleAddToCart}
              disabled={!variant?.availableForSale || isAdding || cartLoading}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95 ${
                variant?.availableForSale && !isAdding && !cartLoading
                  ? 'bg-brand-yellow text-gray-900 active:bg-yellow-600 active:text-gray-900'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {isAdding || cartLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '+ ADD'
              )}
            </button>
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
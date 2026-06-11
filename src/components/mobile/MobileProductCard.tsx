'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  const imageUrl = getProductImageUrl(product);
  const variant = getFirstAvailableVariant(product);
  const price = product.priceRange.minVariantPrice;

  const handleAddToCart = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!variant?.id || !variant.availableForSale) return;
    
    if (!canPurchaseAlcohol()) {
      setShowAgeVerification(true);
      return;
    }
    
    setIsAdding(true);
    try {
      await addToCart(variant.id, 1);
      // Haptic feedback for mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      // Show success feedback
      setShowQuickAdd(false);
      // Cart updates automatically, no need to open it
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    setAgeVerified();
    await handleAddToCart();
  };

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-lg overflow-hidden touch-manipulation h-full flex flex-col"
      >
        <div
          onClick={() => onProductClick?.(product)}
          className="relative aspect-square bg-gray-50 cursor-pointer">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.title}
                fill
                className="object-cover"
                loading={index < 4 ? "eager" : "lazy"}
                quality={50}
                sizes="(max-width: 768px) 50vw, 25vw"
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
            
            {!variant?.availableForSale && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white font-light tracking-[0.08em] text-sm">OUT OF STOCK</span>
              </div>
            )}

            {/* Quick Add Button - Floating */}
            {variant?.availableForSale && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowQuickAdd(!showQuickAdd);
                }}
                className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg"
                aria-label="Quick add to cart"
              >
                <svg className="w-5 h-5 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

        <div className="p-4 flex-1 flex flex-col">
          {/* Title */}
          <h3 
            onClick={() => onProductClick?.(product)}
            className="font-heading text-base text-gray-900 mb-2 line-clamp-2 cursor-pointer">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-center justify-between mt-auto">
            <p className="font-medium text-lg text-gray-900">
              {formatPrice(price.amount, price.currencyCode)}
            </p>
          </div>
        </div>

        {/* Quick Add Panel */}
        {showQuickAdd && (
          <div
            className="border-t border-gray-200 overflow-hidden transition-all duration-200 ease-in-out"
            style={{
              maxHeight: showQuickAdd ? '200px' : '0',
              opacity: showQuickAdd ? 1 : 0
            }}
          >
            <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Quick Add</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowQuickAdd(false);
                    }}
                    className="text-gray-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || cartLoading}
                  className={`w-full py-3 rounded-lg text-sm font-semibold tracking-[0.08em] transition-colors ${
                    isAdding || cartLoading
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-brand-yellow text-gray-900 hover:bg-yellow-400 active:bg-yellow-500'
                  }`}
                >
                  {isAdding || cartLoading ? 'ADDING...' : 'ADD TO CART'}
                </button>
              </div>
            </div>
        )}
      </div>

      {/* Age Verification Modal */}
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onClose={() => setShowAgeVerification(false)}
        onVerify={handleAgeVerified}
      />
    </>
  );
}
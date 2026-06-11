'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import AgeVerificationModal from '../AgeVerificationModal';
import { setAgeVerified } from "@/lib/utils/age-verification";

interface ProductCardProps {
  product: Product;
  index?: number;
  onProductClick?: (product: Product) => void;
}

export default function ProductCard({ product, index = 0, onProductClick }: ProductCardProps) {
  const { addToCart, loading: cartLoading } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [quantity, setQuantity] = useState(1);
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
      setQuantity(1); // Reset quantity after adding
      // Cart updates automatically, no need to open it
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(99, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    setAgeVerified();

    // Now add to cart
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
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div className="bg-white border border-gray-200 hover:border-brand-yellow transition-all duration-300 overflow-hidden h-full flex flex-col">
        {/* Product Image - Clickable */}
        <div 
          onClick={() => onProductClick?.(product)}
          className="relative aspect-[3/4] overflow-hidden bg-gray-50 cursor-pointer">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            )}
            
            {/* Out of Stock Overlay */}
            {!variant?.availableForSale && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white font-light tracking-[0.1em] text-sm">OUT OF STOCK</span>
              </div>
            )}

            {/* Quick View on Hover */}
            <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/20 transition-colors duration-300 flex items-center justify-center">
              <span className="text-white font-light tracking-[0.08em] text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                QUICK VIEW
              </span>
            </div>
          </div>

        {/* Product Details */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Title - Clickable */}
          <h3 
            onClick={() => onProductClick?.(product)}
            className="font-heading text-lg text-gray-900 mb-3 tracking-[0.05em] hover:text-brand-yellow transition-colors cursor-pointer">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline justify-between mb-4">
            <p className="font-light text-xl text-gray-900 tracking-[0.05em]">
              {formatPrice(price.amount, price.currencyCode)}
            </p>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600 tracking-[0.1em]">QUANTITY</span>
            <div className="flex items-center border border-gray-300">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleQuantityChange(-1);
                }}
                className="px-3 py-1 text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Decrease quantity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
              </button>
              <span className="px-4 py-1 text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleQuantityChange(1);
                }}
                className="px-3 py-1 text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Increase quantity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mt-auto">
            {/* Add to Cart Button - Always Visible */}
            <button
              onClick={handleAddToCart}
              disabled={!variant?.availableForSale || isAdding || cartLoading}
              className={`w-full py-2 rounded-lg transition-colors duration-300 text-sm font-semibold tracking-[0.08em] ${
                variant?.availableForSale && !isAdding && !cartLoading
                  ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-400 active:bg-yellow-500'
                  : 'bg-gray-300 text-gray-700 cursor-not-allowed'
              }`}
            >
              {isAdding || cartLoading 
                ? 'ADDING...' 
                : !variant?.availableForSale 
                  ? 'OUT OF STOCK' 
                  : quantity > 1 
                    ? `ADD ${quantity} TO CART`
                    : 'ADD TO CART'}
            </button>

            {/* View Details Button */}
            <button
              onClick={() => onProductClick?.(product)}
              className="w-full py-2 rounded-lg border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-colors duration-300 text-sm font-semibold tracking-[0.08em]">
              VIEW DETAILS
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
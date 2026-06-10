'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import AgeVerificationModal from './AgeVerificationModal';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  ctaOverride?: { label: string; href: string };
}

export default function ProductModal({ product, isOpen, onClose, ctaOverride }: ProductModalProps) {
  const { addToCart, loading: cartLoading } = useCartContext();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);

  // Full product details state (fetched when modal opens)
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Touch swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Fetch full product details when modal opens
  useEffect(() => {
    if (isOpen && product?.handle && !fullProduct) {
      const fetchFullProduct = async () => {
        setLoadingDetails(true);
        try {
          const response = await fetch(`/api/products/${product.handle}`);
          if (response.ok) {
            const data = await response.json();
            setFullProduct(data);
          }
        } catch (error) {
          console.error('Error fetching full product details:', error);
        } finally {
          setLoadingDetails(false);
        }
      };
      fetchFullProduct();
    }
  }, [isOpen, product?.handle, fullProduct]);

  // Use full product data if available, otherwise fall back to basic product
  const displayProduct = fullProduct || product;
  const variant = displayProduct ? getFirstAvailableVariant(displayProduct) : null;
  const price = displayProduct?.priceRange.minVariantPrice;
  const images = displayProduct?.images?.edges?.map(edge => edge.node) || [];
  const mainImage = images[selectedImageIndex] || { url: (displayProduct ? getProductImageUrl(displayProduct) : '') || '', altText: displayProduct?.title || '' };

  // Keyboard navigation for carousel
  React.useEffect(() => {
    if (!isOpen || images.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  // Touch swipe handlers for image carousel
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      // Swipe left = next image
      setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    } else if (isRightSwipe && images.length > 1) {
      // Swipe right = previous image
      setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  // Reset state when product changes
  React.useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setFullProduct(null);
  }, [product?.id]);

  if (!product) return null;

  const handleAddToCart = async () => {
    if (!variant?.id || !variant.availableForSale) return;

    // Check if user needs age verification for alcohol products
    if (!canPurchaseAlcohol()) {
      setShowAgeVerification(true);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(variant.id, quantity);
      // Cart updates automatically, no need to open it
      setTimeout(() => {
        onClose(); // Close modal after adding to cart
      }, 300);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    localStorage.setItem('age_verified', 'true');

    // Now add to cart
    if (variant?.id && variant.availableForSale) {
      setIsAdding(true);
      try {
        await addToCart(variant.id, quantity);
        // Cart updates automatically, no need to open it
        setTimeout(() => {
          onClose(); // Close modal after adding to cart
        }, 300);
      } catch (error) {
        console.error('Error adding to cart:', error);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(99, quantity + delta));
    setQuantity(newQuantity);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 bg-white z-[9999] flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Image Section */}
              <div className="w-full md:w-1/2 lg:w-3/5 bg-gray-50 p-8 flex flex-col overflow-hidden">
                {/* Main Image with Carousel Controls */}
                <div
                  className="flex-1 flex items-center justify-center mb-4 overflow-hidden relative touch-pan-y"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {mainImage.url ? (
                    <>
                      <motion.img
                        key={selectedImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        src={mainImage.url}
                        alt={mainImage.altText || displayProduct?.title || product.title}
                        className="max-w-full max-h-full object-contain"
                      />

                      {/* Carousel Navigation Arrows */}
                      {images.length > 1 && (
                        <>
                          {/* Previous Button */}
                          <button
                            onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                            aria-label="Previous image"
                          >
                            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {/* Next Button */}
                          <button
                            onClick={() => setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                            aria-label="Next image"
                          >
                            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>

                          {/* Image Counter with Swipe Hint on Mobile */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                            <div className="px-3 py-1 bg-black/60 text-white text-xs rounded-full">
                              {selectedImageIndex + 1} / {images.length}
                            </div>
                            {/* Swipe hint - only show on first image view on mobile */}
                            <div className="md:hidden text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                              <span>Swipe to browse</span>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Image Thumbnails */}
                {images.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 border-2 transition-all duration-200 ${
                          selectedImageIndex === index
                            ? 'border-brand-yellow ring-2 ring-brand-yellow ring-offset-2'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.altText || `${displayProduct?.title || product.title} ${index + 1}`}
                          width={80}
                          height={80}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : loadingDetails ? (
                  <div className="flex gap-2 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-20 h-20 bg-gray-200 animate-pulse" />
                    ))}
                  </div>
                ) : null}
              </div>
              
              {/* Details Section */}
              <div className="w-full md:w-1/2 lg:w-2/5 p-8 overflow-y-auto">
                {/* Title - Clickable to product page */}
                <Link href={`/products/${displayProduct?.handle || product.handle}`}>
                  <h2 className="font-heading text-3xl text-gray-900 mb-4 tracking-[0.05em] hover:text-brand-yellow transition-colors cursor-pointer">
                    {displayProduct?.title || product.title}
                  </h2>
                </Link>

                {/* Price */}
                {price && (
                  <p className="font-light text-2xl text-gray-900 mb-6 tracking-[0.05em]">
                    {formatPrice(price.amount, price.currencyCode)}
                  </p>
                )}

                {/* Description */}
                {loadingDetails ? (
                  <div className="mb-6 space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                ) : displayProduct?.descriptionHtml ? (
                  <div
                    className="prose prose-sm text-gray-600 mb-6 leading-relaxed max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0"
                    dangerouslySetInnerHTML={{ __html: displayProduct.descriptionHtml }}
                  />
                ) : displayProduct?.description ? (
                  <div className="prose prose-sm text-gray-600 mb-6 leading-relaxed">
                    <p>{displayProduct.description}</p>
                  </div>
                ) : null}

                {/* Quantity Selector */}
                {!ctaOverride && <div className="mb-6">
                  <label className="block text-xs text-gray-600 tracking-[0.1em] mb-2">QUANTITY</label>
                  <div className="flex items-center border border-gray-300 w-fit">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="px-6 py-2 text-sm font-medium text-gray-900 min-w-[4rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>}

                {/* Add to Cart / CTA Override Button */}
                {ctaOverride ? (
                  <Link
                    href={ctaOverride.href}
                    className="block w-full py-3 text-center transition-colors duration-300 text-sm tracking-[0.08em] bg-brand-yellow text-gray-900 hover:bg-yellow-600"
                  >
                    {ctaOverride.label}
                  </Link>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={!variant?.availableForSale || isAdding || cartLoading}
                    className={`w-full py-3 transition-colors duration-300 text-sm tracking-[0.08em] ${
                      variant?.availableForSale && !isAdding && !cartLoading
                        ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Age Verification Modal */}
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onClose={() => setShowAgeVerification(false)}
        onVerify={handleAgeVerified}
      />
    </>
  );
}
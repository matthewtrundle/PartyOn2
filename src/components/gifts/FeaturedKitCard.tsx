'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import AgeVerificationModal from '../AgeVerificationModal';

// What's included for each kit type
const kitIngredients: Record<string, string[]> = {
  'lady bird': [
    'Lunazul Blanco Tequila',
    'Fresh Victor Mexican Lime & Agave (x3)',
    'H-E-B Club Soda',
    'Drink Dispenser Included',
  ],
  'austin rita': [
    'Dulce Vida Blanco Tequila',
    'Stirrings Triple Sec',
    'Organic Lime Juice',
    'Topo Chico Sparkling Water',
    'Sprite',
  ],
  'espresso martini': [
    'Deep Eddy Vodka',
    'Caffe Del Fuego Coffee Liqueur',
    'High Brew Double Espresso',
    'Simple Syrup',
  ],
  'hill country old': [
    'Still Austin Straight Bourbon Whiskey',
    'Liber and Co. Old-Fashioned Cocktail Syrup',
    'Japanese Jigger',
  ],
  'old-fashioned': [
    'Premium Bourbon',
    'Angostura Bitters',
    'Orange Bitters',
    'Demerara Sugar',
    'Orange Peel',
  ],
  'apple cider aperol': [
    'Aperol',
    'Austin Eastciders Original Dry Cider',
    'Topo Chico',
    'Cinnamon Sugar',
    'Cinnamon Sticks',
  ],
  'soco carajillo': [
    'Licor 43 Liqueur',
    'Tito\'s Handmade Vodka',
    'High Brew Cold Brew Coffee',
    'Califia Farms Barista Oat Milk',
    'Drink Dispenser Included',
  ],
  'barton springs': [
    'Island Getaway White Rum',
    'Fresh Victor Three Citrus & Mint Leaf (x2)',
    'H-E-B Club Soda',
    'Drink Dispenser Included',
  ],
  'aperol spritz': [
    'Aperol',
    'Prosecco',
    'Sparkling Water',
  ],
};

interface FeaturedKitCardProps {
  product: Product;
  imagePosition?: 'left' | 'right';
  description?: string;
  showIngredients?: boolean;
  onClickProduct?: (product: Product) => void;
}

export default function FeaturedKitCard({
  product,
  imagePosition = 'left',
  description,
  showIngredients = true,
  onClickProduct
}: FeaturedKitCardProps) {
  const { addToCart, openCart, loading: cartLoading } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const imageUrl = getProductImageUrl(product);
  const variant = getFirstAvailableVariant(product);
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = variant?.compareAtPrice;

  // Get ingredients for this kit
  const getIngredients = (): string[] => {
    const titleLower = product.title.toLowerCase();
    for (const [key, ingredients] of Object.entries(kitIngredients)) {
      if (titleLower.includes(key)) return ingredients;
    }
    return [];
  };

  const ingredients = getIngredients();

  const handleAddToCart = async () => {
    if (!variant?.id || !variant.availableForSale) return;

    if (!canPurchaseAlcohol()) {
      setShowAgeVerification(true);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(variant.id, 1);
      openCart(); // slide the cart open so the add is visible + checkout-ready
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    localStorage.setItem('age_verified', 'true');

    if (variant?.id && variant.availableForSale) {
      setIsAdding(true);
      try {
        await addToCart(variant.id, 1);
        openCart(); // slide the cart open so the add is visible + checkout-ready
      } catch (error) {
        console.error('Error adding to cart:', error);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const productHandle = product.handle;
  const defaultDescription = product.description?.slice(0, 200) ||
    'Premium cocktail kit with everything you need to make delicious drinks at home.';

  return (
    <div className={`grid md:grid-cols-2 gap-8 lg:gap-12 items-center ${
      imagePosition === 'right' ? 'md:[direction:rtl]' : ''
    }`}>
      {/* Product Image */}
      {onClickProduct ? (
      <button
        onClick={() => onClickProduct(product)}
        className="relative aspect-square overflow-hidden rounded-lg shadow-xl group md:[direction:ltr] w-full cursor-pointer"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg className="w-24 h-24 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        {product.title.toLowerCase().includes('lady bird') && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-gray-900 px-4 py-2 text-sm font-bold tracking-wider shadow-lg">
            BESTSELLER
          </div>
        )}
      </button>
      ) : (
      <Link
        href={`/products/${productHandle}`}
        className="relative aspect-square overflow-hidden rounded-lg shadow-xl group md:[direction:ltr]"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg className="w-24 h-24 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </Link>
      )}

      {/* Product Details */}
      <div className="md:[direction:ltr] space-y-6">
        {onClickProduct ? (
          <button onClick={() => onClickProduct(product)} className="text-left">
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-gray-900 hover:text-brand-yellow transition-colors">
              {product.title}
            </h3>
          </button>
        ) : (
          <Link href={`/products/${productHandle}`}>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-gray-900 hover:text-brand-yellow transition-colors">
              {product.title}
            </h3>
          </Link>
        )}

        <p className="text-lg text-gray-700 leading-relaxed">
          {description || defaultDescription}
        </p>

        {/* What's Included */}
        {showIngredients && ingredients.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 tracking-wide mb-3 uppercase">
              What&apos;s Included
            </h4>
            <ul className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Price with strikethrough */}
        <div className="flex items-baseline gap-3">
          {compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount) && (
            <span className="text-xl text-gray-500 line-through">
              {formatPrice(compareAtPrice.amount, compareAtPrice.currencyCode)}
            </span>
          )}
          <span className="text-3xl font-light text-gray-900 tracking-wide">
            {formatPrice(price.amount, price.currencyCode)}
          </span>
          {compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount) && (
            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              SAVE {formatPrice((parseFloat(compareAtPrice.amount) - parseFloat(price.amount)).toString(), price.currencyCode)}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleAddToCart}
            disabled={!variant?.availableForSale || isAdding || cartLoading}
            className={`px-10 py-5 text-lg tracking-[0.1em] font-bold transition-colors duration-300 ${
              variant?.availableForSale && !isAdding && !cartLoading
                ? 'bg-yellow-500 text-gray-900 hover:bg-brand-yellow'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAdding || cartLoading
              ? 'ADDING...'
              : !variant?.availableForSale
                ? 'OUT OF STOCK'
                : 'ADD TO CART'}
          </button>

          {onClickProduct ? (
            <button
              onClick={() => onClickProduct(product)}
              className="px-10 py-5 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 text-lg tracking-[0.1em] font-bold transition-colors duration-300 text-center"
            >
              VIEW DETAILS
            </button>
          ) : (
            <Link
              href={`/products/${productHandle}`}
              className="px-10 py-5 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 text-lg tracking-[0.1em] font-bold transition-colors duration-300 text-center"
            >
              VIEW DETAILS
            </Link>
          )}
        </div>
      </div>

      {/* Age Verification Modal */}
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onClose={() => setShowAgeVerification(false)}
        onVerify={handleAgeVerified}
      />
    </div>
  );
}

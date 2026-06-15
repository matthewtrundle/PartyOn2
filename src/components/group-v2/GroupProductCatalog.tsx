'use client';

import { useState, useEffect, ReactElement } from 'react';
import { addDraftItemV2, updateDraftItemV2, removeDraftItemV2 } from '@/lib/group-orders-v2/api-client';
import { getCollectionsForOrderType, ORDER_TYPES } from '@/lib/group-orders-v2/order-types';
import type { DraftCartItemView } from '@/lib/group-orders-v2/types';
import CollectionTabs from './CollectionTabs';
import QuantityStepper from '../quick-order/QuantityStepper';

interface CatalogProduct {
  id: string;
  title: string;
  handle: string;
  basePrice: number;
  productType: string | null;
  // API returns image (singular) not images (array)
  image?: { url: string; altText?: string | null };
  images?: { url: string }[];
  variants: {
    id: string;
    title: string;
    price: number;
    availableForSale: boolean;
  }[];
}

interface Props {
  shareCode: string;
  tabId: string;
  participantId: string;
  orderType?: string | null;
  draftItems?: DraftCartItemView[];
  onItemAdded: () => void;
}

export default function GroupProductCatalog({
  shareCode,
  tabId,
  participantId,
  orderType,
  draftItems = [],
  onItemAdded,
}: Props): ReactElement {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Build a map of productId → draft item for the current participant
  const myDraftMap = new Map<string, DraftCartItemView>();
  for (const item of draftItems) {
    if (item.addedBy?.id === participantId) {
      myDraftMap.set(item.productId, item);
    }
  }

  const collections = getCollectionsForOrderType(orderType);
  const orderTypeLabel = ORDER_TYPES.find((t) => t.value === orderType)?.label;
  const [activeCollection, setActiveCollection] = useState(collections[0]?.handle ?? '');

  // Reset active collection when order type changes
  useEffect(() => {
    setActiveCollection(collections[0]?.handle ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        let url = '/api/v1/products/catalog?limit=50';
        if (activeCollection) {
          url += `&collection=${encodeURIComponent(activeCollection)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          const productsArray = json.data?.products ?? json.data;
          setProducts(Array.isArray(productsArray) ? productsArray : []);
        }
      } catch {
        console.error('Failed to fetch products');
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [activeCollection]);

  const filtered = search
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          (p.productType || '').toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const handleAdd = async (product: CatalogProduct) => {
    const variant = (product.variants || [])[0];
    if (!variant) return;

    setAddingId(product.id);
    try {
      await addDraftItemV2(shareCode, tabId, {
        participantId,
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title !== 'Default' ? variant.title : undefined,
        price: Number(variant.price),
        imageUrl: product.image?.url || product.images?.[0]?.url,
        quantity: 1,
      });
      onItemAdded();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-heading text-3xl md:text-4xl text-gray-900 uppercase tracking-wide">
          Browse Products
        </h3>
      </div>

      {collections.length > 1 ? (
        <CollectionTabs
          collections={collections}
          activeHandle={activeCollection}
          onSelect={setActiveCollection}
        />
      ) : orderTypeLabel && collections.length === 1 ? (
        <div className="mb-6 text-lg text-gray-600">
          Showing products for: <span className="font-semibold text-gray-900">{orderTypeLabel}</span>
        </div>
      ) : null}

      <div className="mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full border-2 border-gray-300 rounded-xl px-5 py-4 text-lg text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-xl aspect-square" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-lg text-gray-500 text-center py-8">
          No products found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((product) => {
            const variant = product.variants?.[0];
            const price = variant ? Number(variant.price) : Number(product.basePrice);
            const imgUrl = product.image?.url || product.images?.[0]?.url;
            const isAdding = addingId === product.id;
            const isUpdating = updatingId === product.id;
            const draftItem = myDraftMap.get(product.id);
            const draftQty = draftItem?.quantity ?? 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 w-full group">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 space-y-1 text-center">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 line-clamp-2 leading-tight">
                    {product.title}
                  </h3>
                  <p className="font-bold text-lg sm:text-xl text-gray-900">
                    ${price.toFixed(2)}
                  </p>

                  {draftQty > 0 && draftItem ? (
                    <div className="flex justify-center mt-2">
                      <QuantityStepper
                        quantity={draftQty}
                        disabled={isUpdating}
                        onIncrement={async () => {
                          setUpdatingId(product.id);
                          try {
                            await updateDraftItemV2(shareCode, tabId, draftItem.id, participantId, draftQty + 1);
                            onItemAdded();
                          } catch (err) {
                            console.error('Failed to update item:', err);
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        onDecrement={async () => {
                          setUpdatingId(product.id);
                          try {
                            if (draftQty <= 1) {
                              await removeDraftItemV2(shareCode, tabId, draftItem.id, participantId);
                            } else {
                              await updateDraftItemV2(shareCode, tabId, draftItem.id, participantId, draftQty - 1);
                            }
                            onItemAdded();
                          } catch (err) {
                            console.error('Failed to update item:', err);
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        size="sm"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAdd(product)}
                      disabled={isAdding}
                      className="mx-auto mt-2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-500 hover:bg-brand-yellow text-gray-900 flex items-center justify-center shadow-md transition-all disabled:opacity-50"
                      aria-label={`Add ${product.title} to group order`}
                    >
                      {isAdding ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

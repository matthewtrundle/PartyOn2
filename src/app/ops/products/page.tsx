'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import Link from 'next/link';
import NavyBand from '@/components/backend/shell/NavyBand';
import StockPill, { StockState } from '@/components/backend/kit/StockPill';
import HqBadge from '@/components/backend/kit/Badge';
import StockStepperSheet, { StepperTarget } from '@/components/ops/catalog/StockStepperSheet';
import { PRODUCT_CATEGORIES, getCategoryByProductType } from '@/lib/product-categories';

interface ProductVariant {
  id: string;
  sku: string | null;
  title: string;
  price: number;
  inventory: number;
  committed: number;
  trackInventory: boolean;
  available: boolean;
}

interface Product {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  price: number;
  image: { url: string; altText: string | null } | null;
  variants: ProductVariant[];
  totalInventory: number;
  variantCount: number;
}

interface ProductsData {
  products: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface VariantItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  committedQuantity: number;
  available: number;
  trackInventory: boolean;
  price: number | null;
}

type CatalogView = 'all' | 'low' | 'out';

const STATUS_WORD: Record<Product['status'], { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'text-green-700' },
  DRAFT: { label: 'Draft', cls: 'text-gray-500' },
  ARCHIVED: { label: 'Archived', cls: 'text-gray-400' },
};

/** Aggregate a product's tracked variants into one stock-pill state. */
function productStock(p: Product): { state: StockState; count: number } | 'evergreen' {
  const tracked = p.variants.filter((v) => v.trackInventory);
  if (tracked.length === 0) return 'evergreen';
  const avail = tracked.reduce((sum, v) => sum + (v.inventory - v.committed), 0);
  if (avail < 0) return { state: 'oversold', count: avail };
  if (avail === 0) return { state: 'out', count: 0 };
  if (avail <= 10) return { state: 'low', count: avail };
  return { state: 'in', count: avail };
}

function variantStock(item: VariantItem): { state: StockState; count: number } {
  if (item.available < 0) return { state: 'oversold', count: item.available };
  if (item.available === 0) return { state: 'out', count: 0 };
  if (item.available <= 10) return { state: 'low', count: item.available };
  return { state: 'in', count: item.available };
}

function Thumb({ url, alt }: { url?: string | null; alt?: string }): ReactElement {
  return url ? (
    <img src={url} alt={alt || ''} className="w-11 h-11 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
  ) : (
    <div className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

/**
 * Unified Catalog: the product list with stock inline. Filter chips (ALL /
 * LOW / OUT / COLLECTIONS) live in the navy band; every row's stock pill
 * opens the keyboard-free stepper sheet, which writes through the
 * InventoryMovement ledger. The advanced inventory page (AI notes,
 * cost/committed edits) stays reachable for the heavy tools.
 */
export default function CatalogPage(): ReactElement {
  const [view, setView] = useState<CatalogView>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [productsData, setProductsData] = useState<ProductsData | null>(null);
  const [variantItems, setVariantItems] = useState<VariantItem[]>([]);
  const [variantMeta, setVariantMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 });
  const [counts, setCounts] = useState<{ low: number; out: number }>({ low: 0, out: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [stepperTarget, setStepperTarget] = useState<StepperTarget | null>(null);
  const [stepperKey, setStepperKey] = useState('');

  const activeCategory = PRODUCT_CATEGORIES.find((c) => c.id === category);

  const fetchCounts = useCallback(async () => {
    try {
      const [lowRes, outRes] = await Promise.all([
        fetch('/api/v1/inventory?filter=low_stock&limit=1'),
        fetch('/api/v1/inventory?filter=out_of_stock&limit=1'),
      ]);
      const [low, out] = await Promise.all([lowRes.json(), outRes.json()]);
      setCounts({
        low: low.success ? low.meta.total : 0,
        out: out.success ? out.meta.total : 0,
      });
    } catch {
      // counts are decorative — leave last known values
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'all') {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        if (activeCategory) params.set('productTypes', activeCategory.allProductTypes.join(','));
        params.set('page', String(page));
        params.set('limit', '30');
        params.set('sortBy', 'title');
        params.set('sortOrder', 'asc');
        const res = await fetch(`/api/v1/admin/products?${params}`);
        const result = await res.json();
        if (result.success) setProductsData(result.data);
      } else {
        const params = new URLSearchParams();
        params.set('filter', view === 'low' ? 'low_stock' : 'out_of_stock');
        if (search) params.set('search', search);
        params.set('page', String(page));
        params.set('limit', '50');
        const res = await fetch(`/api/v1/inventory?${params}`);
        const result = await res.json();
        if (result.success) {
          setVariantItems(result.data);
          setVariantMeta({ total: result.meta.total, totalPages: result.meta.totalPages });
        }
      }
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
    } finally {
      setLoading(false);
    }
  }, [view, search, statusFilter, activeCategory, page]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchList();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchList, refreshKey]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts, refreshKey]);

  function switchView(next: CatalogView): void {
    setView(next);
    setPage(1);
  }

  function openProductStepper(p: Product): void {
    setStepperTarget({
      productName: p.title,
      variants: p.variants.map((v) => ({
        variantId: v.id,
        productId: p.id,
        label: v.title && v.title !== 'Default Title' ? v.title : null,
        available: v.inventory - v.committed,
        committed: v.committed,
        trackInventory: v.trackInventory,
      })),
    });
    setStepperKey(`p-${p.id}-${refreshKey}`);
  }

  function openVariantStepper(item: VariantItem): void {
    setStepperTarget({
      productName: item.productName,
      variants: [
        {
          variantId: item.variantId,
          productId: item.productId,
          label: item.variantName && item.variantName !== 'Default Title' ? item.variantName : null,
          available: item.available,
          committed: item.committedQuantity,
          trackInventory: item.trackInventory,
        },
      ],
    });
    setStepperKey(`v-${item.variantId}-${refreshKey}`);
  }

  const needsRestock = counts.low + counts.out;
  const allTotal = productsData?.pagination.total ?? 0;

  const chipBase =
    'min-h-[44px] px-3.5 rounded-lg font-heading font-bold text-[13px] tracking-[0.05em] uppercase whitespace-nowrap transition-colors touch-manipulation';

  return (
    <div className="bg-gray-50 min-h-screen">
      <NavyBand>
        {/* Search + new product */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA3B5]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products…"
              className="w-full min-h-[44px] pl-9 pr-3 rounded-lg bg-white/10 text-white placeholder-[#8FA3B5] text-base focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white/15"
            />
          </div>
          <Link
            href="/ops/products/create"
            aria-label="New product"
            className="w-11 min-h-[44px] rounded-lg bg-brand-yellow text-gray-900 flex items-center justify-center hover:bg-yellow-400 transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => switchView('all')}
            className={`${chipBase} ${view === 'all' ? 'bg-white text-gray-900' : 'text-[#B7C4D0] hover:bg-white/10'}`}
          >
            All{allTotal > 0 && view === 'all' ? ` · ${allTotal}` : ''}
          </button>
          <button
            type="button"
            onClick={() => switchView('low')}
            className={`${chipBase} ${view === 'low' ? 'bg-white text-amber-800' : 'text-[#FDE68A] hover:bg-white/10'}`}
          >
            Low · {counts.low}
          </button>
          <button
            type="button"
            onClick={() => switchView('out')}
            className={`${chipBase} ${view === 'out' ? 'bg-white text-red-800' : 'text-[#FCA5A5] hover:bg-white/10'}`}
          >
            Out · {counts.out}
          </button>
          <Link href="/ops/collections" className={`${chipBase} text-[#B7C4D0] hover:bg-white/10 inline-flex items-center`}>
            Collections
          </Link>
        </div>
      </NavyBand>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Needs-restock pinned band */}
        {needsRestock > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => switchView(counts.out > 0 ? 'out' : 'low')}
              className="flex items-center gap-2 min-h-[36px] text-sm font-bold text-amber-900 touch-manipulation"
            >
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {needsRestock} need restock ({counts.out} out · {counts.low} low)
            </button>
            <span className="flex-1" />
            <Link href="/ops/inventory/receiving/new" className="min-h-[36px] inline-flex items-center text-sm font-semibold text-brand-blue hover:underline">
              Receive shipment
            </Link>
            <Link href="/ops/inventory" className="min-h-[36px] inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-800">
              Advanced
            </Link>
          </div>
        )}

        {/* Toolbar (ALL view): category + status */}
        {view === 'all' && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] px-3 border border-gray-200 rounded-lg bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
            >
              <option value="">All categories</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] px-3 border border-gray-200 rounded-lg bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            {productsData && (
              <span className="ml-auto text-sm text-gray-500">
                {productsData.pagination.total} product{productsData.pagination.total === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-4 py-3">
                  <div className="w-11 h-11 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-16 h-11 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : view === 'all' ? (
            productsData && productsData.products.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {productsData.products.map((p) => {
                  const stock = productStock(p);
                  const cat = p.productType ? getCategoryByProductType(p.productType) : null;
                  const status = STATUS_WORD[p.status];
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 min-h-[60px]">
                      <Link href={`/ops/products/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                        <Thumb url={p.image?.url} alt={p.title} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-blue transition-colors truncate">
                            {p.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {cat ? `${cat.label} · ` : ''}${p.price.toFixed(2)} ·{' '}
                            <span className={`font-medium ${status.cls}`}>{status.label}</span>
                            {p.variantCount > 1 ? ` · ${p.variantCount} variants` : ''}
                          </p>
                        </div>
                      </Link>
                      {stock === 'evergreen' ? (
                        <HqBadge variant="blue" className="flex-shrink-0">Evergreen</HqBadge>
                      ) : (
                        <StockPill count={stock.count} state={stock.state} onClick={() => openProductStepper(p)} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                message="No products found"
                onClear={() => {
                  setSearch('');
                  setCategory('');
                  setStatusFilter('');
                  setPage(1);
                }}
              />
            )
          ) : variantItems.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {variantItems.map((item) => {
                const stock = variantStock(item);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 min-h-[60px]">
                    <Link href={`/ops/products/${item.productId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                      <Thumb />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-blue transition-colors truncate">
                          {item.productName}
                          {item.variantName && item.variantName !== 'Default Title' ? ` — ${item.variantName}` : ''}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {item.price != null ? `$${item.price.toFixed(2)} · ` : ''}
                          {item.committedQuantity > 0 ? (
                            <span className={item.available < 0 ? 'text-red-600 font-semibold' : ''}>
                              {item.committedQuantity} committed
                            </span>
                          ) : (
                            'no orders waiting'
                          )}
                        </p>
                      </div>
                    </Link>
                    <StockPill count={stock.count} state={stock.state} onClick={() => openVariantStepper(item)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message={view === 'low' ? 'Nothing low on stock' : 'Nothing out of stock'} />
          )}

          {/* Pagination */}
          {!loading && view === 'all' && productsData && productsData.pagination.pages > 1 && (
            <Pager page={page} pages={productsData.pagination.pages} onPage={setPage} />
          )}
          {!loading && view !== 'all' && variantMeta.totalPages > 1 && (
            <Pager page={page} pages={variantMeta.totalPages} onPage={setPage} />
          )}
        </div>
      </div>

      <StockStepperSheet
        key={stepperKey}
        target={stepperTarget}
        onClose={() => setStepperTarget(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

function EmptyState({ message, onClear }: { message: string; onClear?: () => void }): ReactElement {
  return (
    <div className="p-12 text-center">
      <p className="text-base font-semibold text-gray-700">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 min-h-[44px] px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 touch-manipulation"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }): ReactElement {
  return (
    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="min-h-[44px] px-4 text-sm font-semibold bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 touch-manipulation"
      >
        Previous
      </button>
      <span className="text-sm font-medium text-gray-500 tabular-nums">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page === pages}
        className="min-h-[44px] px-4 text-sm font-semibold bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 touch-manipulation"
      >
        Next
      </button>
    </div>
  );
}

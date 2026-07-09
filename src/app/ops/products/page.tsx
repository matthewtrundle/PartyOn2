'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import Link from 'next/link';
import { PRODUCT_CATEGORIES, getCategoryByProductType, getCategoryColor } from '@/lib/product-categories';
import SectionSubNav from '@/components/backend/SectionSubNav';
import { CATALOG_SUBNAV } from '@/components/backend/subnav-items';

interface ProductVariant {
  id: string;
  sku: string | null;
  title: string;
  price: number;
  inventory: number;
  available: boolean;
}

interface ProductCategory {
  handle: string;
  title: string;
}

interface Product {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  price: number;
  compareAtPrice: number | null;
  image: { url: string; altText: string | null } | null;
  categories: ProductCategory[];
  variants: ProductVariant[];
  totalInventory: number;
  variantCount: number;
  createdAt: string;
}

interface Filters {
  vendors: string[];
  categories: { handle: string; title: string }[];
  statuses: string[];
}

interface ProductsData {
  products: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: Filters;
}

// Stats card component for consistent styling
function StatCard({
  title,
  value,
  color = 'blue',
  icon
}: {
  title: string;
  value: string | number;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
  icon?: ReactElement;
}): ReactElement {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${colors[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
}

// Filter button component
function FilterButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): ReactElement {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 scale-[1.02]'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

export default function ProductsPage(): ReactElement {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get subcategories for selected category
  const activeCategory = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);
  const subcategories = activeCategory?.subcategories || [];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (vendorFilter) params.set('vendor', vendorFilter);

      // Add productTypes filter based on selected category/subcategory
      if (selectedSubcategory && activeCategory) {
        const sub = activeCategory.subcategories.find(s => s.label === selectedSubcategory);
        if (sub) {
          params.set('productTypes', sub.productTypes.join(','));
        }
      } else if (selectedCategory && activeCategory) {
        params.set('productTypes', activeCategory.allProductTypes.join(','));
      }

      params.set('page', page.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', '20');

      const response = await fetch(`/api/v1/admin/products?${params}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, vendorFilter, selectedCategory, selectedSubcategory, activeCategory, page, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchProducts]);

  const updateProductStatus = async (productId: string, status: string) => {
    try {
      await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm',
      DRAFT: 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm',
      ARCHIVED: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border border-gray-300 shadow-sm',
    };
    return colors[status] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 shadow-sm';
  };

  const getInventoryColor = (inventory: number): string => {
    if (inventory === 0) return 'text-red-600';
    if (inventory < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Calculate stats
  const stats = data ? {
    total: data.pagination.total,
    active: data.products.filter(p => p.status === 'ACTIVE').length,
    draft: data.products.filter(p => p.status === 'DRAFT').length,
    lowStock: data.products.filter(p => p.totalInventory < 10).length,
  } : { total: 0, active: 0, draft: 0, lowStock: 0 };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <SectionSubNav items={CATALOG_SUBNAV} />
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-500 mt-0.5">
                Manage your product catalog
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link
            href="/ops/products/create"
            className="group px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </Link>
          <button
            onClick={() => fetchProducts()}
            className="group px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Products"
          value={stats.total.toLocaleString()}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          title="Active"
          value={stats.active.toLocaleString()}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Draft"
          value={stats.draft.toLocaleString()}
          color="yellow"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStock.toLocaleString()}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Category Filter Pills */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
              !selectedCategory
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md shadow-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            All Products
          </button>
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(''); setPage(1); }}
              className={`px-4 py-2.5 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md shadow-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Subcategory Pills */}
        {subcategories.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 overflow-x-auto pb-1">
            <span className="text-xs text-gray-500 font-semibold mr-1 uppercase tracking-wider">Subcategory:</span>
            <button
              onClick={() => { setSelectedSubcategory(''); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${
                !selectedSubcategory
                  ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All {activeCategory?.label}
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub.label}
                onClick={() => { setSelectedSubcategory(sub.label); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${
                  selectedSubcategory === sub.label
                    ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative group">
              <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products by name, vendor, or tags..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <option value="">All Statuses</option>
            {data?.filters.statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={vendorFilter}
            onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <option value="">All Vendors</option>
            {data?.filters.vendors.map((vendor) => (
              <option key={vendor} value={vendor}>{vendor}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">Sort by:</span>
          <div className="flex gap-2">
            <FilterButton active={sortBy === 'title'} onClick={() => setSortBy('title')}>
              Title
            </FilterButton>
            <FilterButton active={sortBy === 'price'} onClick={() => setSortBy('price')}>
              Price
            </FilterButton>
            <FilterButton active={sortBy === 'createdAt'} onClick={() => setSortBy('createdAt')}>
              Date
            </FilterButton>
            <FilterButton active={sortBy === 'inventory'} onClick={() => setSortBy('inventory')}>
              Stock
            </FilterButton>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            {sortOrder === 'asc' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Ascending
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Descending
              </>
            )}
          </button>
          {data && (
            <span className="ml-auto text-sm text-gray-500">
              {data.pagination.total} product{data.pagination.total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3" />
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4" />
                  </div>
                  <div className="w-20 h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                  <div className="w-20 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
                  <div className="w-16 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : data?.products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-700 text-xl font-semibold">No products found</p>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">Try adjusting your filters or search term to find what you&apos;re looking for</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setVendorFilter('');
                setSelectedCategory('');
                setSelectedSubcategory('');
                setPage(1);
              }}
              className="mt-6 px-5 py-2.5 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Price</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Inventory</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Vendor</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.products.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {product.image ? (
                        <img
                          src={product.image.url}
                          alt={product.image.altText || product.title}
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/ops/products/${product.id}`}
                          className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors"
                        >
                          {product.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {product.productType && (() => {
                            const category = getCategoryByProductType(product.productType);
                            return category ? (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${getCategoryColor(category.id)}`}>
                                {category.label}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border bg-gray-100 text-gray-600 border-gray-200">
                                {product.productType}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-gray-400">
                            {product.variantCount} variant{product.variantCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-gray-900 text-lg">{formatCurrency(product.price)}</span>
                    {product.compareAtPrice != null && product.compareAtPrice > 0 && (
                      <span className="text-xs text-gray-400 line-through block">
                        {formatCurrency(product.compareAtPrice)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-bold ${getInventoryColor(product.totalInventory)}`}>
                      {product.totalInventory}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{product.vendor || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/ops/products/${product.id}`}
                        className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Edit
                      </Link>
                      {product.status === 'ACTIVE' ? (
                        <button
                          onClick={() => updateProductStatus(product.id, 'DRAFT')}
                          className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : product.status === 'DRAFT' ? (
                        <button
                          onClick={() => updateProductStatus(product.id, 'ACTIVE')}
                          className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => updateProductStatus(product.id, 'DRAFT')}
                          className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="group px-4 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                let pageNum = i + 1;
                if (data.pagination.pages > 5) {
                  if (page <= 3) pageNum = i + 1;
                  else if (page >= data.pagination.pages - 2) pageNum = data.pagination.pages - 4 + i;
                  else pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      page === pageNum
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md shadow-green-200 scale-105'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
              disabled={page === data.pagination.pages}
              className="group px-4 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              Next
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

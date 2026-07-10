'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';

interface Discount {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  isActive: boolean;
  combinable: boolean;
  freeShipping: boolean;
  usageCount: number;
  maxUsageCount: number | null;
  totalDiscountGiven: number;
  startsAt: string;
  expiresAt: string | null;
}

interface AutomaticDiscount {
  id: string;
  name: string;
  type: string;
  value: number;
  triggerType: string;
  triggerValue: number | null;
  isActive: boolean;
  priority: number;
}

/**
 * Admin Promotions Dashboard
 * Manage discount codes and automatic promotions
 */
export default function PromotionsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [autoDiscounts, setAutoDiscounts] = useState<AutomaticDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'codes' | 'automatic'>('codes');

  useEffect(() => {
    fetchDiscounts();
    fetchAutoDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('/api/v1/admin/discounts');
      const result = await response.json();
      if (result.success) {
        setDiscounts(result.data.discounts);
      }
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoDiscounts = async () => {
    try {
      const response = await fetch('/api/v1/admin/discounts/automatic');
      const result = await response.json();
      if (result.success) {
        setAutoDiscounts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch automatic discounts:', error);
    }
  };

  const toggleDiscountStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/admin/discounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (response.ok) {
        setDiscounts((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isActive: !currentStatus } : d))
        );
      }
    } catch (error) {
      console.error('Failed to toggle discount:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDiscountTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      PERCENTAGE: 'Percentage',
      FIXED_AMOUNT: 'Fixed Amount',
      BUY_X_GET_Y: 'Buy X Get Y',
      FREE_SHIPPING: 'Free Shipping',
    };
    return labels[type] || type;
  };

  const getTriggerLabel = (trigger: string): string => {
    const labels: Record<string, string> = {
      CART_TOTAL: 'Cart Total',
      PRODUCT_COUNT: 'Product Count',
      FIRST_ORDER: 'First Order',
      SPECIFIC_PRODUCT: 'Specific Product',
    };
    return labels[trigger] || trigger;
  };

  const getDiscountValueDisplay = (type: string, value: number): string => {
    if (type === 'PERCENTAGE') return `${value}%`;
    if (type === 'FREE_SHIPPING') return 'Free';
    return formatCurrency(value);
  };

  /** Kit flat badge — shared by desktop tables + mobile cards. */
  const badgeBase = 'inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase';

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <PartnersHubBand active="promotions" />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900 mb-6">Promotions</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="promotions" />
      <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900">Promotions</h1>
        </div>
        <Link
          href="/admin/promotions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Create Discount
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('codes')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'codes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Discount Codes ({discounts.length})
        </button>
        <button
          onClick={() => setActiveTab('automatic')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'automatic'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Automatic Discounts ({autoDiscounts.length})
        </button>
      </div>

      {/* Discount Codes Tab */}
      {activeTab === 'codes' && (
        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
          {discounts.length > 0 ? (
            <>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-black">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-black">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-black">Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-black">Value</th>
                  <th className="text-right py-3 px-4 font-semibold text-black">Usage</th>
                  <th className="text-right py-3 px-4 font-semibold text-black">Total Saved</th>
                  <th className="text-center py-3 px-4 font-semibold text-black">Stackable</th>
                  <th className="text-center py-3 px-4 font-semibold text-black">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {discount.code}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium text-black">{discount.name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {getDiscountTypeLabel(discount.type)}
                      {discount.freeShipping && discount.type !== 'FREE_SHIPPING' && (
                        <span className={`ml-1 ${badgeBase} bg-green-100 text-green-800`}>
                          + Free Delivery
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-black">
                      {getDiscountValueDisplay(discount.type, discount.value)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {discount.usageCount}
                      {discount.maxUsageCount && ` / ${discount.maxUsageCount}`}
                    </td>
                    <td className="py-3 px-4 text-right text-black">
                      {formatCurrency(discount.totalDiscountGiven)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`${badgeBase} ${
                          discount.combinable
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {discount.combinable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleDiscountStatus(discount.id, discount.isActive)}
                        className={`${badgeBase} ${
                          discount.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {discount.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/promotions/${discount.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="md:hidden divide-y divide-gray-100">
              {discounts.map((discount) => (
                <div key={discount.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-semibold">
                      {discount.code}
                    </code>
                    <span className="text-sm font-semibold text-gray-900">
                      {getDiscountValueDisplay(discount.type, discount.value)}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-gray-900">{discount.name}</div>
                  <div className="text-sm text-gray-500">
                    {getDiscountTypeLabel(discount.type)} &middot; Used {discount.usageCount}
                    {discount.maxUsageCount && ` / ${discount.maxUsageCount}`} &middot; Saved {formatCurrency(discount.totalDiscountGiven)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {discount.freeShipping && discount.type !== 'FREE_SHIPPING' && (
                      <span className={`${badgeBase} bg-green-100 text-green-800`}>
                        + Free Delivery
                      </span>
                    )}
                    <span
                      className={`${badgeBase} ${
                        discount.combinable
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {discount.combinable ? 'Stackable' : 'Not Stackable'}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => toggleDiscountStatus(discount.id, discount.isActive)}
                      className={`flex-1 min-h-[44px] px-3 inline-flex items-center justify-center rounded-lg text-sm font-semibold touch-manipulation ${
                        discount.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <Link
                      href={`/admin/promotions/${discount.id}`}
                      className="flex-1 min-h-[44px] px-3 inline-flex items-center justify-center rounded-lg border border-gray-200 text-blue-600 hover:text-blue-800 text-sm font-medium touch-manipulation"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No discount codes yet.{' '}
              <Link href="/admin/promotions/new" className="text-blue-600 hover:text-blue-800">
                Create your first one
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Automatic Discounts Tab */}
      {activeTab === 'automatic' && (
        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
          {autoDiscounts.length > 0 ? (
            <>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-black">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-black">Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-black">Value</th>
                  <th className="text-left py-3 px-4 font-semibold text-black">Trigger</th>
                  <th className="text-right py-3 px-4 font-semibold text-black">Priority</th>
                  <th className="text-center py-3 px-4 font-semibold text-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {autoDiscounts.map((discount) => (
                  <tr key={discount.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-black">{discount.name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {getDiscountTypeLabel(discount.type)}
                    </td>
                    <td className="py-3 px-4 text-right text-black">
                      {getDiscountValueDisplay(discount.type, discount.value)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {getTriggerLabel(discount.triggerType)}
                      {discount.triggerValue !== null && (
                        <span className="text-black ml-1">
                          ({discount.triggerType === 'CART_TOTAL'
                            ? formatCurrency(discount.triggerValue)
                            : discount.triggerValue})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">{discount.priority}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`${badgeBase} ${
                          discount.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {discount.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="md:hidden divide-y divide-gray-100">
              {autoDiscounts.map((discount) => (
                <div key={discount.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm text-gray-900">{discount.name}</div>
                    <span
                      className={`${badgeBase} ${
                        discount.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {getDiscountTypeLabel(discount.type)} &middot; {getDiscountValueDisplay(discount.type, discount.value)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getTriggerLabel(discount.triggerType)}
                    {discount.triggerValue !== null && (
                      <span className="text-gray-900 ml-1">
                        ({discount.triggerType === 'CART_TOTAL'
                          ? formatCurrency(discount.triggerValue)
                          : discount.triggerValue})
                      </span>
                    )}
                    {' '}&middot; Priority {discount.priority}
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No automatic discounts configured.
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Active Discount Codes</h3>
          <p className="text-2xl font-bold text-black">
            {discounts.filter((d) => d.isActive).length}
          </p>
        </div>
        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Discounts Given</h3>
          <p className="text-2xl font-bold text-black">
            {formatCurrency(discounts.reduce((sum, d) => sum + d.totalDiscountGiven, 0))}
          </p>
        </div>
        <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Redemptions</h3>
          <p className="text-2xl font-bold text-black">
            {discounts.reduce((sum, d) => sum + d.usageCount, 0)}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

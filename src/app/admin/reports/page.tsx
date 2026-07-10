'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesSummary {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  avgOrderValue: number;
  aovChange: number;
}

interface CustomerSummary {
  newCustomers: number;
  newCustomersChange: number;
  totalCustomers: number;
}

interface InventorySummary {
  totalItems: number;
  totalUnits: number;
  lowStockItems: number;
}

interface TopProduct {
  productId: string;
  productTitle: string;
  unitsSold: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface ReportSummary {
  dateRange: { start: string; end: string };
  sales: SalesSummary;
  customers: CustomerSummary;
  inventory: InventorySummary;
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
}

type DateRange = '7d' | '30d' | '90d';

/**
 * Admin Reports Dashboard
 * Overview of sales, customers, and inventory metrics
 */
export default function ReportsPage() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');

  const fetchData = async (selectedRange: DateRange) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/reports?range=${selectedRange}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getChangeArrow = (change: number): string => {
    if (change > 0) return '\u2191';
    if (change < 0) return '\u2193';
    return '-';
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900 mb-6">Reports Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900">Reports Dashboard</h1>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                range === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4 mb-6">
        <Link
          href="/admin/reports/sales"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Sales Report &rarr;
        </Link>
        <Link
          href="/admin/reports/customers"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Customer Report &rarr;
        </Link>
        <Link
          href="/admin/reports/inventory"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Inventory Report &rarr;
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-black">{formatCurrency(data?.sales.revenue || 0)}</p>
          <p className={`text-sm font-medium ${getChangeColor(data?.sales.revenueChange || 0)}`}>
            {getChangeArrow(data?.sales.revenueChange || 0)} {Math.abs(data?.sales.revenueChange || 0)}% vs previous period
          </p>
        </div>

        {/* Orders Card */}
        <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Total Orders</h3>
          <p className="text-3xl font-bold text-black">{data?.sales.orders || 0}</p>
          <p className={`text-sm font-medium ${getChangeColor(data?.sales.ordersChange || 0)}`}>
            {getChangeArrow(data?.sales.ordersChange || 0)} {Math.abs(data?.sales.ordersChange || 0)}% vs previous period
          </p>
        </div>

        {/* AOV Card */}
        <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Avg Order Value</h3>
          <p className="text-3xl font-bold text-black">{formatCurrency(data?.sales.avgOrderValue || 0)}</p>
          <p className={`text-sm font-medium ${getChangeColor(data?.sales.aovChange || 0)}`}>
            {getChangeArrow(data?.sales.aovChange || 0)} {Math.abs(data?.sales.aovChange || 0)}% vs previous period
          </p>
        </div>

        {/* New Customers Card */}
        <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">New Customers</h3>
          <p className="text-3xl font-bold text-black">{data?.customers.newCustomers || 0}</p>
          <p className={`text-sm font-medium ${getChangeColor(data?.customers.newCustomersChange || 0)}`}>
            {getChangeArrow(data?.customers.newCustomersChange || 0)} {Math.abs(data?.customers.newCustomersChange || 0)}% vs previous period
          </p>
        </div>

        {/* Total Customers Card */}
        <div className="bg-teal-100 border-2 border-teal-300 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Total Customers</h3>
          <p className="text-3xl font-bold text-black">{data?.customers.totalCustomers || 0}</p>
          <p className="text-sm text-gray-600">All time</p>
        </div>

        {/* Inventory Alert Card */}
        <div className={`border-2 rounded-lg p-6 ${
          (data?.inventory.lowStockItems || 0) > 0
            ? 'bg-red-100 border-red-300'
            : 'bg-gray-100 border-gray-300'
        }`}>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Low Stock Alerts</h3>
          <p className="text-3xl font-bold text-black">{data?.inventory.lowStockItems || 0}</p>
          <p className="text-sm text-gray-600">
            {data?.inventory.totalUnits || 0} total units across {data?.inventory.totalItems || 0} items
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Top Selling Products</h2>
          {data?.topProducts && data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase bg-blue-100 text-blue-800">
                      {index + 1}
                    </span>
                    <span className="font-medium text-black">{product.productTitle}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black">{formatCurrency(product.revenue)}</p>
                    <p className="text-sm text-gray-600">{product.unitsSold} units</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No sales data yet</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Recent Orders</h2>
          {data?.recentOrders && data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-black">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black">{formatCurrency(order.total)}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

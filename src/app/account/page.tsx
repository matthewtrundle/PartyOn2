'use client';

import { useEffect, useState } from 'react';
import { useCustomerContext } from '@/contexts/CustomerContext';
import CustomerAuth from '@/components/CustomerAuth';
import AccountLayout from '@/components/account/AccountLayout';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

export default function AccountPage() {
  const { customer, isAuthenticated, loading } = useCustomerContext();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setIsAuthOpen(true);
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 pt-24">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-yellow"></div>
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-32 bg-gradient-to-br from-gray-50 to-gray-100">
        <CustomerAuth 
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          redirectTo="/account"
        />
        <div className="text-center px-4">
          <h2 className="text-3xl font-cormorant mb-4">Welcome to Your Account</h2>
          <p className="text-gray-600 mb-8">Sign in to access your orders, addresses, and preferences</p>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em]"
          >
            SIGN IN TO CONTINUE
          </button>
        </div>
      </div>
    );
  }

  // TODO: Fetch orders from /api/v1/orders with customer ID
  const recentOrders: { id: string; name: string; processedAt: string; currentTotalPrice: { amount: string }; fulfillmentStatus: string }[] = [];
  const totalSpent = 0;

  // Membership tiers configuration
  const MEMBERSHIP_TIERS = [
    { 
      name: 'Bronze', 
      min: 0, 
      max: 499, 
      benefits: ['Standard delivery', 'Birthday discount'],
      color: 'from-orange-400 to-orange-600'
    },
    { 
      name: 'Silver', 
      min: 500, 
      max: 999, 
      benefits: ['10% off all orders', 'Priority support', 'Birthday discount'],
      color: 'from-gray-400 to-gray-600'
    },
    { 
      name: 'Gold', 
      min: 1000, 
      max: 2499, 
      benefits: ['15% off all orders', 'Free delivery on $100+', 'Priority support', 'Early access to sales'],
      color: 'from-brand-yellow to-brand-yellow'
    },
    { 
      name: 'Platinum', 
      min: 2500, 
      max: 4999, 
      benefits: ['20% off all orders', 'Free delivery on $75+', 'VIP support', 'Exclusive events', 'Personal concierge'],
      color: 'from-purple-400 to-purple-600'
    },
    { 
      name: 'Diamond', 
      min: 5000, 
      max: Infinity, 
      benefits: ['25% off all orders', 'Free delivery always', 'VIP support 24/7', 'Exclusive events', 'Personal concierge', 'Custom orders'],
      color: 'from-blue-400 to-blue-600'
    }
  ];

  const getCurrentTier = () => {
    return MEMBERSHIP_TIERS.find(tier => totalSpent >= tier.min && totalSpent <= tier.max) || MEMBERSHIP_TIERS[0];
  };

  const currentTier = getCurrentTier();

  return (
    <AccountLayout>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-8 mb-8">
        <h2 className="text-3xl font-cormorant text-gray-900 mb-2">
          Welcome back, {customer?.firstName || 'Valued Customer'}!
        </h2>
        <p className="text-gray-600">
          Your one-stop destination for premium alcohol delivery in Austin
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Link href="/order" className="group">
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-brand-yellow hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-yellow transition-colors">
              <svg className="w-6 h-6 text-brand-yellow group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Shop Products</h3>
            <p className="text-sm text-gray-500">Browse our selection</p>
          </div>
        </Link>

        <Link href="/order" className="group">
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-brand-yellow hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-yellow transition-colors">
              <svg className="w-6 h-6 text-brand-yellow group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Schedule Delivery</h3>
            <p className="text-sm text-gray-500">Book your next order</p>
          </div>
        </Link>

        <Link href="/account/addresses" className="group">
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-brand-yellow hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-yellow transition-colors">
              <svg className="w-6 h-6 text-brand-yellow group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Manage Addresses</h3>
            <p className="text-sm text-gray-500">Update delivery locations</p>
          </div>
        </Link>

        <Link href="/austin-corporate-event-delivery" className="group">
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-brand-yellow hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-yellow transition-colors">
              <svg className="w-6 h-6 text-brand-yellow group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Corporate Events</h3>
            <p className="text-sm text-gray-500">Premium event services</p>
          </div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-cormorant tracking-[0.1em]">RECENT ORDERS</h2>
              <Link href="/account/orders" className="text-sm text-brand-yellow hover:text-yellow-600">
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.processedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(order.currentTotalPrice.amount)}
                      </p>
                      <p className="text-xs text-green-600">{order.fulfillmentStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 mb-4">No orders yet</p>
                <Link href="/order" className="text-brand-yellow hover:text-yellow-600 text-sm">
                  Start Shopping →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Account Overview */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-cormorant tracking-[0.1em]">ACCOUNT OVERVIEW</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Lifetime Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  ${totalSpent.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 tracking-[0.1em]">LIFETIME SPENT</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {recentOrders.length}
                </p>
                <p className="text-xs text-gray-600 tracking-[0.1em]">TOTAL ORDERS</p>
              </div>
            </div>

            {/* Membership Benefits */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">{currentTier.name} Member Benefits</h3>
              <div className="space-y-2">
                {currentTier.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Support */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-3">Need assistance?</p>
              <Link href="/contact" className="inline-flex items-center space-x-2 text-brand-yellow hover:text-yellow-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm">Contact Support</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="mt-8 bg-gradient-to-r from-brand-yellow to-yellow-600 rounded-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-cormorant mb-2">Planning an Event?</h3>
            <p className="text-yellow-100 mb-4">
              Explore our premium event services for weddings, corporate events, and parties
            </p>
            <div className="flex gap-3">
              <Link href="/weddings" className="inline-block px-6 py-2 bg-white text-brand-yellow hover:bg-yellow-50 transition-colors rounded">
                WEDDINGS
              </Link>
              <Link href="/austin-corporate-event-delivery" className="inline-block px-6 py-2 bg-white text-brand-yellow hover:bg-yellow-50 transition-colors rounded">
                CORPORATE
              </Link>
              <Link href="/austin-bachelor-party-delivery" className="inline-block px-6 py-2 bg-white text-brand-yellow hover:bg-yellow-50 transition-colors rounded">
                BACH PARTIES
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <svg className="w-32 h-32 text-yellow-500 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5v14a1 1 0 0 0 1 1h3v-2H7V6h2V4H6a1 1 0 0 0-1 1zm14.242-.97-8-2A1 1 0 0 0 10 3v18a.998.998 0 0 0 1.242.97l8-2A1 1 0 0 0 20 19V5a1 1 0 0 0-.758-.97zM15 12.188a1.001 1.001 0 0 1-2 0v-.377a1 1 0 1 1 2 .001v.376z"/>
            </svg>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
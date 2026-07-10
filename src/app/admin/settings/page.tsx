'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DeliveryZone {
  id: string;
  name: string;
  zipCodes: string[];
  minimumOrder: number;
  deliveryFee: number;
  isActive: boolean;
}

interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

/**
 * Admin Settings Page
 * Business configuration for delivery, hours, and notifications
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'delivery' | 'hours' | 'notifications' | 'integrations'>('delivery');

  // Mock data - in production this would come from an API
  const [deliveryZones] = useState<DeliveryZone[]>([
    { id: '1', name: 'Downtown Austin', zipCodes: ['78701', '78702', '78703'], minimumOrder: 100, deliveryFee: 15, isActive: true },
    { id: '2', name: 'Lake Travis', zipCodes: ['78734', '78669', '78738'], minimumOrder: 150, deliveryFee: 25, isActive: true },
    { id: '3', name: 'South Austin', zipCodes: ['78704', '78745', '78748'], minimumOrder: 100, deliveryFee: 15, isActive: true },
    { id: '4', name: 'North Austin', zipCodes: ['78758', '78759', '78750'], minimumOrder: 100, deliveryFee: 20, isActive: true },
  ]);

  const [businessHours] = useState<BusinessHours[]>([
    { day: 'Monday', open: '10:00', close: '20:00', isOpen: true },
    { day: 'Tuesday', open: '10:00', close: '20:00', isOpen: true },
    { day: 'Wednesday', open: '10:00', close: '20:00', isOpen: true },
    { day: 'Thursday', open: '10:00', close: '21:00', isOpen: true },
    { day: 'Friday', open: '10:00', close: '22:00', isOpen: true },
    { day: 'Saturday', open: '09:00', close: '22:00', isOpen: true },
    { day: 'Sunday', open: '11:00', close: '19:00', isOpen: true },
  ]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900">Settings</h1>
          <p className="text-gray-600 text-sm">
            Configure business settings and integrations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-2 border-gray-200 rounded-lg mb-6">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'delivery', label: 'Delivery Zones' },
            { id: 'hours', label: 'Business Hours' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'integrations', label: 'Integrations' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Delivery Zones Tab */}
          {activeTab === 'delivery' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black">Delivery Zones & Fees</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Add Zone
                </button>
              </div>

              <div className="space-y-4">
                {deliveryZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`border-2 rounded-lg p-4 ${zone.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-black">{zone.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          ZIP Codes: {zone.zipCodes.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase ${zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {zone.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">Minimum Order:</span>
                        <span className="font-medium text-black ml-2">{formatCurrency(zone.minimumOrder)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Delivery Fee:</span>
                        <span className="font-medium text-black ml-2">{formatCurrency(zone.deliveryFee)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">Default Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Default Minimum Order:</span>
                    <span className="font-medium text-black ml-2">$100</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Express Delivery Fee:</span>
                    <span className="font-medium text-black ml-2">$50</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Express Minimum Notice:</span>
                    <span className="font-medium text-black ml-2">3 hours</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Hours Tab */}
          {activeTab === 'hours' && (
            <div>
              <h2 className="text-lg font-semibold text-black mb-4">Business Hours</h2>
              <p className="text-sm text-gray-600 mb-6">
                Set your operating hours for order acceptance and delivery.
              </p>

              <div className="space-y-3">
                {businessHours.map((hours) => (
                  <div
                    key={hours.day}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-4 w-32">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hours.isOpen}
                          className="sr-only peer"
                          readOnly
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                      <span className="font-medium text-black">{hours.day}</span>
                    </div>

                    {hours.isOpen ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={hours.open}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-black"
                          readOnly
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-black"
                          readOnly
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Holiday Hours</h3>
                <p className="text-sm text-gray-600">
                  Special hours for holidays can be configured on a per-day basis.
                  Contact support to set up holiday schedules.
                </p>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold text-black mb-4">Email Notifications</h2>
              <p className="text-sm text-gray-600 mb-6">
                Configure which notifications are sent to customers and staff.
              </p>

              <div className="space-y-4">
                <h3 className="font-medium text-black">Customer Notifications</h3>
                {[
                  { id: 'order-confirm', label: 'Order Confirmation', desc: 'Sent when order is placed', enabled: true },
                  { id: 'delivery-scheduled', label: 'Delivery Scheduled', desc: 'Sent when delivery is confirmed', enabled: true },
                  { id: 'delivery-enroute', label: 'Delivery En Route', desc: 'Sent when driver is on the way', enabled: true },
                  { id: 'delivery-complete', label: 'Delivery Complete', desc: 'Sent when order is delivered', enabled: true },
                ].map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-black">{notification.label}</p>
                      <p className="text-sm text-gray-500">{notification.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notification.enabled}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="font-medium text-black">Staff Notifications</h3>
                {[
                  { id: 'new-order', label: 'New Order Alert', desc: 'Sent when new order is received', enabled: true },
                  { id: 'low-stock', label: 'Low Stock Alert', desc: 'Sent when inventory is low', enabled: true },
                  { id: 'daily-summary', label: 'Daily Summary', desc: 'Sent every evening with day summary', enabled: false },
                ].map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-black">{notification.label}</p>
                      <p className="text-sm text-gray-500">{notification.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notification.enabled}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div>
              <h2 className="text-lg font-semibold text-black mb-4">Integrations</h2>
              <p className="text-sm text-gray-600 mb-6">
                Connected services and API configurations.
              </p>

              <div className="space-y-4">
                {[
                  {
                    name: 'Stripe',
                    desc: 'Payment processing',
                    status: 'Connected',
                    statusColor: 'bg-green-100 text-green-800',
                    icon: '💳',
                  },
                  {
                    name: 'Shopify',
                    desc: 'E-commerce platform (legacy)',
                    status: 'Connected',
                    statusColor: 'bg-green-100 text-green-800',
                    icon: '🛒',
                  },
                  {
                    name: 'Resend',
                    desc: 'Email delivery',
                    status: 'Connected',
                    statusColor: 'bg-green-100 text-green-800',
                    icon: '📧',
                  },
                  {
                    name: 'Vercel Analytics',
                    desc: 'Website analytics',
                    status: 'Connected',
                    statusColor: 'bg-green-100 text-green-800',
                    icon: '📊',
                  },
                  {
                    name: 'Google Places',
                    desc: 'Address autocomplete',
                    status: 'Not Configured',
                    statusColor: 'bg-gray-100 text-gray-600',
                    icon: '📍',
                  },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                        {integration.icon}
                      </div>
                      <div>
                        <p className="font-medium text-black">{integration.name}</p>
                        <p className="text-sm text-gray-500">{integration.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase ${integration.statusColor}`}>
                        {integration.status}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Configure
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <h3 className="font-medium text-black mb-2">API Keys</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manage API keys for third-party integrations. Keep these secure.
                </p>
                <Link
                  href="/admin/settings/api-keys"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Manage API Keys →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/promotions"
          className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-black">Promotions</h3>
          <p className="text-sm text-gray-500">Manage discount codes</p>
        </Link>
        <Link
          href="/admin/reports"
          className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-black">Reports</h3>
          <p className="text-sm text-gray-500">View analytics and reports</p>
        </Link>
      </div>
    </div>
  );
}

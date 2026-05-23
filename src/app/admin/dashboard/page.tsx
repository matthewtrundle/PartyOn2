'use client';

import { useState, useEffect, ReactElement } from 'react';
import Link from 'next/link';
import MetricCard from './components/MetricCard';
import SalesChart from './components/SalesChart';
import TopProductsTable from './components/TopProductsTable';
import IntegrationStatus from './components/IntegrationStatus';
import TrafficOverview from './components/TrafficOverview';
import SEOMetrics from './components/SEOMetrics';
import ActiveTestsSummary from './components/ActiveTestsSummary';
import CustomerBehaviorPanel from './components/CustomerBehaviorPanel';
import ABTestResultsPanel from './components/ABTestResultsPanel';
import RecommendationsPanel from './components/RecommendationsPanel';
import { ExtendedDashboardData, AnalyticsConfig } from '@/lib/analytics/types';

type Period = '7d' | '30d' | '90d';

/**
 * Admin Analytics Dashboard
 * Shows sales metrics, traffic data, and SEO performance
 */
export default function DashboardPage(): ReactElement {
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtendedDashboardData | null>(null);
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/analytics?period=${period}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch analytics');
        }

        setData(result.data);
        setConfig(result.config);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  const periodLabels: Record<Period, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };

  return (
    <div className="bg-gray-100 min-h-[calc(100vh-56px)]">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Sales Analytics
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {(['7d', '30d', '90d'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
              <Link
                href="/admin/operations"
                className="px-4 py-2 text-sm font-semibold rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
              >
                Ops health
              </Link>
              <Link
                href="/admin/recommendations"
                className="px-4 py-2 text-sm font-semibold rounded-md bg-brand-blue text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
              >
                Recommendations
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Integration Status */}
        {config && <IntegrationStatus config={config} />}

        {/* Active A/B Tests Summary - Quick Glance View */}
        {data?.experimentsByPage && (
          <div className="mb-6">
            <ActiveTestsSummary
              experimentsByPage={data.experimentsByPage}
              loading={loading}
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Sales Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Revenue"
            value={data?.sales.totalRevenue || 0}
            change={data?.sales.revenueChange}
            prefix="$"
            loading={loading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Orders"
            value={data?.sales.totalOrders || 0}
            change={data?.sales.ordersChange}
            loading={loading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
          <MetricCard
            title="Avg Order Value"
            value={data?.sales.averageOrderValue || 0}
            prefix="$"
            loading={loading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            title="Conversion Rate"
            value="--"
            suffix="%"
            loading={loading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SalesChart data={data?.dailySales || []} loading={loading} />
          </div>
          <div>
            <TopProductsTable products={data?.topProducts || []} loading={loading} />
          </div>
        </div>

        {/* Traffic & SEO Section (when Google APIs are configured) */}
        {config && (config.ga4Configured || config.searchConsoleConfigured) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {config.ga4Configured && (
              <TrafficOverview
                metrics={data?.traffic || null}
                sources={data?.trafficSources || []}
                loading={loading}
              />
            )}
            {config.searchConsoleConfigured && (
              <SEOMetrics
                metrics={data?.seo || null}
                keywords={data?.topKeywords || []}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* Customer Behavior & A/B Testing Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CustomerBehaviorPanel
            metrics={data?.behavior || null}
            loading={loading}
          />
          <ABTestResultsPanel
            results={data?.experiments || null}
            loading={loading}
          />
        </div>

        {/* AI Recommendations Section */}
        {data?.recommendations && data.recommendations.length > 0 && (
          <div className="mb-8">
            <RecommendationsPanel
              recommendations={data.recommendations}
              loading={loading}
            />
          </div>
        )}

        {/* Setup Instructions (when Google APIs are NOT configured) */}
        {config && (!config.ga4Configured || !config.searchConsoleConfigured) && (
          <div id="setup-instructions" className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {config.ga4Configured || config.searchConsoleConfigured
                ? 'Complete Your Setup'
                : 'Unlock SEO & Traffic Insights'}
            </h3>
            <p className="text-gray-600 mb-4">
              {!config.ga4Configured && !config.searchConsoleConfigured
                ? 'Connect Google Analytics and Search Console to see:'
                : !config.ga4Configured
                ? 'Connect Google Analytics to see:'
                : 'Connect Search Console to see:'}
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
              {!config.ga4Configured && (
                <>
                  <li>Real-time traffic data and user behavior</li>
                  <li>Top landing pages and traffic sources</li>
                </>
              )}
              {!config.searchConsoleConfigured && (
                <>
                  <li>Organic search rankings and keyword performance</li>
                  <li>Click-through rates and impression data</li>
                </>
              )}
            </ul>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Setup Instructions</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </li>
                <li>Create a new project (or select existing)</li>
                <li>Enable the &quot;Google Analytics Data API&quot; and &quot;Search Console API&quot;</li>
                <li>Create a Service Account and download the JSON key</li>
                <li>
                  Add the service account email to your GA4 property and Search Console
                </li>
                <li>
                  Add the following environment variables:
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_GA4_PROPERTY_ID=123456789
GOOGLE_SEARCH_CONSOLE_SITE=sc-domain:partyondelivery.com`}
                  </pre>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          {data?.lastUpdated && (
            <p>
              Last updated:{' '}
              {new Date(data.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

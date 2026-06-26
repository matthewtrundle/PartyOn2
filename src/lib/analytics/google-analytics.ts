/**
 * Google Analytics 4 Data API Integration
 * Fetches traffic metrics from GA4
 */

import { google } from 'googleapis';
import { getGoogleAuth } from './google-auth';
import { TrafficMetrics, TrafficSource, TopPage } from './types';

const PROPERTY_ID = process.env.GOOGLE_GA4_PROPERTY_ID;

/**
 * Format date as YYYY-MM-DD for GA4 API
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get traffic metrics from GA4
 */
export async function getTrafficMetrics(
  startDate: Date,
  endDate: Date,
  compareStartDate?: Date,
  compareEndDate?: Date
): Promise<TrafficMetrics | null> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID) return null;

  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    // Fetch current period
    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          { startDate: formatDate(startDate), endDate: formatDate(endDate) },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      },
    });

    const row = response.data.rows?.[0];
    if (!row?.metricValues) return null;

    const sessions = parseInt(row.metricValues[0].value || '0', 10);
    const users = parseInt(row.metricValues[1].value || '0', 10);
    const pageviews = parseInt(row.metricValues[2].value || '0', 10);
    const bounceRate = parseFloat(row.metricValues[3].value || '0') * 100;
    const avgSessionDuration = parseFloat(row.metricValues[4].value || '0');

    // Calculate change if comparison period provided
    let sessionsChange = 0;
    let usersChange = 0;

    if (compareStartDate && compareEndDate) {
      const compareResponse = await analyticsData.properties.runReport({
        property: `properties/${PROPERTY_ID}`,
        requestBody: {
          dateRanges: [
            {
              startDate: formatDate(compareStartDate),
              endDate: formatDate(compareEndDate),
            },
          ],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        },
      });

      const compareRow = compareResponse.data.rows?.[0];
      if (compareRow?.metricValues) {
        const compareSessions = parseInt(
          compareRow.metricValues[0].value || '0',
          10
        );
        const compareUsers = parseInt(
          compareRow.metricValues[1].value || '0',
          10
        );

        if (compareSessions > 0) {
          sessionsChange =
            ((sessions - compareSessions) / compareSessions) * 100;
        }
        if (compareUsers > 0) {
          usersChange = ((users - compareUsers) / compareUsers) * 100;
        }
      }
    }

    return {
      sessions,
      users,
      pageviews,
      bounceRate: Math.round(bounceRate * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration),
      sessionsChange: Math.round(sessionsChange * 10) / 10,
      usersChange: Math.round(usersChange * 10) / 10,
    };
  } catch (error) {
    console.error('GA4 API error:', error);
    return null;
  }
}

/**
 * Get traffic sources breakdown
 */
export async function getTrafficSources(
  startDate: Date,
  endDate: Date
): Promise<TrafficSource[]> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID) return [];

  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          { startDate: formatDate(startDate), endDate: formatDate(endDate) },
        ],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      },
    });

    const rows = response.data.rows || [];
    const totalSessions = rows.reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0].value || '0', 10),
      0
    );

    return rows.map((row) => {
      const sessions = parseInt(row.metricValues?.[0].value || '0', 10);
      return {
        source: row.dimensionValues?.[0].value || 'Unknown',
        sessions,
        percentage:
          totalSessions > 0
            ? Math.round((sessions / totalSessions) * 1000) / 10
            : 0,
      };
    });
  } catch (error) {
    console.error('GA4 traffic sources error:', error);
    return [];
  }
}

/**
 * Get top pages by pageviews
 */
export async function getTopPages(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<TopPage[]> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID) return [];

  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          { startDate: formatDate(startDate), endDate: formatDate(endDate) },
        ],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: String(limit),
      },
    });

    return (response.data.rows || []).map((row) => ({
      path: row.dimensionValues?.[0].value || '/',
      pageviews: parseInt(row.metricValues?.[0].value || '0', 10),
      avgTimeOnPage: Math.round(
        parseFloat(row.metricValues?.[1].value || '0')
      ),
    }));
  } catch (error) {
    console.error('GA4 top pages error:', error);
    return [];
  }
}

export interface RevenueByChannel {
  channel: string;
  sessions: number;
  transactions: number;
  revenue: number;
  conversionRate: number;
}

/**
 * Revenue breakdown by GA4 default channel group (Direct / Organic / Paid / Referral / Social / Email).
 */
export async function getRevenueByChannel(
  startDate: Date,
  endDate: Date
): Promise<RevenueByChannel[]> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID) return [];
  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'transactions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ metric: { metricName: 'purchaseRevenue' }, desc: true }],
        limit: '20',
      },
    });
    return (response.data.rows || []).map((row) => {
      const sessions = parseInt(row.metricValues?.[0].value || '0', 10);
      const transactions = parseInt(row.metricValues?.[1].value || '0', 10);
      const revenue = parseFloat(row.metricValues?.[2].value || '0');
      return {
        channel: row.dimensionValues?.[0].value || 'Unknown',
        sessions,
        transactions,
        revenue,
        conversionRate: sessions > 0 ? transactions / sessions : 0,
      };
    });
  } catch (error) {
    console.error('GA4 revenue by channel error:', error);
    return [];
  }
}

export interface PageConversion {
  path: string;
  sessions: number;
  transactions: number;
  revenue: number;
  conversionRate: number;
}

/**
 * Conversion rate + revenue per landing page. Used to compare segment landing
 * pages (/weddings vs /bach-parties vs /boat-parties vs /corporate).
 */
export async function getConversionByLandingPage(
  startDate: Date,
  endDate: Date,
  limit = 20
): Promise<PageConversion[]> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID) return [];
  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'landingPage' }],
        metrics: [
          { name: 'sessions' },
          { name: 'transactions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: String(limit),
      },
    });
    return (response.data.rows || []).map((row) => {
      const sessions = parseInt(row.metricValues?.[0].value || '0', 10);
      const transactions = parseInt(row.metricValues?.[1].value || '0', 10);
      const revenue = parseFloat(row.metricValues?.[2].value || '0');
      return {
        path: row.dimensionValues?.[0].value || '/',
        sessions,
        transactions,
        revenue,
        conversionRate: sessions > 0 ? transactions / sessions : 0,
      };
    });
  } catch (error) {
    console.error('GA4 conversion by landing page error:', error);
    return [];
  }
}

export interface PageTrafficPoint {
  /** GA4 `date` as YYYY-MM-DD. */
  date: string;
  pageviews: number;
  visitors: number;
}

/**
 * Daily pageviews + unique visitors for a specific set of page paths, unioned.
 * Used by the per-landing-page hub's traffic chart. Filters on GA4 `pagePath`
 * (which excludes the query string), so the exact registry paths match cleanly.
 * Each row aggregates across all the page's paths for that day.
 */
export async function getPageTrafficTimeseries(
  paths: string[],
  startDate: Date,
  endDate: Date
): Promise<PageTrafficPoint[]> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID || paths.length === 0) return [];
  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        dimensionFilter: {
          filter: { fieldName: 'pagePath', inListFilter: { values: paths } },
        },
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: '400',
      },
    });
    return (response.data.rows || []).map((row) => {
      const raw = row.dimensionValues?.[0].value || ''; // YYYYMMDD
      const date = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
      return {
        date,
        pageviews: parseInt(row.metricValues?.[0].value || '0', 10),
        visitors: parseInt(row.metricValues?.[1].value || '0', 10),
      };
    });
  } catch (error) {
    console.error('GA4 page traffic timeseries error:', error);
    return [];
  }
}

export interface PageTrafficTotals {
  pageviews: number;
  visitors: number;
}

/**
 * Period-level pageviews + unique visitors for a set of page paths, unioned.
 * Unlike summing the daily timeseries, this returns the correct de-duplicated
 * unique-visitor count for the whole window (a visitor on two days is one
 * visitor here). Returns null when GA4 isn't configured.
 */
export async function getPageTrafficTotals(
  paths: string[],
  startDate: Date,
  endDate: Date
): Promise<PageTrafficTotals | null> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID || paths.length === 0) return null;
  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        dimensionFilter: {
          filter: { fieldName: 'pagePath', inListFilter: { values: paths } },
        },
      },
    });
    const row = response.data.rows?.[0];
    return {
      pageviews: parseInt(row?.metricValues?.[0].value || '0', 10),
      visitors: parseInt(row?.metricValues?.[1].value || '0', 10),
    };
  } catch (error) {
    console.error('GA4 page traffic totals error:', error);
    return null;
  }
}

export interface FunnelStep {
  eventName: string;
  users: number;
  dropOffFromPrevious: number | null;
}

/**
 * Checkout funnel: view_item -> add_to_cart -> begin_checkout -> purchase.
 * Uses GA4 standard ecommerce events.
 */
export async function getCheckoutFunnel(
  startDate: Date,
  endDate: Date
): Promise<FunnelStep[]> {
  const auth = getGoogleAuth();
  if (!auth || !PROPERTY_ID) return [];
  const steps = ['view_item', 'add_to_cart', 'begin_checkout', 'purchase'];
  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const response = await analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'totalUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: steps },
          },
        },
      },
    });
    const byEvent = new Map<string, number>();
    for (const row of response.data.rows || []) {
      byEvent.set(row.dimensionValues?.[0].value || '', parseInt(row.metricValues?.[0].value || '0', 10));
    }
    const results: FunnelStep[] = [];
    let prev: number | null = null;
    for (const step of steps) {
      const users = byEvent.get(step) || 0;
      const drop = prev != null && prev > 0 ? (prev - users) / prev : null;
      results.push({ eventName: step, users, dropOffFromPrevious: drop });
      prev = users;
    }
    return results;
  } catch (error) {
    console.error('GA4 funnel error:', error);
    return [];
  }
}

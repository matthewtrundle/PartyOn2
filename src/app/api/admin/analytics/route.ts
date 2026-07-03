/**
 * Admin Analytics API
 * Fetches analytics data from Shopify, GA4, and Search Console
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalesMetrics, getDailySales, getTopProducts } from '@/lib/analytics/shopify';
import { getTrafficMetrics, getTrafficSources, getTopPages } from '@/lib/analytics/google-analytics';
import { getSEOMetrics, getTopKeywords } from '@/lib/analytics/search-console';
import { getBehaviorMetrics } from '@/lib/analytics/ga4-behavior';
import { generateRecommendations } from '@/lib/analytics/recommendations';
import { isGoogleConfigured } from '@/lib/analytics/google-auth';
import { prisma } from '@/lib/prisma';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  ExtendedDashboardData,
  AnalyticsConfig,
  ExperimentResult,
  ExperimentsByPage,
  ABTestResults,
} from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics
 * Fetches dashboard data for the specified period
 */
export async function GET(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '30d';

  // Calculate date ranges based on period
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;
  let compareStartDate: Date;
  let compareEndDate: Date;

  switch (period) {
    case '7d':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      compareEndDate = new Date(startDate);
      compareStartDate = new Date(compareEndDate);
      compareStartDate.setDate(compareStartDate.getDate() - 7);
      break;
    case '30d':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      compareEndDate = new Date(startDate);
      compareStartDate = new Date(compareEndDate);
      compareStartDate.setDate(compareStartDate.getDate() - 30);
      break;
    case '90d':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 90);
      compareEndDate = new Date(startDate);
      compareStartDate = new Date(compareEndDate);
      compareStartDate.setDate(compareStartDate.getDate() - 90);
      break;
    default:
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      compareEndDate = new Date(startDate);
      compareStartDate = new Date(compareEndDate);
      compareStartDate.setDate(compareStartDate.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);

  // Check what integrations are configured
  const googleConfig = isGoogleConfigured();
  const config: AnalyticsConfig = {
    shopifyConfigured: !!process.env.SHOPIFY_ADMIN_API_TOKEN,
    ga4Configured: googleConfig.ga4,
    searchConsoleConfigured: googleConfig.searchConsole,
  };

  // Format dates for GA4 queries
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  try {
    // Start with empty dashboard data
    const dashboardData: ExtendedDashboardData = {
      sales: {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        revenueChange: 0,
        ordersChange: 0,
      },
      dailySales: [],
      topProducts: [],
      lastUpdated: new Date().toISOString(),
    };

    // Fetch all data in parallel
    const promises: Promise<void>[] = [];

    // Shopify data
    if (config.shopifyConfigured) {
      promises.push(
        (async () => {
          const [salesMetrics, dailySales, topProducts] = await Promise.all([
            getSalesMetrics(startDate, endDate, compareStartDate, compareEndDate),
            getDailySales(startDate, endDate),
            getTopProducts(startDate, endDate, 10),
          ]);
          dashboardData.sales = salesMetrics;
          dashboardData.dailySales = dailySales;
          dashboardData.topProducts = topProducts;
        })()
      );
    }

    // GA4 data
    if (config.ga4Configured) {
      promises.push(
        (async () => {
          const [trafficMetrics, trafficSources, topPages] = await Promise.all([
            getTrafficMetrics(startDate, endDate, compareStartDate, compareEndDate),
            getTrafficSources(startDate, endDate),
            getTopPages(startDate, endDate, 10),
          ]);
          if (trafficMetrics) dashboardData.traffic = trafficMetrics;
          if (trafficSources.length > 0) dashboardData.trafficSources = trafficSources;
          if (topPages.length > 0) dashboardData.topPages = topPages;
        })()
      );
    }

    // Search Console data
    if (config.searchConsoleConfigured) {
      promises.push(
        (async () => {
          const [seoMetrics, topKeywords] = await Promise.all([
            getSEOMetrics(startDate, endDate, compareStartDate, compareEndDate),
            getTopKeywords(startDate, endDate, 20),
          ]);
          if (seoMetrics) dashboardData.seo = seoMetrics;
          if (topKeywords.length > 0) dashboardData.topKeywords = topKeywords;
        })()
      );
    }

    // Behavior metrics (GA4 custom events)
    if (config.ga4Configured) {
      promises.push(
        (async () => {
          const behaviorMetrics = await getBehaviorMetrics(startDateStr, endDateStr);
          if (behaviorMetrics) dashboardData.behavior = behaviorMetrics;
        })()
      );
    }

    // Experiments from database
    promises.push(
      (async () => {
        try {
          const experiments = await prisma.experiment.findMany({
            include: {
              variants: { orderBy: { isControl: 'desc' } },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          });

          // Transform to ExperimentResult format
          const transformedExperiments: ExperimentResult[] = experiments.map((exp) => {
            const totalImpressions = exp.variants.reduce((sum, v) => sum + v.impressions, 0);
            const controlVariant = exp.variants.find((v) => v.isControl);
            const bestVariant = exp.variants.reduce((best, v) => {
              if (v.isControl) return best;
              const vRate = v.impressions > 0 ? v.clicks / v.impressions : 0;
              const bestRate = best && best.impressions > 0 ? best.clicks / best.impressions : 0;
              return vRate > bestRate ? v : best;
            }, null as typeof exp.variants[0] | null);

            let uplift = 0;
            if (controlVariant && bestVariant && controlVariant.impressions > 0 && bestVariant.impressions > 0) {
              const controlRate = controlVariant.clicks / controlVariant.impressions;
              const bestRate = bestVariant.clicks / bestVariant.impressions;
              uplift = controlRate > 0 ? ((bestRate - controlRate) / controlRate) * 100 : 0;
            }

            const expStartDate = exp.startDate ? new Date(exp.startDate) : null;
            const daysRunning = expStartDate
              ? Math.floor((Date.now() - expStartDate.getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            let recommendedAction = 'Waiting for data';
            if (totalImpressions >= 1000) {
              if (exp.confidence && exp.confidence >= 95) {
                recommendedAction = 'Implement winner - statistically significant';
              } else if (exp.confidence && exp.confidence >= 80) {
                recommendedAction = 'Continue test - approaching significance';
              } else {
                recommendedAction = 'Continue test - more data needed';
              }
            } else {
              recommendedAction = `Need ${1000 - totalImpressions} more impressions`;
            }

            return {
              id: exp.id,
              name: exp.name,
              description: exp.description || undefined,
              page: exp.page,
              elementId: exp.elementId,
              status: exp.status.toLowerCase() as ExperimentResult['status'],
              startDate: exp.startDate?.toISOString() || null,
              endDate: exp.endDate?.toISOString() || null,
              goalMetric: exp.goalMetric,
              goalValue: exp.goalValue || undefined,
              variants: exp.variants.map((v) => ({
                id: v.id,
                name: v.name,
                description: v.description || undefined,
                isControl: v.isControl,
                weight: v.weight,
                impressions: v.impressions,
                clicks: v.clicks,
                conversions: v.conversions,
                revenue: v.revenue,
                clickRate: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
                conversionRate: v.impressions > 0 ? (v.conversions / v.impressions) * 100 : 0,
              })),
              winner: exp.winningVariant,
              confidence: exp.confidence || 0,
              sampleSize: totalImpressions,
              daysRunning,
              recommendedAction,
              uplift: Math.round(uplift * 10) / 10,
            };
          });

          const abTestResults: ABTestResults = {
            experiments: transformedExperiments,
            activeCount: transformedExperiments.filter((e) => e.status === 'active').length,
            completedCount: transformedExperiments.filter((e) => e.status === 'completed').length,
            draftCount: transformedExperiments.filter((e) => e.status === 'draft').length,
          };

          dashboardData.experiments = abTestResults;

          // Group by page for the quick-glance view
          const pageMap = new Map<string, ExperimentResult[]>();
          const keyPages = ['/', '/weddings', '/order', '/boat-parties', '/bach-parties', '/austin-corporate-event-delivery'];

          for (const page of keyPages) {
            pageMap.set(page, []);
          }

          for (const exp of transformedExperiments) {
            const existing = pageMap.get(exp.page) || [];
            existing.push(exp);
            pageMap.set(exp.page, existing);
          }

          const experimentsByPage: ExperimentsByPage[] = Array.from(pageMap.entries()).map(
            ([page, exps]) => {
              const pageNames: Record<string, string> = {
                '/': 'Homepage',
                '/weddings': 'Weddings',
                '/order': 'Order',
                '/boat-parties': 'Boat Parties',
                '/bach-parties': 'Bach Parties',
                '/austin-corporate-event-delivery': 'Corporate',
              };
              return {
                page,
                pageName: pageNames[page] || page,
                activeExperiments: exps.filter((e) => e.status === 'active' || e.status === 'paused'),
                hasActiveTests: exps.some((e) => e.status === 'active'),
              };
            }
          );

          dashboardData.experimentsByPage = experimentsByPage;
        } catch (error) {
          console.error('Error fetching experiments:', error);
          // Don't fail the whole request if experiments fail
          dashboardData.experiments = { experiments: [], activeCount: 0, completedCount: 0, draftCount: 0 };
          dashboardData.experimentsByPage = [];
        }
      })()
    );

    // Wait for all data to be fetched
    await Promise.all(promises);

    // Generate recommendations (after all data is fetched)
    dashboardData.recommendations = generateRecommendations(
      dashboardData.behavior || null,
      dashboardData.experiments || null,
      dashboardData.sales
    );

    return NextResponse.json({
      success: true,
      data: dashboardData,
      config,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}

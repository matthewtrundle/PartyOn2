'use client';

import { ReactElement } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { TrafficPoint } from '@/lib/analytics/landing-page-metrics';

interface TrafficChartProps {
  data: TrafficPoint[];
  loading?: boolean;
}

/** Format a bucket key (YYYY-MM-DD day/week, or YYYY-MM month) into a short axis label. */
function bucketLabel(bucket: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) return format(parseISO(bucket), 'MMM d');
  if (/^\d{4}-\d{2}$/.test(bucket)) return format(parseISO(`${bucket}-01`), 'MMM yyyy');
  return bucket;
}

/**
 * Pageviews + unique-visitors trend for one landing page. Mirrors the dashboard
 * SalesChart recharts setup but plots traffic instead of revenue/orders.
 */
export default function TrafficChart({ data, loading = false }: TrafficChartProps): ReactElement {
  if (loading) {
    return <div className="h-64 bg-gray-100 rounded animate-pulse" />;
  }
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-500">
        No traffic data for this period.
      </div>
    );
  }

  const chartData = data.map((p) => ({ ...p, label: bucketLabel(p.bucket) }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="pageviews"
            name="Pageviews"
            stroke="#0B74B8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="visitors"
            name="Visitors"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

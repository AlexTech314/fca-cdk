'use client';

import { useEffect, useState, useCallback } from 'react';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// ============================================
// Types
// ============================================

interface TimeSeriesPoint {
  bucket: string;
  count: number;
}

interface PageViewSeries {
  path: string;
  data: TimeSeriesPoint[];
  total: number;
}

interface ReferrerSeries {
  source: string;
  data: TimeSeriesPoint[];
  total: number;
}

interface TopPage {
  path: string;
  views: number;
}

type RangeKey = '24h' | '7d' | '30d';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '24h', label: 'Last 24 hours', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
];

const COLORS = [
  '#1e40af', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#6366f1',
];

// ============================================
// Helpers
// ============================================

function buildQueryString(days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return `startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
}

/** Merge multiple series into a single array of { bucket, [key]: count } for Recharts */
function mergeTimeSeries<T extends { data: TimeSeriesPoint[] }>(
  series: T[],
  keyFn: (item: T) => string
): Record<string, unknown>[] {
  const bucketMap = new Map<string, Record<string, unknown>>();

  for (const s of series) {
    const key = keyFn(s);
    for (const pt of s.data) {
      if (!bucketMap.has(pt.bucket)) {
        bucketMap.set(pt.bucket, { bucket: pt.bucket });
      }
      bucketMap.get(pt.bucket)![key] = pt.count;
    }
  }

  return Array.from(bucketMap.values()).sort((a, b) =>
    (a.bucket as string).localeCompare(b.bucket as string)
  );
}

function formatBucket(bucket: string, range: RangeKey): string {
  const d = new Date(bucket + ':00Z');
  if (range === '24h') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (range === '7d') {
    return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// Page
// ============================================

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('7d');
  const [pageViews, setPageViews] = useState<PageViewSeries[]>([]);
  const [referrers, setReferrers] = useState<ReferrerSeries[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const days = RANGES.find((r) => r.key === range)!.days;
    const qs = buildQueryString(days);

    try {
      const [pvRes, refRes, topRes] = await Promise.all([
        authedApiFetch(`/api/admin/analytics/pageviews?${qs}`),
        authedApiFetch(`/api/admin/analytics/referrers?${qs}`),
        authedApiFetch(`/api/admin/analytics/top-pages?days=${days}`),
      ]);

      if (pvRes.ok) setPageViews(await pvRes.json());
      if (refRes.ok) setReferrers(await refRes.json());
      if (topRes.ok) setTopPages(await topRes.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Take top 10 by total views for the chart
  const topPvSeries = [...pageViews].sort((a, b) => b.total - a.total).slice(0, 10);
  const topRefSeries = [...referrers].sort((a, b) => b.total - a.total).slice(0, 10);

  const pvChartData = mergeTimeSeries(topPvSeries, (s) => s.path);
  const refChartData = mergeTimeSeries(topRefSeries, (s) => s.source);

  const totalViews = pageViews.reduce((sum, s) => sum + s.total, 0);
  const totalReferrers = referrers.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Website Analytics</h1>
          <p className="mt-1 text-sm text-text-muted">Page views and referrer sources</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm font-medium text-text-muted">Total Page Views</p>
          <p className="mt-1 text-2xl font-bold text-text">
            {loading ? '...' : totalViews.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm font-medium text-text-muted">Unique Pages</p>
          <p className="mt-1 text-2xl font-bold text-text">
            {loading ? '...' : pageViews.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm font-medium text-text-muted">Referrer Sources</p>
          <p className="mt-1 text-2xl font-bold text-text">
            {loading ? '...' : referrers.length}
          </p>
        </div>
      </div>

      {/* Page Views Chart */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-text">Page Views Over Time</h2>
        {loading ? (
          <div className="flex h-80 items-center justify-center text-text-muted">Loading...</div>
        ) : pvChartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-text-muted">
            No page view data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={pvChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => formatBucket(v, range)}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => formatBucket(v as string, range)}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {topPvSeries.map((s, i) => (
                <Line
                  key={s.path}
                  type="monotone"
                  dataKey={s.path}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Referrers Chart */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-text">Referrer Sources Over Time</h2>
        {loading ? (
          <div className="flex h-80 items-center justify-center text-text-muted">Loading...</div>
        ) : refChartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-text-muted">
            No referrer data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={refChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => formatBucket(v, range)}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => formatBucket(v as string, range)}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {topRefSeries.map((s, i) => (
                <Line
                  key={s.source}
                  type="monotone"
                  dataKey={s.source}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Pages Table */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-text">Top Pages</h2>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-text-muted">Loading...</div>
        ) : topPages.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-text-muted">
            No data yet
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 text-right font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {topPages.map((page) => (
                <tr key={page.path} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-mono text-xs text-text">{page.path}</td>
                  <td className="py-2.5 text-right tabular-nums text-text">
                    {page.views.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

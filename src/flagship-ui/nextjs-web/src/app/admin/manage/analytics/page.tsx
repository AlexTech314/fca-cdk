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

const RANGES: { key: RangeKey; label: string; days: number; granMinutes: number }[] = [
  { key: '24h', label: 'Last 24 hours', days: 1, granMinutes: 5 },
  { key: '7d', label: 'Last 7 days', days: 7, granMinutes: 60 },
  { key: '30d', label: 'Last 30 days', days: 30, granMinutes: 720 },
];

const MAX_SERIES = 15;

const COLORS = [
  '#1e40af', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#6366f1',
  '#0d9488', '#be123c', '#4338ca', '#b45309', '#9333ea',
];

// ============================================
// Helpers
// ============================================

function getRange(key: RangeKey) {
  return RANGES.find((r) => r.key === key)!;
}

function buildQueryString(days: number): { qs: string; start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    qs: `startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
    start,
    end,
  };
}

/** Floor a UTC date to the nearest granularity bucket string (YYYY-MM-DDTHH:MM) */
function floorToBucket(date: Date, granMinutes: number): string {
  const d = new Date(date);
  const totalMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const floored = totalMin - (totalMin % granMinutes);
  d.setUTCHours(Math.floor(floored / 60), floored % 60, 0, 0);
  return d.toISOString().slice(0, 16);
}

/** Generate every bucket label from start to end at the given granularity */
function generateAllBuckets(start: Date, end: Date, granMinutes: number): string[] {
  const buckets: string[] = [];
  const granMs = granMinutes * 60 * 1000;
  // Floor start to granularity
  const cursor = new Date(start);
  const totalMin = cursor.getUTCHours() * 60 + cursor.getUTCMinutes();
  const floored = totalMin - (totalMin % granMinutes);
  cursor.setUTCHours(Math.floor(floored / 60), floored % 60, 0, 0);

  while (cursor <= end) {
    buckets.push(cursor.toISOString().slice(0, 16));
    cursor.setTime(cursor.getTime() + granMs);
  }
  return buckets;
}

/**
 * Merge multiple series into a continuous array of { bucket, [key]: count } for Recharts.
 * Aggregates raw 5-min data into the display granularity and fills gaps with 0.
 */
function mergeTimeSeries<T extends { data: TimeSeriesPoint[] }>(
  series: T[],
  keyFn: (item: T) => string,
  allBuckets: string[],
  granMinutes: number
): Record<string, unknown>[] {
  const keys = series.map(keyFn);

  // Build a map: displayBucket -> { key -> aggregated count }
  const bucketMap = new Map<string, Record<string, number>>();
  for (const b of allBuckets) {
    const row: Record<string, number> = {};
    for (const k of keys) row[k] = 0;
    bucketMap.set(b, row);
  }

  // Aggregate raw data into display buckets
  for (const s of series) {
    const key = keyFn(s);
    for (const pt of s.data) {
      const displayBucket = floorToBucket(new Date(pt.bucket + ':00Z'), granMinutes);
      const row = bucketMap.get(displayBucket);
      if (row) row[key] = (row[key] || 0) + pt.count;
    }
  }

  return allBuckets.map((b) => ({ bucket: b, ...bucketMap.get(b)! }));
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
  const [hiddenPvKeys, setHiddenPvKeys] = useState<Set<string>>(new Set());
  const [hiddenRefKeys, setHiddenRefKeys] = useState<Set<string>>(new Set());
  const [queryRange, setQueryRange] = useState<{ start: Date; end: Date } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { days } = getRange(range);
    const { qs, start, end } = buildQueryString(days);
    setQueryRange({ start, end });

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

  const { granMinutes } = getRange(range);

  // Take top 15 by total views for the chart
  const topPvSeries = [...pageViews].sort((a, b) => b.total - a.total).slice(0, MAX_SERIES);
  const topRefSeries = [...referrers].sort((a, b) => b.total - a.total).slice(0, MAX_SERIES);

  const togglePvKey = (key: string) => {
    setHiddenPvKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleRefKey = (key: string) => {
    setHiddenRefKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allBuckets = queryRange
    ? generateAllBuckets(queryRange.start, queryRange.end, granMinutes)
    : [];
  const pvChartData = mergeTimeSeries(topPvSeries, (s) => s.path, allBuckets, granMinutes);
  const refChartData = mergeTimeSeries(topRefSeries, (s) => s.source, allBuckets, granMinutes);

  const totalViews = pageViews.reduce((sum, s) => sum + s.total, 0);
  const totalReferrers = referrers.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-8 p-6">
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
              <Legend
                wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                onClick={(e) => togglePvKey(e.dataKey as string)}
                formatter={(value: string) => (
                  <span style={{ color: hiddenPvKeys.has(value) ? '#ccc' : undefined }}>
                    {value}
                  </span>
                )}
              />
              {topPvSeries.map((s, i) => (
                <Line
                  key={s.path}
                  type="monotone"
                  dataKey={s.path}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  hide={hiddenPvKeys.has(s.path)}
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
              <Legend
                wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                onClick={(e) => toggleRefKey(e.dataKey as string)}
                formatter={(value: string) => (
                  <span style={{ color: hiddenRefKeys.has(value) ? '#ccc' : undefined }}>
                    {value}
                  </span>
                )}
              />
              {topRefSeries.map((s, i) => (
                <Line
                  key={s.source}
                  type="monotone"
                  dataKey={s.source}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  hide={hiddenRefKeys.has(s.source)}
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

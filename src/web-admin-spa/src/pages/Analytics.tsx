import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { TrendingUp, Eye, FileText } from 'lucide-react';

import { usePageViews, useTopPages } from '@/hooks/useAnalytics';
import { formatNumber } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { DateRangePicker, type DateRange } from '@/components/analytics/DateRangePicker';
import { PageViewChart } from '@/components/analytics/PageViewChart';
import { TopPagesTable } from '@/components/analytics/TopPagesTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30).toISOString(),
    end: new Date().toISOString(),
  });

  const params = useMemo(
    () => ({
      start: dateRange.start,
      end: dateRange.end,
      granularity: 'hour' as const,
    }),
    [dateRange]
  );

  const { data: pageViews, isLoading: isLoadingViews } = usePageViews(params);
  const { data: topPages, isLoading: isLoadingTopPages } = useTopPages({
    ...params,
    limit: 10,
  });

  // Calculate total views
  const totalViews = useMemo(
    () => pageViews?.reduce((sum, pv) => sum + pv.count, 0) || 0,
    [pageViews]
  );

  // Calculate average daily views
  const avgDailyViews = useMemo(() => {
    if (!pageViews || pageViews.length === 0) return 0;
    const days = Math.ceil(
      (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return Math.round(totalViews / days);
  }, [pageViews, totalViews, dateRange]);

  // Calculate unique pages
  const uniquePages = topPages?.length || 0;

  return (
    <PageContainer
      title="Analytics"
      description="Track website traffic and content performance"
    >
      {/* Date Range Picker */}
      <div className="mb-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Page Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingViews ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-metric-large">{formatNumber(totalViews)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Daily Views
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingViews ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-metric-large">{formatNumber(avgDailyViews)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Pages
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingTopPages ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-metric-large">{uniquePages}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Page Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <PageViewChart data={pageViews || []} isLoading={isLoadingViews} />
        </CardContent>
      </Card>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <TopPagesTable pages={topPages || []} isLoading={isLoadingTopPages} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

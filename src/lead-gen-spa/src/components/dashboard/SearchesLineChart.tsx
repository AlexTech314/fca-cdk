import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchesOverTime } from '@/hooks/useDashboard';
import { fillTimeSeries } from '@/lib/utils';

interface SearchesLineChartProps {
  dateRange: '24h' | '7d' | '30d';
}

export function SearchesLineChart({ dateRange }: SearchesLineChartProps) {
  const params = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    switch (dateRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      granularity: 'hour' as const,
    };
  }, [dateRange]);

  const { data, isLoading } = useSearchesOverTime(params);

  const chartData = useMemo(() => {
    if (!data) return [];

    if (dateRange === '7d' || dateRange === '30d') {
      const filled = fillTimeSeries(data, params.startDate, params.endDate, 'day');
      return filled.map(point => ({
        name: new Date(point.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: point.value,
      }));
    }

    const filled = fillTimeSeries(data, params.startDate, params.endDate, 'hour');
    return filled.map(point => ({
      name: new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      }),
      value: point.value,
    }));
  }, [data, dateRange, params]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Searches Queried Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(216, 34%, 17%)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="hsl(215, 20%, 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(215, 20%, 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(224, 71%, 6%)',
                  border: '1px solid hsl(216, 34%, 17%)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(213, 31%, 91%)' }}
                itemStyle={{ color: 'hsl(262, 83%, 58%)' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(262, 83%, 58%)' }}
                name="Searches"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

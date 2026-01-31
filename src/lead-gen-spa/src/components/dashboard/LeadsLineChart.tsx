import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadsOverTime } from '@/hooks/useDashboard';

interface LeadsLineChartProps {
  dateRange: '24h' | '7d' | '30d';
}

export function LeadsLineChart({ dateRange }: LeadsLineChartProps) {
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

  const { data, isLoading } = useLeadsOverTime(params);

  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Aggregate by day for 7d and 30d views
    if (dateRange === '7d' || dateRange === '30d') {
      const byDay: Record<string, number> = {};
      data.forEach(point => {
        const day = new Date(point.timestamp).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        byDay[day] = (byDay[day] || 0) + point.value;
      });
      return Object.entries(byDay).map(([name, value]) => ({ name, value }));
    }
    
    // Hourly for 24h
    return data.map(point => ({
      name: new Date(point.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric',
        hour12: true,
      }),
      value: point.value,
    }));
  }, [data, dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads Created Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                itemStyle={{ color: 'hsl(217, 91%, 60%)' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fill="url(#leadsGradient)"
                name="Leads"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

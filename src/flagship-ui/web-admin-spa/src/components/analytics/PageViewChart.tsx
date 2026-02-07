import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { PageViewData } from '@/types';

interface PageViewChartProps {
  data: PageViewData[];
  isLoading?: boolean;
}

export function PageViewChart({ data, isLoading }: PageViewChartProps) {
  if (isLoading) {
    return (
      <div className="h-[400px] bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground">Loading chart...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] bg-muted/50 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No data available</span>
      </div>
    );
  }

  // Aggregate data by day for cleaner display
  const aggregatedData = data.reduce<Record<string, number>>((acc, item) => {
    const day = format(new Date(item.timestamp), 'yyyy-MM-dd');
    acc[day] = (acc[day] || 0) + item.count;
    return acc;
  }, {});

  const chartData = Object.entries(aggregatedData).map(([date, count]) => ({
    date,
    views: count,
    displayDate: format(new Date(date), 'MMM d'),
  }));

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
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
            dataKey="displayDate"
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
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(224, 71%, 6%)',
              border: '1px solid hsl(216, 34%, 17%)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelStyle={{ color: 'hsl(213, 31%, 91%)' }}
            itemStyle={{ color: 'hsl(217, 91%, 60%)' }}
            formatter={(value: number) => [`${value} views`, 'Page Views']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorViews)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

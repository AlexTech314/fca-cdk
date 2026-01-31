import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessTypeDistribution } from '@/hooks/useDashboard';

const COLORS = [
  'hsl(217, 91%, 60%)',  // primary blue
  'hsl(142, 76%, 36%)',  // success green
  'hsl(38, 92%, 50%)',   // warning amber
  'hsl(0, 84%, 60%)',    // destructive red
  'hsl(280, 70%, 60%)',  // purple
  'hsl(180, 70%, 50%)',  // cyan
];

export function BusinessTypePieChart() {
  const { data, isLoading } = useBusinessTypeDistribution();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Type Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {data?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(224, 71%, 6%)',
                  border: '1px solid hsl(216, 34%, 17%)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(213, 31%, 91%)' }}
                formatter={(value: number, name: string) => [
                  `${value} leads`,
                  name,
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => {
                  const item = data?.find(d => d.name === value);
                  return (
                    <span style={{ color: 'hsl(213, 31%, 91%)', fontSize: '12px' }}>
                      {value} ({item?.percentage}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

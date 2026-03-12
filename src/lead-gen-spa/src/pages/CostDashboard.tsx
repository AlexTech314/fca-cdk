import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useCostSummary,
  useCostsByService,
  useCostsByResource,
  useCostsOverTime,
} from '@/hooks/useCosts';

type DateRange = '7d' | '30d' | 'mtd' | '60d';

function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const start = new Date(now);

  switch (range) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case 'mtd':
      start.setDate(1);
      break;
    case '60d':
      start.setDate(start.getDate() - 60);
      break;
  }

  return { start: start.toISOString().split('T')[0], end };
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
}

const SERVICE_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(47, 96%, 53%)',
  'hsl(339, 90%, 51%)',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(24, 95%, 53%)',
  'hsl(173, 80%, 40%)',
];

const SERVICE_FRIENDLY_NAMES: Record<string, string> = {
  AmazonEC2: 'EC2',
  AmazonRDS: 'RDS',
  AmazonS3: 'S3',
  AWSLambda: 'Lambda',
  AmazonCloudFront: 'CloudFront',
  AmazonRoute53: 'Route 53',
  AmazonECR: 'ECR',
  AmazonECS: 'ECS',
  AmazonSQS: 'SQS',
  AmazonSNS: 'SNS',
  AmazonCloudWatch: 'CloudWatch',
  AmazonDynamoDB: 'DynamoDB',
  AWSCodePipeline: 'CodePipeline',
  AWSCodeBuild: 'CodeBuild',
  AmazonCognito: 'Cognito',
  AmazonApiGateway: 'API Gateway',
  AWSSecretsManager: 'Secrets Manager',
  AWSSystemsManager: 'Systems Manager',
  AmazonElastiCache: 'ElastiCache',
  AWSGlue: 'Glue',
  AmazonAthena: 'Athena',
  AWSStepFunctions: 'Step Functions',
  AmazonVPC: 'VPC',
  AWSCloudFormation: 'CloudFormation',
  AmazonKinesisFirehose: 'Kinesis Firehose',
  AWSELB: 'ELB',
  AWSKeyManagementService: 'KMS',
  AWSXRay: 'X-Ray',
  AmazonGuardDuty: 'GuardDuty',
};

function friendlyName(service: string): string {
  return SERVICE_FRIENDLY_NAMES[service] || service.replace('Amazon', '').replace('AWS', '').trim();
}

export default function CostDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('mtd');
  const [selectedService, setSelectedService] = useState<string | undefined>();

  const { start, end } = useMemo(() => getDateRange(dateRange), [dateRange]);
  const granularity = dateRange === '60d' ? 'monthly' : 'daily';

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useCostSummary(start, end);
  const { data: byService, isLoading: serviceLoading } = useCostsByService(start, end);
  const { data: overTime, isLoading: timeLoading } = useCostsOverTime(start, end, granularity);
  const { data: byResource, isLoading: resourceLoading } = useCostsByResource(start, end, selectedService);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: 'mtd', label: 'Month to date' },
    { value: '30d', label: '30 days' },
    { value: '60d', label: '60 days' },
  ];

  const chartData = useMemo(() => {
    if (!overTime) return [];

    // Build a lookup from existing data
    const lookup = new Map<string, number>();
    for (const d of overTime) {
      lookup.set(d.date, d.cost);
    }

    // Fill all expected dates in the range
    const result: { name: string; cost: number }[] = [];
    const cursor = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const step = granularity === 'monthly' ? 'month' : 'day';

    while (cursor <= endDate) {
      const key = cursor.toISOString().split('T')[0];
      result.push({
        name: cursor.toLocaleDateString('en-US', {
          month: 'short',
          day: step === 'day' ? 'numeric' : undefined,
        }),
        cost: lookup.get(key) ?? 0,
      });
      if (step === 'month') {
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return result;
  }, [overTime, start, end, granularity]);

  const serviceChartData = useMemo(() => {
    if (!byService) return [];
    return byService
      .reduce<Array<{ service: string; cost: number }>>((acc, row) => {
        const existing = acc.find((r) => r.service === row.service);
        if (existing) {
          existing.cost += row.cost;
        } else {
          acc.push({ service: row.service, cost: row.cost });
        }
        return acc;
      }, [])
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [byService]);

  const percentChange = summary
    ? summary.previousPeriodCost > 0
      ? ((summary.totalCost - summary.previousPeriodCost) / summary.previousPeriodCost) * 100
      : 0
    : 0;

  // If the API returned an error (likely no data yet), show a friendly message
  if (summaryError) {
    return (
      <PageContainer title="AWS Cost Dashboard" description="Infrastructure cost monitoring">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Cost data is not available yet. CUR 2.0 data takes up to 24 hours to appear after initial setup.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="AWS Cost Dashboard"
      description="Infrastructure cost monitoring"
      actions={
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {dateRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => setDateRange(option.value)}
              className={cn(
                'h-7 px-3 text-xs',
                dateRange === option.value && 'bg-primary/10 text-primary'
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Cost</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCost(summary?.netCost ?? 0)}</div>
                {summary && summary.totalCost !== summary.netCost && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCost(summary.totalCost)} before credits
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projected Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCost(summary?.projectedMonthlyCost ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">based on daily run rate</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Previous Period</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCost(summary?.previousPeriodCost ?? 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Change</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                </span>
                <Badge variant={percentChange > 10 ? 'destructive' : percentChange < -5 ? 'default' : 'secondary'}>
                  {percentChange > 10 ? 'Up' : percentChange < -5 ? 'Down' : 'Stable'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Cost Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {timeLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 34%, 17%)" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="hsl(215, 20%, 65%)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(224, 71%, 6%)',
                      border: '1px solid hsl(216, 34%, 17%)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(213, 31%, 91%)' }}
                    formatter={(value: number) => [formatCost(value), 'Cost']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    fill="url(#costGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost by Service */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={serviceChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 34%, 17%)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="hsl(215, 20%, 65%)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="service"
                    stroke="hsl(215, 20%, 65%)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tickFormatter={(v) => friendlyName(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(224, 71%, 6%)',
                      border: '1px solid hsl(216, 34%, 17%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCost(value), 'Cost']}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {serviceChartData.map((_, i) => (
                      <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resource Details Table */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Line Items {selectedService && <Badge variant="secondary" className="ml-2">{selectedService}</Badge>}
            </CardTitle>
            {selectedService && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedService(undefined)}>
                Clear filter
              </Button>
            )}
          </div>
          {/* Service filter chips */}
          {serviceChartData.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {serviceChartData.map((s, i) => (
                <Button
                  key={s.service}
                  variant={selectedService === s.service ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setSelectedService(selectedService === s.service ? undefined : s.service)}
                >
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SERVICE_COLORS[i % SERVICE_COLORS.length] }}
                  />
                  {friendlyName(s.service)}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {resourceLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Usage Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(byResource || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No cost data available for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (byResource || []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {friendlyName(row.service ?? '')}
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[200px] truncate" title={row.resourceId}>
                          {row.resourceId || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={row.usageType}>
                          {row.usageType || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate" title={row.description}>
                          {row.description || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatCost(row.cost)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

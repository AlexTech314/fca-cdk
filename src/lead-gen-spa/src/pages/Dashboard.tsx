import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { LeadsLineChart } from '@/components/dashboard/LeadsLineChart';
import { CampaignsLineChart } from '@/components/dashboard/CampaignsLineChart';
import { BusinessTypePieChart } from '@/components/dashboard/BusinessTypePieChart';
import { LocationPieChart } from '@/components/dashboard/LocationPieChart';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DateRange = '24h' | '7d' | '30d';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ];

  return (
    <PageContainer 
      title="Dashboard"
      description="Overview of your lead generation activity"
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
      {/* Stats Cards */}
      <StatsCards />

      {/* Line Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LeadsLineChart dateRange={dateRange} />
        <CampaignsLineChart dateRange={dateRange} />
      </div>

      {/* Pie Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BusinessTypePieChart />
        <LocationPieChart />
      </div>
    </PageContainer>
  );
}

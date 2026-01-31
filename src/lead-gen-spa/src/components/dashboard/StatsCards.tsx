import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useDashboard';
import { formatNumber } from '@/lib/utils';
import { Users, Target, CheckCircle, Download } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label">{label}</p>
            <p className="text-metric-large mt-1">{formatNumber(value)}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-32 mt-2" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Total Leads', value: data?.totalLeads || 0, icon: <Users className="h-6 w-6" /> },
    { label: 'Campaigns Run', value: data?.campaignsRun || 0, icon: <Target className="h-6 w-6" /> },
    { label: 'Qualified Leads', value: data?.qualifiedLeads || 0, icon: <CheckCircle className="h-6 w-6" /> },
    { label: 'Exports', value: data?.exports || 0, icon: <Download className="h-6 w-6" /> },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  Trophy,
  FileText,
  Users,
  Inbox,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboard';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  href: string;
  isLoading: boolean;
}

function StatCard({ title, value, icon, href, isLoading }: StatCardProps) {
  return (
    <Link to={href}>
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-metric-large">{formatNumber(value || 0)}</div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'tombstone':
      return <Trophy className="h-4 w-4" />;
    case 'blog_post':
      return <FileText className="h-4 w-4" />;
    case 'subscriber':
      return <Users className="h-4 w-4" />;
    case 'intake':
      return <Inbox className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
}

function getActivityBadgeVariant(action: string) {
  switch (action) {
    case 'created':
      return 'success';
    case 'updated':
      return 'default';
    case 'published':
      return 'default';
    case 'deleted':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();

  return (
    <PageContainer
      title="Dashboard"
      description="Overview of your website content and activity"
    >
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Published Tombstones"
          value={stats?.totalTombstones}
          icon={<Trophy className="h-4 w-4" />}
          href="/tombstones"
          isLoading={statsLoading}
        />
        <StatCard
          title="Published Blog Posts"
          value={stats?.totalBlogPosts}
          icon={<FileText className="h-4 w-4" />}
          href="/blog-posts"
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Subscribers"
          value={stats?.totalSubscribers}
          icon={<Users className="h-4 w-4" />}
          href="/subscribers"
          isLoading={statsLoading}
        />
        <StatCard
          title="Intakes This Week"
          value={stats?.intakesThisWeek}
          icon={<Inbox className="h-4 w-4" />}
          href="/intakes"
          isLoading={statsLoading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link to="/analytics">
              <Button variant="ghost" size="sm">
                View analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {getActivityIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={getActivityBadgeVariant(item.action) as "default" | "secondary" | "destructive" | "success" | "warning" | "outline"}
                          className="text-xs"
                        >
                          {item.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/tombstones/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Add Tombstone
              </Button>
            </Link>
            <Link to="/blog-posts/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Add Blog Post
              </Button>
            </Link>
            <Link to="/email/compose" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Compose Email
              </Button>
            </Link>
            <Link to="/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

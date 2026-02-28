import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useUsage, useUsageLimits } from '@/hooks/useUsage';
import { getUserInitials } from '@/lib/auth';
import { formatNumber, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { user, organizationName } = useAuth();
  const { data: usage } = useUsage();
  const { data: limits } = useUsageLimits();

  const usageItems = usage && limits ? [
    {
      label: 'Leads This Month',
      used: usage.leadsThisMonth,
      limit: limits.leadsPerMonth,
    },
    {
      label: 'Exports This Month',
      used: usage.exportsThisMonth,
      limit: limits.exportsPerMonth,
    },
    {
      label: 'AI Qualifications',
      used: usage.qualificationsThisMonth,
      limit: limits.qualificationsPerMonth,
    },
  ] : [];

  return (
    <PageContainer 
      title="Settings"
      description="Manage your account and organization settings"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {user && (
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {user.email}
                  </h3>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className="mt-2"
                  >
                    {user.role}
                  </Badge>
                </div>
              </div>
            )}

            <Separator className="my-6" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since</span>
                <span>{user ? formatDate(user.createdAt) : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold">{organizationName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your organization's lead generation account
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Limits */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {usage && limits ? (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Billing period: {formatDate(usage.periodStart)} - {formatDate(usage.periodEnd)}
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {usageItems.map((item) => {
                  const percentage = (item.used / item.limit) * 100;
                  const isWarning = percentage >= 80;
                  const isDanger = percentage >= 95;

                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono">
                          {formatNumber(item.used)} / {formatNumber(item.limit)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isDanger
                              ? 'bg-destructive'
                              : isWarning
                              ? 'bg-warning'
                              : 'bg-primary'
                          )}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {percentage.toFixed(0)}% used
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Loading usage data...</div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

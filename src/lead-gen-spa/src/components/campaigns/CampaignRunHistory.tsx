import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CampaignRun } from '@/types';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface CampaignRunHistoryProps {
  runs: CampaignRun[];
  isLoading: boolean;
}

function StatusBadge({ status }: { status: CampaignRun['status'] }) {
  const config = {
    pending: { icon: Clock, className: 'bg-muted text-muted-foreground' },
    running: { icon: Loader2, className: 'bg-primary/20 text-primary' },
    completed: { icon: CheckCircle, className: 'bg-success/20 text-success' },
    failed: { icon: XCircle, className: 'bg-destructive/20 text-destructive' },
  };

  const { icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function CampaignRunHistory({ runs, isLoading }: CampaignRunHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No runs yet. Click "Run Now" to start your first campaign run.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run #</TableHead>
          <TableHead>Started At</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Queries</TableHead>
          <TableHead>Leads Found</TableHead>
          <TableHead>Duplicates</TableHead>
          <TableHead>Errors</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, index) => (
          <TableRow key={run.id}>
            <TableCell className="font-mono font-semibold">
              #{runs.length - index}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(run.startedAt)}
            </TableCell>
            <TableCell>
              <StatusBadge status={run.status} />
            </TableCell>
            <TableCell className="font-mono">
              {run.queriesExecuted} / {run.queriesTotal}
            </TableCell>
            <TableCell className="font-mono text-success">
              {formatNumber(run.leadsFound)}
            </TableCell>
            <TableCell className="font-mono text-muted-foreground">
              {formatNumber(run.duplicatesSkipped)}
            </TableCell>
            <TableCell className="font-mono">
              {run.errors > 0 ? (
                <span className="text-destructive">{run.errors}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

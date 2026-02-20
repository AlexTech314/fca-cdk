import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { api } from '@/lib/api';
import type { FargateTask, FargateTaskType, FargateTaskStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StopCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const TASK_TYPE_LABELS: Record<FargateTaskType, string> = {
  places_search: 'Places Search',
  web_scrape: 'Web Scrape',
  ai_scoring: 'AI Scoring',
};

const STATUS_COLORS: Record<FargateTaskStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  completed: 'bg-green-500/20 text-green-600 dark:text-green-400',
  failed: 'bg-red-500/20 text-red-600 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground',
};

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  const start = startedAt ? new Date(startedAt).getTime() : null;
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (!start) return '—';
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function truncateArn(arn: string | null): string {
  if (!arn) return '—';
  const parts = arn.split('/');
  return parts[parts.length - 1] || arn.slice(-12);
}

export default function Tasks() {
  const [tasks, setTasks] = useState<FargateTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FargateTaskType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FargateTaskStatus | 'all'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const hasRunningTasks = tasks.some((t) => t.status === 'running' || t.status === 'pending');

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.listTasks({
        page,
        limit: 25,
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setTasks(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!hasRunningTasks) return;
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [hasRunningTasks, fetchTasks]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await api.cancelTask(id);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to cancel task:', err);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <PageContainer
      title="Tasks"
      description={total > 0 ? `${total} task${total === 1 ? '' : 's'} found` : 'Pipeline tasks (places, scrape, scoring)'}
      actions={
        <Button variant="outline" size="sm" onClick={() => fetchTasks()} disabled={isLoading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type</span>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as FargateTaskType | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(Object.keys(TASK_TYPE_LABELS) as FargateTaskType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TASK_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as FargateTaskStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Task ARN</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading tasks...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{TASK_TYPE_LABELS[task.type]}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('font-normal', STATUS_COLORS[task.status])}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.startedAt ? new Date(task.startedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{formatDuration(task.startedAt, task.completedAt)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {truncateArn(task.taskArn)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground" title={task.errorMessage ?? undefined}>
                    {task.errorMessage ?? '—'}
                  </TableCell>
                  <TableCell>
                    {(task.status === 'running' || task.status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancel(task.id)}
                        disabled={cancellingId === task.id}
                      >
                        <StopCircle className="mr-1 h-4 w-4" />
                        {cancellingId === task.id ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

import { useState } from 'react';
import { Download, Loader2, MoreHorizontal, Eye } from 'lucide-react';

import type { SellerIntake } from '@/types';
import { useIntakes, useUpdateIntakeStatus, useExportIntakes } from '@/hooks/useIntakes';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const statusColors: Record<SellerIntake['status'], 'default' | 'secondary' | 'success' | 'outline'> = {
  new: 'default',
  contacted: 'secondary',
  qualified: 'success',
  closed: 'outline',
};

const statusLabels: Record<SellerIntake['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  closed: 'Closed',
};

export default function SellerIntakes() {
  const { data: intakes, isLoading } = useIntakes();
  const updateStatusMutation = useUpdateIntakeStatus();
  const exportMutation = useExportIntakes();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingIntake, setViewingIntake] = useState<SellerIntake | null>(null);

  // Apply filters
  const filteredIntakes = intakes?.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = async (id: string, status: SellerIntake['status']) => {
    try {
      await updateStatusMutation.mutateAsync({ id, input: { status } });
      toast({
        title: 'Updated',
        description: `Status changed to ${statusLabels[status]}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync();
      toast({
        title: 'Exported',
        description: 'Intakes have been exported to CSV.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export intakes.',
        variant: 'destructive',
      });
    }
  };

  // Count by status
  const statusCounts = intakes?.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  return (
    <PageContainer
      title="Seller Intakes"
      description="Manage seller intake form submissions"
      actions={
        <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      }
    >
      {/* Status Summary */}
      <div className="flex gap-2 mb-6">
        {Object.entries(statusLabels).map(([status, label]) => (
          <Badge
            key={status}
            variant={statusColors[status as SellerIntake['status']]}
            className="text-sm py-1 px-3"
          >
            {label}: {statusCounts[status] || 0}
          </Badge>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredIntakes && filteredIntakes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIntakes.map((intake) => (
              <TableRow key={intake.id}>
                <TableCell className="font-medium">
                  {intake.name || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {intake.companyName || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{intake.email}</TableCell>
                <TableCell>
                  {intake.phone || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{formatDate(intake.createdAt)}</TableCell>
                <TableCell>
                  <Select
                    value={intake.status}
                    onValueChange={(v) => handleStatusChange(intake.id, v as SellerIntake['status'])}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <Badge variant={statusColors[intake.status]}>
                        {statusLabels[intake.status]}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setViewingIntake(intake)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No intakes found.</p>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewingIntake} onOpenChange={() => setViewingIntake(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Intake Details</DialogTitle>
          </DialogHeader>
          {viewingIntake && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{viewingIntake.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{viewingIntake.companyName || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingIntake.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{viewingIntake.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusColors[viewingIntake.status]}>
                    {statusLabels[viewingIntake.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDate(viewingIntake.createdAt)}</p>
                </div>
              </div>
              {viewingIntake.message && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Message</p>
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    {viewingIntake.message}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

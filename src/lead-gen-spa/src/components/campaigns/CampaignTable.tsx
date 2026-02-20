import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CampaignWithStats } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils';
import { MoreHorizontal, Edit, Play, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStartCampaignRun, useDeleteCampaign } from '@/hooks/useCampaigns';
import { toast } from '@/hooks/use-toast';
import { RunCampaignDialog } from './RunCampaignDialog';

interface CampaignTableProps {
  data: CampaignWithStats[];
  isLoading: boolean;
}

export function CampaignTable({ data, isLoading }: CampaignTableProps) {
  const { canWrite } = useAuth();
  const navigate = useNavigate();
  const startRunMutation = useStartCampaignRun();
  const deleteMutation = useDeleteCampaign();
  const [runDialogCampaign, setRunDialogCampaign] = useState<CampaignWithStats | null>(null);
  const [deleteDialogCampaign, setDeleteDialogCampaign] = useState<CampaignWithStats | null>(null);

  const handleStartRun = async () => {
    if (!runDialogCampaign) return;
    try {
      await startRunMutation.mutateAsync(runDialogCampaign.id);
      setRunDialogCampaign(null);
      navigate(`/campaigns/${runDialogCampaign.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start campaign run';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialogCampaign) return;
    try {
      await deleteMutation.mutateAsync(deleteDialogCampaign.id);
      setDeleteDialogCampaign(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete campaign';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Queries</TableHead>
            <TableHead>Total Leads</TableHead>
            <TableHead>Runs</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No campaigns yet. Create your first campaign to get started.
              </TableCell>
            </TableRow>
          ) : (
            data.map((campaign) => (
              <TableRow key={campaign.id} className="hover:bg-muted/50">
                <TableCell>
                  <Link 
                    to={`/campaigns/${campaign.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {campaign.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">
                    {campaign.queries.length}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {formatNumber(campaign.totalLeads)}
                </TableCell>
                <TableCell className="font-mono">
                  {campaign.runsCount}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {campaign.lastRunAt ? formatDate(campaign.lastRunAt) : 'Never'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(campaign.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/campaigns/${campaign.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {canWrite && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to={`/campaigns/${campaign.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRunDialogCampaign(campaign)}>
                            <Play className="mr-2 h-4 w-4" />
                            Run Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDialogCampaign(campaign)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {runDialogCampaign && (
        <RunCampaignDialog
          open={!!runDialogCampaign}
          onOpenChange={(open) => !open && setRunDialogCampaign(null)}
          campaign={runDialogCampaign}
          onConfirm={handleStartRun}
          isLoading={startRunMutation.isPending}
        />
      )}

      <Dialog open={!!deleteDialogCampaign} onOpenChange={(open) => !open && setDeleteDialogCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialogCampaign?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogCampaign(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

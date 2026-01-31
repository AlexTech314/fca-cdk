import { Link } from 'react-router-dom';
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
import type { CampaignWithStats } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils';
import { MoreHorizontal, Edit, Play, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CampaignTableProps {
  data: CampaignWithStats[];
  isLoading: boolean;
}

export function CampaignTable({ data, isLoading }: CampaignTableProps) {
  const { canWrite } = useAuth();

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
                          <DropdownMenuItem>
                            <Play className="mr-2 h-4 w-4" />
                            Run Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}

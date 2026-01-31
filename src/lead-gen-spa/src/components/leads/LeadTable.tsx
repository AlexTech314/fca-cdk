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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { QualificationBadge } from './QualificationBadge';
import type { Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import { ChevronUp, ChevronDown, Star, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeadTableProps {
  data: Lead[];
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sorting: {
    sort: string;
    order: 'asc' | 'desc';
  };
  onPageChange: (page: number) => void;
  onSortChange: (sort: string, order: 'asc' | 'desc') => void;
}

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (column: string, order: 'asc' | 'desc') => void;
}

function SortableHeader({ column, label, currentSort, currentOrder, onSort }: SortableHeaderProps) {
  const isActive = currentSort === column;
  
  const handleClick = () => {
    if (isActive) {
      onSort(column, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(column, 'desc');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {isActive && (
        currentOrder === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      )}
    </button>
  );
}

export function LeadTable({
  data,
  isLoading,
  pagination,
  sorting,
  onPageChange,
  onSortChange,
}: LeadTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  column="name"
                  label="Name"
                  currentSort={sorting.sort}
                  currentOrder={sorting.order}
                  onSort={onSortChange}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  column="city"
                  label="City"
                  currentSort={sorting.sort}
                  currentOrder={sorting.order}
                  onSort={onSortChange}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  column="state"
                  label="State"
                  currentSort={sorting.sort}
                  currentOrder={sorting.order}
                  onSort={onSortChange}
                />
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>
                <SortableHeader
                  column="rating"
                  label="Rating"
                  currentSort={sorting.sort}
                  currentOrder={sorting.order}
                  onSort={onSortChange}
                />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <SortableHeader
                  column="qualificationScore"
                  label="Score"
                  currentSort={sorting.sort}
                  currentOrder={sorting.order}
                  onSort={onSortChange}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  column="createdAt"
                  label="Added"
                  currentSort={sorting.sort}
                  currentOrder={sorting.order}
                  onSort={onSortChange}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No leads found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link 
                      to={`/leads/${lead.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.city || '-'}</TableCell>
                  <TableCell>
                    {lead.state && (
                      <Badge variant="outline">{lead.state}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {lead.phone || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Link <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.rating !== null ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-warning fill-warning" />
                        <span className="font-mono">{lead.rating}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.businessType && (
                      <Badge variant="secondary">{lead.businessType}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.qualificationScore !== null ? (
                      <QualificationBadge score={lead.qualificationScore} size="sm" />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total.toLocaleString()} leads
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

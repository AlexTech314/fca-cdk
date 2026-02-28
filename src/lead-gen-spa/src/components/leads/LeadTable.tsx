import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { PipelineStatusDot } from './PipelineStatusDot';
import { ScoreBadge } from './QualificationBadge';
import { ScrapedDataDialog } from './ScrapedDataDialog';
import type { Lead, LeadListField } from '@/types';
import { formatDate } from '@/lib/utils';
import { ChevronUp, ChevronDown, Star, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeadTableProps {
  data: Lead[];
  isLoading: boolean;
  visibleColumns: LeadListField[];
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
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAllOnPage?: (ids: string[], checked: boolean) => void;
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

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

function getStateAbbreviation(state: string): string {
  if (state.length === 2) return state.toUpperCase();
  return US_STATE_ABBREVIATIONS[state] ?? state;
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
  visibleColumns,
  pagination,
  sorting,
  selectedIds,
  onToggleRow,
  onToggleAllOnPage,
  onPageChange,
  onSortChange,
}: LeadTableProps) {
  const hasSelection = !!(selectedIds && onToggleRow && onToggleAllOnPage);
  const pageIds = data.map((l) => l.id);
  const allOnPageSelected = hasSelection && pageIds.length > 0 && pageIds.every((id) => selectedIds!.has(id));
  const someOnPageSelected = hasSelection && pageIds.some((id) => selectedIds!.has(id));
  const columnDefs: Record<
    LeadListField,
    {
      label: string;
      sortColumn?: string;
      headClassName?: string;
      cellClassName?: string;
      renderCell: (lead: Lead) => ReactNode;
    }
  > = {
    name: {
      label: 'Name',
      sortColumn: 'name',
      renderCell: (lead) => (
        <>
          <div className="flex items-center gap-1.5">
            <PipelineStatusDot status={lead.pipelineStatus} />
            <Link
              to={`/leads/${lead.id}`}
              className="font-medium text-primary hover:underline"
            >
              {lead.name}
            </Link>
          </div>
          {lead.franchise && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Location of: {lead.franchise.displayName ?? lead.franchise.name}
            </div>
          )}
        </>
      ),
    },
    city: {
      label: 'City',
      sortColumn: 'city',
      cellClassName: 'text-muted-foreground',
      renderCell: (lead) => lead.city || '-',
    },
    state: {
      label: 'State',
      sortColumn: 'state',
      renderCell: (lead) => (lead.state ? <Badge variant="outline">{getStateAbbreviation(lead.state)}</Badge> : <span className="text-muted-foreground">-</span>),
    },
    phone: {
      label: 'Phone',
      headClassName: 'min-w-[150px]',
      cellClassName: 'font-mono text-sm min-w-[150px] whitespace-nowrap',
      renderCell: (lead) => lead.phone || <span className="text-muted-foreground">-</span>,
    },
    emails: {
      label: 'Emails',
      headClassName: 'min-w-[200px]',
      cellClassName: 'text-sm min-w-[200px]',
      renderCell: (lead) =>
        lead.emails?.length ? (
          <div className="flex flex-wrap items-center gap-1">
            <a href={`mailto:${lead.emails[0]}`} className="inline-flex">
              <Badge variant="secondary" className="text-xs font-normal hover:bg-accent cursor-pointer whitespace-nowrap">
                {lead.emails[0]}
              </Badge>
            </a>
            {lead.emails.length > 1 && (
              <Badge variant="outline" className="text-xs font-normal shrink-0">
                +{lead.emails.length - 1}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    website: {
      label: 'Website',
      renderCell: (lead) =>
        lead.website ? (
          <a
            href={lead.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Site <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    googleMaps: {
      label: 'Maps',
      renderCell: (lead) =>
        lead.googleMapsUri ? (
          <a
            href={lead.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Maps <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    rating: {
      label: 'Rating',
      sortColumn: 'rating',
      renderCell: (lead) =>
        lead.rating !== null ? (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-warning fill-warning" />
            <span className="font-mono">{lead.rating}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    businessType: {
      label: 'Type',
      headClassName: 'min-w-[120px]',
      cellClassName: 'min-w-[120px]',
      renderCell: (lead) =>
        lead.businessType ? <Badge variant="secondary">{lead.businessType}</Badge> : <span className="text-muted-foreground">-</span>,
    },
    scrapedData: {
      label: 'Scraped Data',
      headClassName: 'text-center',
      cellClassName: 'text-center',
      renderCell: (lead) => (
        <ScrapedDataDialog
          leadId={lead.id}
          leadName={lead.name}
          hasData={!!lead.webScrapedAt}
        />
      ),
    },
    businessQualityScore: {
      label: 'Business Quality',
      sortColumn: 'businessQualityScore',
      headClassName: 'text-center',
      cellClassName: 'text-center',
      renderCell: (lead) =>
        lead.businessQualityScore != null && lead.businessQualityScore !== -1 ? (
          <ScoreBadge score={lead.businessQualityScore} size="sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    sellLikelihoodScore: {
      label: 'Sell Likelihood',
      sortColumn: 'sellLikelihoodScore',
      headClassName: 'text-center',
      cellClassName: 'text-center',
      renderCell: (lead) =>
        lead.sellLikelihoodScore != null && lead.sellLikelihoodScore !== -1 ? (
          <ScoreBadge score={lead.sellLikelihoodScore} size="sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    webScrapedAt: {
      label: 'Scraped',
      sortColumn: 'webScrapedAt',
      cellClassName: 'text-muted-foreground text-sm',
      renderCell: (lead) => (lead.webScrapedAt ? formatDate(lead.webScrapedAt) : '—'),
    },
    createdAt: {
      label: 'Added',
      sortColumn: 'createdAt',
      cellClassName: 'text-muted-foreground text-sm',
      renderCell: (lead) => formatDate(lead.createdAt),
    },
  };

  const activeColumns = visibleColumns.filter((key) => columnDefs[key]);

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
              {hasSelection && (
                <TableHead className="w-12 min-w-12 !p-0">
                  <div className="flex h-full w-full items-center justify-center">
                    <Checkbox
                      checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                      onCheckedChange={(checked) => onToggleAllOnPage!(pageIds, checked === true)}
                      aria-label="Select all on page"
                    />
                  </div>
                </TableHead>
              )}
              {activeColumns.map((columnKey) => {
                const column = columnDefs[columnKey];
                return (
                  <TableHead key={columnKey} className={column.headClassName}>
                    {column.sortColumn ? (
                      <SortableHeader
                        column={column.sortColumn}
                        label={column.label}
                        currentSort={sorting.sort}
                        currentOrder={sorting.order}
                        onSort={onSortChange}
                      />
                    ) : (
                      column.label
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(activeColumns.length + (hasSelection ? 1 : 0), 1)} className="text-center text-muted-foreground py-8">
                  No leads found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((lead) => {
                const isSelected = hasSelection && selectedIds!.has(lead.id);
                return (
                  <TableRow key={lead.id} data-state={isSelected ? 'selected' : undefined} className={isSelected ? 'bg-muted/80' : 'hover:bg-muted/50'}>
                    {hasSelection && (
                      <TableCell className="w-12 min-w-12 !p-0">
                        <div className="flex h-full w-full items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleRow!(lead.id)}
                            aria-label={`Select ${lead.name}`}
                          />
                        </div>
                      </TableCell>
                    )}
                    {activeColumns.map((columnKey) => {
                      const column = columnDefs[columnKey];
                      return (
                        <TableCell key={`${lead.id}-${columnKey}`} className={column.cellClassName}>
                          {column.renderCell(lead)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
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

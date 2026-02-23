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
import { QualificationBadge } from './QualificationBadge';
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
  onPageChange,
  onSortChange,
}: LeadTableProps) {
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
          <Link
            to={`/leads/${lead.id}`}
            className="font-medium text-primary hover:underline"
          >
            {lead.name}
          </Link>
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
      headClassName: 'min-w-[180px]',
      cellClassName: 'text-sm min-w-[180px]',
      renderCell: (lead) =>
        lead.emails?.length ? (
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            {lead.emails.slice(0, 2).map((email, i) => (
              <span key={email} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">,</span>}
                <a
                  href={`mailto:${email}`}
                  className="text-primary hover:underline truncate max-w-[140px]"
                  title={email}
                >
                  {email}
                </a>
              </span>
            ))}
            {lead.emails.length > 2 && (
              <Badge variant="secondary" className="text-xs font-normal shrink-0">
                +{lead.emails.length - 2}
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
        lead.website || lead.googleMapsUri ? (
          <div className="flex flex-col gap-1">
            {lead.website ? (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Site <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {lead.googleMapsUri ? (
              <a
                href={lead.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
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
      headClassName: 'min-w-[180px]',
      cellClassName: 'min-w-[180px]',
      renderCell: (lead) =>
        lead.businessType ? <Badge variant="secondary">{lead.businessType}</Badge> : <span className="text-muted-foreground">-</span>,
    },
    qualificationScore: {
      label: 'Score',
      sortColumn: 'qualificationScore',
      renderCell: (lead) =>
        lead.qualificationScore !== null ? (
          <QualificationBadge score={lead.qualificationScore} size="sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    headcountEstimate: {
      label: 'Headcount',
      sortColumn: 'headcountEstimate',
      cellClassName: 'text-muted-foreground text-sm font-mono',
      renderCell: (lead) => (lead.headcountEstimate != null ? lead.headcountEstimate : '—'),
    },
    foundedYear: {
      label: 'Founded',
      sortColumn: 'foundedYear',
      cellClassName: 'text-muted-foreground text-sm',
      renderCell: (lead) => lead.foundedYear ?? '—',
    },
    yearsInBusiness: {
      label: 'Years',
      sortColumn: 'yearsInBusiness',
      cellClassName: 'text-muted-foreground text-sm',
      renderCell: (lead) => (lead.yearsInBusiness != null ? lead.yearsInBusiness : '—'),
    },
    hasAcquisitionSignal: {
      label: 'Acquisition',
      renderCell: (lead) =>
        lead.hasAcquisitionSignal ? (
          <Badge variant="secondary" className="text-xs">Yes</Badge>
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
                <TableCell colSpan={Math.max(activeColumns.length, 1)} className="text-center text-muted-foreground py-8">
                  No leads found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  {activeColumns.map((columnKey) => {
                    const column = columnDefs[columnKey];
                    return (
                      <TableCell key={`${lead.id}-${columnKey}`} className={column.cellClassName}>
                        {column.renderCell(lead)}
                      </TableCell>
                    );
                  })}
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

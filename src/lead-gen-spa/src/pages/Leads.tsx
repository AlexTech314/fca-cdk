import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { Button } from '@/components/ui/button';
import { useLeads, defaultLeadQueryParams } from '@/hooks/useLeads';
import type { LeadFilters as LeadFiltersType, LeadListField, LeadQueryParams } from '@/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DEFAULT_LEAD_COLUMNS,
  LEAD_COLUMNS_STORAGE_KEY,
  LEAD_COLUMN_OPTIONS,
} from '@/lib/leads/columns';
import { Filter, TableProperties, X } from 'lucide-react';

function loadColumnSelection(): LeadListField[] {
  if (typeof window === 'undefined') return DEFAULT_LEAD_COLUMNS;
  try {
    const raw = window.localStorage.getItem(LEAD_COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_LEAD_COLUMNS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LEAD_COLUMNS;
    const allowed = new Set(LEAD_COLUMN_OPTIONS.map((c) => c.key));
    const cleaned = parsed.filter((v): v is LeadListField => typeof v === 'string' && allowed.has(v as LeadListField));
    return cleaned.length > 0 ? cleaned : DEFAULT_LEAD_COLUMNS;
  } catch {
    return DEFAULT_LEAD_COLUMNS;
  }
}

export default function Leads() {
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<LeadListField[]>(() => loadColumnSelection());
  const [queryParams, setQueryParams] = useState<LeadQueryParams>(() => ({
    ...defaultLeadQueryParams,
    fields: loadColumnSelection(),
  }));

  const { data, isLoading } = useLeads(queryParams);

  const handleFiltersChange = (filters: LeadFiltersType) => {
    setQueryParams(prev => ({ ...prev, filters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  };

  const handleSortChange = (sort: string, order: 'asc' | 'desc') => {
    setQueryParams(prev => ({ ...prev, sort, order }));
  };

  const handleClearFilters = () => {
    setQueryParams(prev => ({ ...prev, filters: {}, page: 1 }));
  };

  const setColumns = (next: LeadListField[]) => {
    const ordered = LEAD_COLUMN_OPTIONS.map((c) => c.key).filter((key) => next.includes(key));
    const finalColumns = ordered.length > 0 ? ordered : DEFAULT_LEAD_COLUMNS;
    setVisibleColumns(finalColumns);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LEAD_COLUMNS_STORAGE_KEY, JSON.stringify(finalColumns));
    }
    setQueryParams((prev) => ({ ...prev, page: 1, fields: finalColumns }));
  };

  const handleToggleColumn = (column: LeadListField, checked: boolean) => {
    if (checked) {
      setColumns([...visibleColumns, column]);
      return;
    }
    setColumns(visibleColumns.filter((c) => c !== column));
  };

  const hasActiveFilters = Object.keys(queryParams.filters).length > 0;
  const selectedColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  return (
    <PageContainer 
      title="Leads"
      description={data ? `${data.total.toLocaleString()} leads found` : 'Loading leads...'}
      actions={
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear Filters
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <TableProperties className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LEAD_COLUMN_OPTIONS.map((column) => {
                const checked = selectedColumnSet.has(column.key);
                return (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={checked}
                    disabled={checked && visibleColumns.length === 1}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(value) => handleToggleColumn(column.key, value === true)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {Object.keys(queryParams.filters).length}
              </span>
            )}
          </Button>
        </div>
      }
    >
      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6">
          <LeadFilters 
            filters={queryParams.filters} 
            onChange={handleFiltersChange} 
          />
        </div>
      )}

      {/* Table */}
      <LeadTable
        data={data?.data || []}
        isLoading={isLoading}
        pagination={{
          page: queryParams.page,
          limit: queryParams.limit,
          total: data?.total || 0,
          totalPages: data?.totalPages || 0,
        }}
        sorting={{
          sort: queryParams.sort,
          order: queryParams.order,
        }}
        visibleColumns={visibleColumns}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
      />
    </PageContainer>
  );
}

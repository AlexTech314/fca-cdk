import { useCallback, useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { Button } from '@/components/ui/button';
import { useLeads, useScrapeLeadsBulk, useQualifyLeadsBulk, defaultLeadQueryParams } from '@/hooks/useLeads';
import { toast } from '@/hooks/use-toast';
import type { LeadFilters as LeadFiltersType, LeadListField, LeadQueryParams } from '@/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  DEFAULT_LEAD_COLUMNS,
  LEAD_COLUMNS_STORAGE_KEY,
  LEAD_COLUMN_OPTIONS,
} from '@/lib/leads/columns';
import { ChevronDown, Filter, Globe, Sparkles, TableProperties, X } from 'lucide-react';

type BulkAction = 'scrape' | 'score';

const BULK_ACTION_CONFIG: Record<BulkAction, { label: string; icon: typeof Globe; confirmTitle: string; confirmBody: (n: number) => string }> = {
  scrape: {
    label: 'Scrape',
    icon: Globe,
    confirmTitle: 'Confirm Bulk Scrape',
    confirmBody: (n) => `You are about to scrape ${n} lead${n !== 1 ? 's' : ''}. This will launch web scraping jobs for the selected leads.`,
  },
  score: {
    label: 'Score',
    icon: Sparkles,
    confirmTitle: 'Confirm Bulk Score',
    confirmBody: (n) => `You are about to score ${n} lead${n !== 1 ? 's' : ''}. This will run AI qualification on the selected leads.`,
  },
};

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

  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const { data, isLoading } = useLeads(queryParams);
  const scrapeBulk = useScrapeLeadsBulk();
  const qualifyBulk = useQualifyLeadsBulk();

  const handleStartBulkAction = useCallback((action: BulkAction) => {
    setBulkAction(action);
    setSelectedIds(new Set());
  }, []);

  const handleCancelBulkAction = useCallback(() => {
    setBulkAction(null);
    setSelectedIds(new Set());
  }, []);

  const handleConfirmBulkAction = useCallback(async () => {
    if (!bulkAction) return;
    setConfirmDialogOpen(false);

    const ids = [...selectedIds];
    const BATCH_SIZE = 20;
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    setBulkProgress({ current: 0, total: ids.length });

    try {
      let processed = 0;
      for (const batch of batches) {
        if (bulkAction === 'scrape') {
          await scrapeBulk.mutateAsync(batch);
        } else {
          await qualifyBulk.mutateAsync(batch);
        }
        processed += batch.length;
        setBulkProgress({ current: processed, total: ids.length });
      }
      toast({
        title: `Bulk ${bulkAction} complete`,
        description: `Successfully processed ${ids.length} lead${ids.length !== 1 ? 's' : ''}.`,
      });
    } catch (err) {
      toast({
        title: `Bulk ${bulkAction} failed`,
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setBulkProgress(null);
      setBulkAction(null);
      setSelectedIds(new Set());
    }
  }, [bulkAction, selectedIds, scrapeBulk, qualifyBulk]);

  const handleToggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAllOnPage = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

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
  const isSelecting = bulkAction !== null;
  const actionConfig = bulkAction ? BULK_ACTION_CONFIG[bulkAction] : null;

  const descriptionText = isSelecting && selectedIds.size > 0
    ? `${data?.total.toLocaleString() ?? '...'} leads found · ${selectedIds.size} selected`
    : data ? `${data.total.toLocaleString()} leads found` : 'Loading leads...';

  return (
    <PageContainer
      title="Leads"
      description={descriptionText}
      actions={
        <div className="flex items-center gap-2">
          {/* Actions group */}
          {isSelecting && actionConfig ? (
            <>
              <Button
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmDialogOpen(true)}
              >
                <actionConfig.icon className="mr-1.5 h-3.5 w-3.5" />
                {actionConfig.label} {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
              <button
                onClick={handleCancelBulkAction}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStartBulkAction('scrape')}>
                  <Globe className="mr-2 h-4 w-4" />
                  Scrape Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStartBulkAction('score')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Score Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="mx-1 h-6 w-px bg-border" />

          {/* View group */}
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
        selectedIds={isSelecting ? selectedIds : undefined}
        onToggleRow={isSelecting ? handleToggleRow : undefined}
        onToggleAllOnPage={isSelecting ? handleToggleAllOnPage : undefined}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
      />

      {/* Bulk Progress */}
      {bulkProgress && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-background p-4 shadow-lg">
          <p className="text-sm font-medium">
            Processing {bulkProgress.current} of {bulkProgress.total} leads...
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {actionConfig && (
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionConfig.confirmTitle}</DialogTitle>
              <DialogDescription>
                {actionConfig.confirmBody(selectedIds.size)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBulkAction}
                disabled={scrapeBulk.isPending || qualifyBulk.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}

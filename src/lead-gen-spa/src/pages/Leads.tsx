import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { Button } from '@/components/ui/button';
import { useLeads, useUpdateLead, useCreateLeadEmail, useUpdateLeadData, useDeleteLeadData, useScrapeLeadsBulk, useQualifyLeadsBulk, useScrapeAllByFilters, useQualifyAllByFilters, defaultLeadQueryParams } from '@/hooks/useLeads';
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

type BulkAction = 'scrape' | 'score' | 'scrape-all' | 'score-all';

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
  'scrape-all': {
    label: 'Scrape All',
    icon: Globe,
    confirmTitle: 'Confirm Scrape All',
    confirmBody: (n) => `You are about to scrape all ${n.toLocaleString()} lead${n !== 1 ? 's' : ''} matching your current filters. Leads without a website will be skipped.`,
  },
  'score-all': {
    label: 'Score All',
    icon: Sparkles,
    confirmTitle: 'Confirm Score All',
    confirmBody: (n) => `You are about to score all ${n.toLocaleString()} lead${n !== 1 ? 's' : ''} matching your current filters. Leads that haven't been scraped will be skipped.`,
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
  const updateLead = useUpdateLead();
  const createEmail = useCreateLeadEmail();
  const updateEmailData = useUpdateLeadData();
  const deleteEmailData = useDeleteLeadData();
  const scrapeBulk = useScrapeLeadsBulk();
  const qualifyBulk = useQualifyLeadsBulk();
  const scrapeAll = useScrapeAllByFilters();
  const qualifyAll = useQualifyAllByFilters();

  // ── Undo / Redo ──────────────────────────────────────────────
  type Patch = { name?: string; locationCityId?: number | null; locationStateId?: string | null; businessType?: string | null; phone?: string | null; website?: string | null; googleMapsUri?: string | null; rating?: number | null; reviewCount?: number | null };
  type UndoEntry =
    | { kind: 'field'; leadId: string; prev: Patch; next: Patch }
    | { kind: 'emailUpdate'; leadId: string; emailId: string; prev: string; next: string }
    | { kind: 'emailCreate'; leadId: string; emailId: string; value: string }
    | { kind: 'emailDelete'; leadId: string; emailId: string; value: string };

  const undoStackRef = useRef<UndoEntry[]>([]);
  const redoStackRef = useRef<UndoEntry[]>([]);

  const findLead = useCallback((id: string) => data?.data.find((l) => l.id === id), [data]);

  const mutateError = useCallback((title: string) => (err: Error) => {
    toast({ title, description: err instanceof Error ? err.message : 'An unexpected error occurred.', variant: 'destructive' });
  }, []);

  const applyPatch = useCallback((leadId: string, patch: Patch) => {
    updateLead.mutate({ id: leadId, data: patch }, { onError: mutateError('Failed to update lead') });
  }, [updateLead, mutateError]);

  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStackRef.current = [...undoStackRef.current, entry];
    redoStackRef.current = [];
  }, []);

  const describeEntry = useCallback((entry: UndoEntry, direction: 'undo' | 'redo'): string => {
    switch (entry.kind) {
      case 'field': {
        const patch = direction === 'undo' ? entry.next : entry.next;
        if (patch.name !== undefined) return `name to "${patch.name}"`;
        if (patch.locationCityId !== undefined) return 'city';
        if (patch.locationStateId !== undefined) return 'state';
        if (patch.businessType !== undefined) return `type to "${patch.businessType}"`;
        if (patch.phone !== undefined) return `phone to "${patch.phone}"`;
        if (patch.website !== undefined) return 'website';
        if (patch.googleMapsUri !== undefined) return 'maps URL';
        if (patch.rating !== undefined) return `rating to ${patch.rating}`;
        if (patch.reviewCount !== undefined) return `reviews to ${patch.reviewCount}`;
        return 'field';
      }
      case 'emailUpdate': return `email to "${direction === 'undo' ? entry.prev : entry.next}"`;
      case 'emailCreate': return `email "${entry.value}"`;
      case 'emailDelete': return `email "${entry.value}"`;
    }
  }, []);

  const applyEntry = useCallback((entry: UndoEntry, direction: 'undo' | 'redo') => {
    switch (entry.kind) {
      case 'field':
        applyPatch(entry.leadId, direction === 'undo' ? entry.prev : entry.next);
        break;
      case 'emailUpdate':
        updateEmailData.mutate(
          { type: 'email', id: entry.emailId, data: { value: direction === 'undo' ? entry.prev : entry.next } },
          { onError: mutateError('Failed to update email') },
        );
        break;
      case 'emailCreate':
        if (direction === 'undo') {
          deleteEmailData.mutate({ type: 'email', id: entry.emailId }, { onError: mutateError('Failed to delete email') });
        } else {
          createEmail.mutate({ leadId: entry.leadId, value: entry.value }, {
            onSuccess: (result) => { entry.emailId = result.id; },
            onError: mutateError('Failed to create email'),
          });
        }
        break;
      case 'emailDelete':
        if (direction === 'undo') {
          createEmail.mutate({ leadId: entry.leadId, value: entry.value }, {
            onSuccess: (result) => { entry.emailId = result.id; },
            onError: mutateError('Failed to create email'),
          });
        } else {
          deleteEmailData.mutate({ type: 'email', id: entry.emailId }, { onError: mutateError('Failed to delete email') });
        }
        break;
    }
  }, [applyPatch, updateEmailData, deleteEmailData, createEmail, mutateError]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, entry];
    applyEntry(entry, 'undo');
    const { dismiss } = toast({ title: `Undo: reverted ${describeEntry(entry, 'undo')}` });
    setTimeout(dismiss, 2000);
  }, [applyEntry, describeEntry]);

  const handleRedo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, entry];
    applyEntry(entry, 'redo');
    const { dismiss } = toast({ title: `Redo: changed ${describeEntry(entry, 'redo')}` });
    setTimeout(dismiss, 2000);
  }, [applyEntry, describeEntry]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z') return;
      // Don't intercept when user is typing in an input/contentEditable
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) return;
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ── Cell change handlers ─────────────────────────────────────
  const handleRenameLead = useCallback((id: string, name: string, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { name: lead?.name ?? '' }, next: { name } });
    updateLead.mutate({ id, data: { name } }, { onError: (err) => { onError(); mutateError('Failed to rename lead')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeCity = useCallback((id: string, cityId: number, _cityName: string, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { locationCityId: lead?.locationCity?.id ?? null }, next: { locationCityId: cityId } });
    updateLead.mutate({ id, data: { locationCityId: cityId } }, { onError: (err) => { onError(); mutateError('Failed to update city')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeState = useCallback((id: string, stateId: string, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { locationStateId: lead?.locationState?.id ?? null }, next: { locationStateId: stateId } });
    updateLead.mutate({ id, data: { locationStateId: stateId } }, { onError: (err) => { onError(); mutateError('Failed to update state')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeType = useCallback((id: string, type: string, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { businessType: lead?.businessType ?? null }, next: { businessType: type } });
    updateLead.mutate({ id, data: { businessType: type } }, { onError: (err) => { onError(); mutateError('Failed to update type')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangePhone = useCallback((id: string, phone: string, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { phone: lead?.phone ?? null }, next: { phone } });
    updateLead.mutate({ id, data: { phone } }, { onError: (err) => { onError(); mutateError('Failed to update phone')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeWebsite = useCallback((id: string, value: string | null, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { website: lead?.website ?? null }, next: { website: value } });
    updateLead.mutate({ id, data: { website: value } }, { onError: (err) => { onError(); mutateError('Failed to update website')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeMaps = useCallback((id: string, value: string | null, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { googleMapsUri: lead?.googleMapsUri ?? null }, next: { googleMapsUri: value } });
    updateLead.mutate({ id, data: { googleMapsUri: value } }, { onError: (err) => { onError(); mutateError('Failed to update maps URL')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeRating = useCallback((id: string, value: number | null, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { rating: lead?.rating ?? null }, next: { rating: value } });
    updateLead.mutate({ id, data: { rating: value } }, { onError: (err) => { onError(); mutateError('Failed to update rating')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  const handleChangeReviews = useCallback((id: string, value: number | null, onError: () => void) => {
    const lead = findLead(id);
    pushUndo({ kind: 'field', leadId: id, prev: { reviewCount: lead?.reviewCount ?? null }, next: { reviewCount: value } });
    updateLead.mutate({ id, data: { reviewCount: value } }, { onError: (err) => { onError(); mutateError('Failed to update reviews')(err as Error); } });
  }, [updateLead, findLead, pushUndo, mutateError]);

  // ── Email cell handlers ─────────────────────────────────
  const handleUpdateEmail = useCallback((leadId: string, emailId: string, value: string, onError: () => void) => {
    const lead = findLead(leadId);
    const prevValue = lead?.leadEmails?.find((e) => e.id === emailId)?.value ?? '';
    pushUndo({ kind: 'emailUpdate', leadId, emailId, prev: prevValue, next: value });
    updateEmailData.mutate(
      { type: 'email', id: emailId, data: { value } },
      { onError: (err) => { onError(); mutateError('Failed to update email')(err as Error); } },
    );
  }, [updateEmailData, findLead, pushUndo, mutateError]);

  const handleCreateEmail = useCallback((leadId: string, value: string, onError: () => void) => {
    const entry: UndoEntry = { kind: 'emailCreate', leadId, emailId: '', value };
    pushUndo(entry);
    createEmail.mutate(
      { leadId, value },
      {
        onSuccess: (result) => { entry.emailId = result.id; },
        onError: (err) => { onError(); mutateError('Failed to create email')(err as Error); },
      },
    );
  }, [createEmail, pushUndo, mutateError]);

  const handleDeleteEmail = useCallback((leadId: string, emailId: string, onError: () => void) => {
    const lead = findLead(leadId);
    const prevValue = lead?.leadEmails?.find((e) => e.id === emailId)?.value ?? '';
    pushUndo({ kind: 'emailDelete', leadId, emailId, value: prevValue });
    deleteEmailData.mutate(
      { type: 'email', id: emailId },
      { onError: (err) => { onError(); mutateError('Failed to delete email')(err as Error); } },
    );
  }, [deleteEmailData, findLead, pushUndo, mutateError]);

  const handleStartBulkAction = useCallback((action: BulkAction) => {
    setBulkAction(action);
    if (action === 'scrape-all' || action === 'score-all') {
      setConfirmDialogOpen(true);
    } else {
      setSelectedIds(new Set());
    }
  }, []);

  const handleCancelBulkAction = useCallback(() => {
    setBulkAction(null);
    setSelectedIds(new Set());
  }, []);

  const handleConfirmBulkAction = useCallback(async () => {
    if (!bulkAction) return;
    setConfirmDialogOpen(false);

    if (bulkAction === 'scrape-all' || bulkAction === 'score-all') {
      try {
        const mutation = bulkAction === 'scrape-all' ? scrapeAll : qualifyAll;
        const result = await mutation.mutateAsync(queryParams.filters);
        toast({
          title: `Queued ${result.queued.toLocaleString()} lead${result.queued !== 1 ? 's' : ''} for ${bulkAction === 'scrape-all' ? 'scraping' : 'scoring'}`,
          description: result.skipped > 0 ? `${result.skipped.toLocaleString()} skipped` : undefined,
        });
      } catch (err) {
        toast({
          title: `Bulk ${bulkAction} failed`,
          description: err instanceof Error ? err.message : 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setBulkAction(null);
      }
      return;
    }

    const ids = [...selectedIds];
    const BATCH_SIZE = 100;
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
        title: `Queued ${ids.length} lead${ids.length !== 1 ? 's' : ''} for ${bulkAction === 'scrape' ? 'scraping' : 'scoring'}`,
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
  }, [bulkAction, selectedIds, scrapeBulk, qualifyBulk, scrapeAll, qualifyAll, queryParams.filters]);

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
  const isAllAction = bulkAction === 'scrape-all' || bulkAction === 'score-all';
  const isSelecting = bulkAction !== null && !isAllAction;
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleStartBulkAction('scrape-all')}>
                  <Globe className="mr-2 h-4 w-4" />
                  Scrape All ({data?.total.toLocaleString() ?? '...'})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStartBulkAction('score-all')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Score All ({data?.total.toLocaleString() ?? '...'})
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
        onRenameLead={handleRenameLead}
        onChangeCity={handleChangeCity}
        onChangeState={handleChangeState}
        onChangeType={handleChangeType}
        onChangePhone={handleChangePhone}
        onChangeWebsite={handleChangeWebsite}
        onChangeMaps={handleChangeMaps}
        onChangeRating={handleChangeRating}
        onChangeReviews={handleChangeReviews}
        onUpdateEmail={handleUpdateEmail}
        onCreateEmail={handleCreateEmail}
        onDeleteEmail={handleDeleteEmail}
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
                {actionConfig.confirmBody(isAllAction ? (data?.total ?? 0) : selectedIds.size)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBulkAction}
                disabled={scrapeBulk.isPending || qualifyBulk.isPending || scrapeAll.isPending || qualifyAll.isPending}
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

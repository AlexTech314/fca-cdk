import { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiCombobox } from '@/components/ui/multi-combobox';
import type { ComboboxOption } from '@/components/ui/multi-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeadFilters as LeadFiltersType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onChange: (filters: LeadFiltersType) => void;
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  queued_for_scrape: 'Queued Scrape',
  scraping: 'Scraping',
  queued_for_deep_scrape: 'Queued Deep',
  deep_scraping: 'Deep Scraping',
  queued_for_scoring: 'Queued Score',
  scoring: 'Scoring',
  scrape_failed: 'Scrape Failed',
  scoring_failed: 'Score Failed',
};

const SOURCE_LABELS: Record<string, string> = {
  google_places: 'Google Places',
  manual: 'Manual',
  import: 'Import',
};

type TriStateValue = 'any' | 'yes' | 'no';

function boolToTriState(val: boolean | undefined): TriStateValue {
  if (val === true) return 'yes';
  if (val === false) return 'no';
  return 'any';
}

function triStateToBool(val: TriStateValue): boolean | undefined {
  if (val === 'yes') return true;
  if (val === 'no') return false;
  return undefined;
}

/** Hook: lazy query that fires on first open (or immediately if hasSelection), then caches via react-query */
function useLazyQuery<T>(key: string[], fn: () => Promise<T>, fallback: T, hasSelection = false) {
  const [enabled, setEnabled] = useState(hasSelection);
  const query = useQuery({ queryKey: key, queryFn: fn, enabled });
  const activate = useCallback((open: boolean) => { if (open && !enabled) setEnabled(true); }, [enabled]);
  return { data: query.data ?? fallback, isLoading: query.isLoading && enabled, activate };
}

export function LeadFilters({ filters, onChange }: LeadFiltersProps) {
  const states = useLazyQuery(['locations', 'states'], () => api.getLocationsStates(), [], !!filters.stateIds?.length);

  const businessTypes = useLazyQuery(
    ['leads', 'business-types'],
    async () => {
      const dist = await api.getBusinessTypeDistribution();
      return dist.map(d => d.name).filter(Boolean).sort();
    },
    [],
    !!filters.businessTypes?.length,
  );

  // Campaigns: server-side search with debounce
  const [campSearch, setCampSearch] = useState('');
  const campDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const campSearchQuery = useQuery({
    queryKey: ['campaigns', 'search', campSearch],
    queryFn: () => api.searchCampaigns(campSearch, 20),
    enabled: campSearch.length > 0,
  });
  const campInitialQuery = useQuery({
    queryKey: ['campaigns', 'search', ''],
    queryFn: () => api.searchCampaigns('', 20),
    enabled: false,
  });
  const campSelectedIds = filters.campaignIds || [];
  const campByIdsQuery = useQuery({
    queryKey: ['campaigns', 'byIds', campSelectedIds.join(',')],
    queryFn: () => api.getCampaignsByIds(campSelectedIds),
    enabled: campSelectedIds.length > 0,
  });
  const handleCampSearch = useCallback((q: string) => {
    clearTimeout(campDebounceRef.current);
    campDebounceRef.current = setTimeout(() => setCampSearch(q), 200);
  }, []);
  const handleCampOpen = useCallback((open: boolean) => {
    if (open && !campInitialQuery.data) campInitialQuery.refetch();
  }, [campInitialQuery]);
  const campSearchResults = (campSearch ? campSearchQuery.data : campInitialQuery.data) ?? [];
  const campSelectedLabels = campByIdsQuery.data ?? [];
  const campOptionsMap = new Map<string, ComboboxOption>();
  for (const c of [...campSelectedLabels, ...campSearchResults]) {
    if (!campOptionsMap.has(c.id)) campOptionsMap.set(c.id, { value: c.id, label: c.name });
  }
  const campOptions = [...campOptionsMap.values()];
  const campLoading = campSearch ? campSearchQuery.isLoading : campInitialQuery.isLoading;

  // Search queries: server-side search with debounce
  const [sqSearch, setSqSearch] = useState('');
  const sqDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sqSearchQuery = useQuery({
    queryKey: ['leads', 'search-queries', 'search', sqSearch],
    queryFn: () => api.searchSearchQueries(sqSearch, 20),
    enabled: sqSearch.length > 0,
  });
  // Fetch initial results on open (empty search)
  const sqInitialQuery = useQuery({
    queryKey: ['leads', 'search-queries', 'search', ''],
    queryFn: () => api.searchSearchQueries('', 20),
    enabled: false,
  });
  // Resolve labels for pre-selected IDs from URL
  const sqSelectedIds = filters.searchQueryIds || [];
  const sqByIdsQuery = useQuery({
    queryKey: ['leads', 'search-queries', 'byIds', sqSelectedIds.join(',')],
    queryFn: () => api.getSearchQueriesByIds(sqSelectedIds),
    enabled: sqSelectedIds.length > 0,
  });
  const handleSqSearch = useCallback((q: string) => {
    clearTimeout(sqDebounceRef.current);
    sqDebounceRef.current = setTimeout(() => setSqSearch(q), 200);
  }, []);
  const handleSqOpen = useCallback((open: boolean) => {
    if (open && !sqInitialQuery.data) sqInitialQuery.refetch();
  }, [sqInitialQuery]);
  // Merge: search results + selected label lookups (deduped)
  const sqSearchResults = (sqSearch ? sqSearchQuery.data : sqInitialQuery.data) ?? [];
  const sqSelectedLabels = sqByIdsQuery.data ?? [];
  const sqOptionsMap = new Map<string, ComboboxOption>();
  for (const q of [...sqSelectedLabels, ...sqSearchResults]) {
    if (!sqOptionsMap.has(q.id)) sqOptionsMap.set(q.id, { value: q.id, label: q.textQuery });
  }
  const sqOptions = [...sqOptionsMap.values()];
  const sqLoading = sqSearch ? sqSearchQuery.isLoading : sqInitialQuery.isLoading;

  const pipelineStatuses = useLazyQuery(['leads', 'pipeline-statuses'], () => api.getPipelineStatuses(), [], !!filters.pipelineStatuses?.length);
  const sources = useLazyQuery(['leads', 'sources'], () => api.getSources(), [], !!filters.sources?.length);
  const tiers = useLazyQuery(['leads', 'tiers'], () => api.getTiers(), [], !!filters.tiers?.length);

  const update = (updates: Partial<LeadFiltersType>) => {
    onChange({ ...filters, ...updates });
  };

  const stateOptions = states.data.map(s => ({ value: s.id, label: `${s.id} — ${s.name}` }));
  const businessTypeOptions = businessTypes.data.map(t => ({ value: t, label: t }));
  const pipelineStatusOptions = pipelineStatuses.data.map(s => ({ value: s, label: STATUS_LABELS[s] ?? s }));
  const sourceOptions = sources.data.map(s => ({ value: s, label: SOURCE_LABELS[s] ?? s }));
  const tierOptions = tiers.data.map(t => ({ value: String(t), label: `Tier ${t}` }));

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Row 1: Name + States + Business Types */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Business Name</Label>
            <Input
              placeholder="Search by name..."
              value={filters.name || ''}
              onChange={(e) => update({ name: e.target.value || undefined })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">States</Label>
            <MultiCombobox
              options={stateOptions}
              selected={filters.stateIds || []}
              onChange={(vals) => update({ stateIds: vals.length > 0 ? vals : undefined })}
              onOpenChange={states.activate}
              loading={states.isLoading}
              placeholder="All states"
              searchPlaceholder="Search states..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Business Type</Label>
            <MultiCombobox
              options={businessTypeOptions}
              selected={filters.businessTypes || []}
              onChange={(vals) => update({ businessTypes: vals.length > 0 ? vals : undefined })}
              onOpenChange={businessTypes.activate}
              loading={businessTypes.isLoading}
              placeholder="All types"
              searchPlaceholder="Search business types..."
            />
          </div>
        </div>

        {/* Row 2: Campaign + Search Query */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign</Label>
            <MultiCombobox
              options={campOptions}
              selected={filters.campaignIds || []}
              onChange={(vals) => update({ campaignIds: vals.length > 0 ? vals : undefined })}
              onOpenChange={handleCampOpen}
              onSearch={handleCampSearch}
              loading={campLoading}
              placeholder="All campaigns"
              searchPlaceholder="Search campaigns..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Search Query</Label>
            <MultiCombobox
              options={sqOptions}
              selected={filters.searchQueryIds || []}
              onChange={(vals) => update({ searchQueryIds: vals.length > 0 ? vals : undefined })}
              onOpenChange={handleSqOpen}
              onSearch={handleSqSearch}
              loading={sqLoading}
              placeholder="All search queries"
              searchPlaceholder="Search queries..."
            />
          </div>
        </div>

        {/* Row 3: Pipeline Status + Source + Tier */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Pipeline Status</Label>
            <MultiCombobox
              options={pipelineStatusOptions}
              selected={filters.pipelineStatuses || []}
              onChange={(vals) => update({ pipelineStatuses: vals.length > 0 ? vals : undefined })}
              onOpenChange={pipelineStatuses.activate}
              loading={pipelineStatuses.isLoading}
              placeholder="All statuses"
              searchPlaceholder="Search statuses..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Source</Label>
            <MultiCombobox
              options={sourceOptions}
              selected={filters.sources || []}
              onChange={(vals) => update({ sources: vals.length > 0 ? vals : undefined })}
              onOpenChange={sources.activate}
              loading={sources.isLoading}
              placeholder="All sources"
              searchPlaceholder="Search sources..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tier</Label>
            <MultiCombobox
              options={tierOptions}
              selected={(filters.tiers || []).map(String)}
              onChange={(vals) => update({ tiers: vals.length > 0 ? vals.map(Number) : undefined })}
              onOpenChange={tiers.activate}
              loading={tiers.isLoading}
              placeholder="All tiers"
              searchPlaceholder="Search tiers..."
            />
          </div>
        </div>

        {/* Row 3: Numeric ranges */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Rating</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder="Min" min={0} max={5} step={0.1}
                value={filters.ratingMin ?? ''}
                onChange={(e) => update({ ratingMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number" placeholder="Max" min={0} max={5} step={0.1}
                value={filters.ratingMax ?? ''}
                onChange={(e) => update({ ratingMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Review Count</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder="Min" min={0}
                value={filters.reviewCountMin ?? ''}
                onChange={(e) => update({ reviewCountMin: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number" placeholder="Max" min={0}
                value={filters.reviewCountMax ?? ''}
                onChange={(e) => update({ reviewCountMax: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Composite Score</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder="Min" min={0} max={1000}
                value={filters.compositeScoreMin ?? ''}
                onChange={(e) => update({ compositeScoreMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number" placeholder="Max" min={0} max={1000}
                value={filters.compositeScoreMax ?? ''}
                onChange={(e) => update({ compositeScoreMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">BQ Score</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder="Min" min={0} max={100}
                value={filters.bqScoreMin ?? ''}
                onChange={(e) => update({ bqScoreMin: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number" placeholder="Max" min={0} max={100}
                value={filters.bqScoreMax ?? ''}
                onChange={(e) => update({ bqScoreMax: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ER Score</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder="Min" min={0} max={100}
                value={filters.erScoreMin ?? ''}
                onChange={(e) => update({ erScoreMin: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number" placeholder="Max" min={0} max={100}
                value={filters.erScoreMax ?? ''}
                onChange={(e) => update({ erScoreMax: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Boolean tri-state selects */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {([
            ['hasWebsite', 'Website'],
            ['hasPhone', 'Phone'],
            ['hasExtractedEmail', 'Email'],
            ['hasExtractedPhone', 'Ext. Phone'],
            ['isScored', 'Scored'],
            ['isScraped', 'Scraped'],
            ['isExcluded', 'Excluded'],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Select
                value={boolToTriState(filters[key])}
                onValueChange={(val: TriStateValue) => update({ [key]: triStateToBool(val) })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

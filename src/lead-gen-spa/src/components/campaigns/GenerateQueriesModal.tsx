import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStates } from '@/hooks/useLocations';
import { api } from '@/lib/api';
import {
  PLACE_TYPES,
  ALL_PLACE_TYPES,
  formatPlaceType,
  REGIONAL_PRESETS,
  CITY_LIMITS,
} from '@/lib/constants/place-types';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface GenerateQueriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (queries: string[]) => void;
}

export function GenerateQueriesModal({ open, onOpenChange, onGenerate }: GenerateQueriesModalProps) {
  const [businessType, setBusinessType] = useState('');
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [cityLimit, setCityLimit] = useState<number>(25);
  const [showPlaceTypes, setShowPlaceTypes] = useState(false);
  const [placeTypeFilter, setPlaceTypeFilter] = useState('');
  const [generating, setGenerating] = useState(false);

  // Autocomplete state
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const acRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: states = [], isLoading: statesLoading } = useStates();

  const acSuggestions = useMemo(() => {
    const q = businessType.trim().toLowerCase();
    if (!q) return [];
    return ALL_PLACE_TYPES
      .filter((t) => formatPlaceType(t).toLowerCase().includes(q))
      .slice(0, 12);
  }, [businessType]);

  const selectSuggestion = useCallback((type: string) => {
    setBusinessType(formatPlaceType(type).toLowerCase());
    setAcOpen(false);
    setAcIndex(-1);
  }, []);

  const handleAcKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!acOpen || acSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAcIndex((prev) => (prev + 1) % acSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAcIndex((prev) => (prev <= 0 ? acSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (acIndex >= 0 && acIndex < acSuggestions.length) {
        selectSuggestion(acSuggestions[acIndex]);
      } else {
        setAcOpen(false);
      }
    } else if (e.key === 'Escape') {
      setAcOpen(false);
      setAcIndex(-1);
    }
  }, [acOpen, acSuggestions, acIndex, selectSuggestion]);

  const filteredPlaceTypes = useMemo(() => {
    if (!placeTypeFilter.trim()) return PLACE_TYPES;
    const q = placeTypeFilter.toLowerCase();
    return PLACE_TYPES.map((cat) => ({
      ...cat,
      types: cat.types.filter((t) => formatPlaceType(t).toLowerCase().includes(q)),
    })).filter((cat) => cat.types.length > 0);
  }, [placeTypeFilter]);

  const estimatedCount = cityLimit === -1 ? `${selectedStates.size} × all` : selectedStates.size * cityLimit;
  const previewSample = useMemo(() => {
    if (!businessType.trim() || selectedStates.size === 0) return [];
    const stateArr = Array.from(selectedStates).slice(0, 3);
    return stateArr.map((s) => `${businessType.trim()} in [city] ${s}`);
  }, [businessType, selectedStates]);

  const toggleState = (stateId: string) => {
    setSelectedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  };

  const applyPreset = (stateIds: string[]) => {
    setSelectedStates(new Set(stateIds));
  };

  const handleGenerate = async () => {
    if (!businessType.trim() || selectedStates.size === 0) return;
    setGenerating(true);
    try {
      const limit = cityLimit === -1 ? undefined : cityLimit;
      const stateIds = Array.from(selectedStates);
      const results = await Promise.all(
        stateIds.map((id) => api.getCitiesByState(id, limit))
      );
      const queries = results.flatMap((cities, i) =>
        cities.map((city) => `${businessType.trim()} in ${city.name} ${stateIds[i]}`)
      );
      onGenerate(queries);
      onOpenChange(false);
      // Reset
      setBusinessType('');
      setSelectedStates(new Set());
      setCityLimit(25);
      setShowPlaceTypes(false);
      setPlaceTypeFilter('');
      setAcOpen(false);
      setAcIndex(-1);
    } catch (err) {
      console.error('Failed to generate queries:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Search Queries</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Business Type — autocomplete */}
          <div className="space-y-2">
            <Label>Business Type</Label>
            <div className="relative" ref={acRef}>
              <Input
                ref={inputRef}
                placeholder='e.g., "plumber", "auto body shop", "dentist"'
                value={businessType}
                onChange={(e) => {
                  setBusinessType(e.target.value);
                  setAcOpen(true);
                  setAcIndex(-1);
                }}
                onFocus={() => { if (acSuggestions.length > 0) setAcOpen(true); }}
                onBlur={() => { setTimeout(() => setAcOpen(false), 150); }}
                onKeyDown={handleAcKeyDown}
                autoComplete="off"
              />
              {acOpen && acSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                  <ScrollArea className="max-h-48">
                    <div className="p-1">
                      {acSuggestions.map((type, i) => {
                        const label = formatPlaceType(type);
                        const cat = PLACE_TYPES.find((c) => c.types.includes(type));
                        return (
                          <button
                            key={type}
                            type="button"
                            className={`flex items-center justify-between w-full rounded px-2 py-1.5 text-sm cursor-pointer ${
                              i === acIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                            }`}
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(type); }}
                            onMouseEnter={() => setAcIndex(i)}
                          >
                            <span>{label}</span>
                            {cat && <span className="text-xs text-muted-foreground">{cat.category}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setShowPlaceTypes(!showPlaceTypes)}
            >
              {showPlaceTypes ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              Browse all place types
            </Button>
            {showPlaceTypes && (
              <div className="border rounded-lg p-3 space-y-3">
                <Input
                  placeholder="Filter types..."
                  value={placeTypeFilter}
                  onChange={(e) => setPlaceTypeFilter(e.target.value)}
                  className="h-8 text-xs"
                />
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {filteredPlaceTypes.map((cat) => (
                      <div key={cat.category}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{cat.category}</p>
                        <div className="flex flex-wrap gap-1">
                          {cat.types.map((type) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                              onClick={() => { setBusinessType(formatPlaceType(type).toLowerCase()); setShowPlaceTypes(false); }}
                            >
                              {formatPlaceType(type)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <Separator />

          {/* States */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>States ({selectedStates.size} selected)</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setSelectedStates(new Set(states.map((s) => s.id)))}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setSelectedStates(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {REGIONAL_PRESETS.map((preset) => (
                <Badge
                  key={preset.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                  onClick={() => applyPreset(preset.stateIds)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>
            {statesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading states...
              </div>
            ) : (
              <ScrollArea className="h-40 border rounded-lg">
                <div className="grid grid-cols-4 gap-x-4 gap-y-1 p-3">
                  {states.map((state) => (
                    <label
                      key={state.id}
                      className="flex items-center gap-1.5 text-sm cursor-pointer hover:text-primary"
                    >
                      <Checkbox
                        checked={selectedStates.has(state.id)}
                        onCheckedChange={() => toggleState(state.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate text-xs">{state.id} — {state.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* City Limit */}
          <div className="space-y-2">
            <Label>Cities per state</Label>
            <Select value={String(cityLimit)} onValueChange={(v) => setCityLimit(Number(v))}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITY_LIMITS.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit === -1 ? 'All cities' : `Top ${limit}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">{selectedStates.size}</span> state{selectedStates.size !== 1 ? 's' : ''}
                {' × '}
                <span className="font-medium">{cityLimit === -1 ? 'all' : cityLimit}</span> cities
                {' = ~'}
                <span className="font-medium">{typeof estimatedCount === 'number' ? estimatedCount.toLocaleString() : estimatedCount}</span> queries
              </p>

              {previewSample.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewSample.map((q, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-mono">
                      {q}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !businessType.trim() || selectedStates.size === 0}
          >
            {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {generating ? 'Generating...' : 'Generate Queries'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

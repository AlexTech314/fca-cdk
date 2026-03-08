import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ALL_PLACE_TYPES, formatPlaceType } from '@/lib/constants/place-types';
import type { Lead } from '@/types';

interface TypeCellProps {
  lead: Lead;
  onChangeType: (id: string, type: string, onError: () => void) => void;
}

export function TypeCell({ lead, onChangeType }: TypeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [optimisticType, setOptimisticType] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayType = optimisticType ?? lead.businessType;

  useEffect(() => {
    if (optimisticType !== null && lead.businessType === optimisticType) {
      setOptimisticType(null);
    }
  }, [lead.businessType, optimisticType]);

  const { data: allTypes = [] } = useQuery({
    queryKey: ['leads', 'business-types'],
    queryFn: () => api.getBusinessTypes(),
    enabled: isEditing,
    staleTime: 0,
  });

  const placeTypeLabels = useMemo(
    () => ALL_PLACE_TYPES.map((t) => formatPlaceType(t)),
    [],
  );

  const results = useMemo(() => {
    // Merge DB types + place type labels, deduplicated
    const merged = new Set([...allTypes, ...placeTypeLabels]);
    const all = Array.from(merged).sort((a, b) => a.localeCompare(b));
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((t) => t.toLowerCase().includes(q));
  }, [allTypes, placeTypeLabels, search]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSearch('');
    setHighlightIndex(0);
    setIsEditing(true);
  }, []);

  const close = useCallback(() => {
    setIsEditing(false);
    setSearch('');
  }, []);

  const selectType = useCallback(
    (type: string) => {
      setOptimisticType(type);
      setIsEditing(false);
      setSearch('');
      onChangeType(lead.id, type, () => setOptimisticType(null));
    },
    [lead.id, onChangeType],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && results[highlightIndex]) {
          selectType(results[highlightIndex]);
        } else if (search.trim()) {
          selectType(search.trim());
        }
      }
    },
    [close, results, highlightIndex, selectType],
  );

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [results]);

  const displayContent = displayType ? (
    <Badge variant="secondary">{displayType}</Badge>
  ) : (
    <span className="text-muted-foreground">-</span>
  );

  return (
    <div
      className={`-m-4 p-4 relative ${isEditing ? 'ring-1 ring-inset ring-ring z-10' : ''}`}
      onDoubleClick={!isEditing ? startEditing : undefined}
    >
      {/* Always rendered for stable sizing */}
      <div className={isEditing ? 'invisible' : ''}>{displayContent}</div>

      {isEditing && (
        <div className="absolute inset-0 p-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                if (e.relatedTarget?.closest('[data-type-list]')) return;
                close();
              }}
              placeholder={displayType || 'Search types...'}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div
              data-type-list
              ref={listRef}
              className="absolute left-0 top-full mt-2 w-56 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md z-50"
            >
              {results.map((type, i) => (
                <button
                  key={type}
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectType(type);
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-pointer ${
                    i === highlightIndex ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                  }`}
                >
                  {type}
                </button>
              ))}
              {search.trim() && !results.some((t) => t.toLowerCase() === search.trim().toLowerCase()) && (
                <button
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectType(search.trim());
                  }}
                  className="w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Use "{search.trim()}"
                </button>
              )}
              {results.length === 0 && !search.trim() && (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">No types found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

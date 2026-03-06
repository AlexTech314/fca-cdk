import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
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

  const results = useMemo(() => {
    if (!search.trim()) return allTypes;
    const q = search.toLowerCase();
    return allTypes.filter((t) => t.toLowerCase().includes(q));
  }, [allTypes, search]);

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
        if (results[highlightIndex]) {
          selectType(results[highlightIndex]);
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

  if (isEditing) {
    return (
      <div className="-m-4 p-4 ring-1 ring-inset ring-ring z-10 relative">
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
          {results.length > 0 && (
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
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 p-4" onDoubleClick={startEditing}>
      {displayType ? (
        <Badge variant="secondary">{displayType}</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  );
}

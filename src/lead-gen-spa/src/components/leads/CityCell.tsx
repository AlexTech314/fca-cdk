import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Lead } from '@/types';

interface CityOption {
  id: number;
  name: string;
  state: { id: string; name: string };
}

interface CityCellProps {
  lead: Lead;
  onChangeCity: (id: string, cityId: number, cityName: string, onError: () => void) => void;
}

export function CityCell({ lead, onChangeCity }: CityCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [optimisticCity, setOptimisticCity] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayCity = optimisticCity ?? lead.city;

  // Clear optimistic override once the server value catches up
  useEffect(() => {
    if (optimisticCity !== null && lead.city === optimisticCity) {
      setOptimisticCity(null);
    }
  }, [lead.city, optimisticCity]);

  const { data: results = [] } = useQuery({
    queryKey: ['cities', 'search', search],
    queryFn: () => api.searchCities(search),
    enabled: isEditing && search.length >= 1,
    staleTime: 60_000,
  });

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

  const selectCity = useCallback(
    (city: CityOption) => {
      const name = `${city.name}, ${city.state.id}`;
      setOptimisticCity(city.name);
      setIsEditing(false);
      setSearch('');
      onChangeCity(lead.id, city.id, name, () => setOptimisticCity(null));
    },
    [lead.id, onChangeCity],
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
          selectCity(results[highlightIndex]);
        }
      }
    },
    [close, results, highlightIndex, selectCity],
  );

  // Focus input on edit start
  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing]);

  // Keep highlighted item scrolled into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  // Reset highlight when results change
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
              // Don't close if clicking inside the dropdown
              if (e.relatedTarget?.closest('[data-city-list]')) return;
              close();
            }}
            placeholder={displayCity || 'Search cities...'}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search.length >= 1 && results.length > 0 && (
            <div
              data-city-list
              ref={listRef}
              className="absolute left-0 top-full mt-2 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md z-50"
            >
              {results.map((city, i) => (
                <button
                  key={city.id}
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCity(city);
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-pointer ${
                    i === highlightIndex ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                  }`}
                >
                  {city.name}
                  <span className="text-muted-foreground ml-1">{city.state.id}</span>
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
      <span className="text-muted-foreground">{displayCity || '-'}</span>
    </div>
  );
}

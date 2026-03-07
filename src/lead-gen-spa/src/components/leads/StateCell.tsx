import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types';

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY',
};

function getStateAbbreviation(state: string): string {
  if (state.length === 2) return state.toUpperCase();
  return US_STATE_ABBREVIATIONS[state] ?? state;
}

interface StateCellProps {
  lead: Lead;
  onChangeState: (id: string, stateId: string, onError: () => void) => void;
}

export function StateCell({ lead, onChangeState }: StateCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [optimisticState, setOptimisticState] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayState = optimisticState ?? lead.state;

  useEffect(() => {
    if (optimisticState !== null && lead.state === optimisticState) {
      setOptimisticState(null);
    }
  }, [lead.state, optimisticState]);

  const { data: allStates = [] } = useQuery({
    queryKey: ['locations', 'states'],
    queryFn: () => api.getLocationsStates(),
    staleTime: Infinity,
  });

  const results = useMemo(() => {
    if (!search.trim()) return allStates;
    const q = search.toLowerCase();
    return allStates.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }, [allStates, search]);

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

  const selectState = useCallback(
    (state: { id: string; name: string }) => {
      setOptimisticState(state.name);
      setIsEditing(false);
      setSearch('');
      onChangeState(lead.id, state.id, () => setOptimisticState(null));
    },
    [lead.id, onChangeState],
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
          selectState(results[highlightIndex]);
        }
      }
    },
    [close, results, highlightIndex, selectState],
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

  const displayContent = displayState ? (
    <Badge variant="outline">{getStateAbbreviation(displayState)}</Badge>
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
                if (e.relatedTarget?.closest('[data-state-list]')) return;
                close();
              }}
              placeholder={displayState ? getStateAbbreviation(displayState) : 'Search states...'}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {results.length > 0 && (
              <div
                data-state-list
                ref={listRef}
                className="absolute left-0 top-full mt-2 w-56 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md z-50"
              >
                {results.map((state, i) => (
                  <button
                    key={state.id}
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectState(state);
                    }}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-pointer ${
                      i === highlightIndex ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                    }`}
                  >
                    {state.name}
                    <span className="text-muted-foreground ml-1">{state.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

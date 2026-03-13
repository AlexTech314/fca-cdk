'use client';

import { useState, useRef, useEffect } from 'react';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

interface Industry {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
}

interface IndustryPickerProps {
  selectedIndustries: Industry[];
  allIndustries: Industry[];
  onChange: (industries: Industry[]) => void;
  disabled?: boolean;
}

export function IndustryPicker({ selectedIndustries, allIndustries: initialAll, onChange, disabled = false }: IndustryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [knownIndustries, setKnownIndustries] = useState<Industry[]>(initialAll);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync if parent passes new allIndustries (e.g. on refetch)
  useEffect(() => {
    setKnownIndustries((prev) => {
      const ids = new Set(initialAll.map((i) => i.id));
      const extras = prev.filter((i) => !ids.has(i.id));
      return [...initialAll, ...extras];
    });
  }, [initialAll]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedIds = new Set(selectedIndustries.map((t) => t.id));

  const available = knownIndustries.filter((t) => {
    if (selectedIds.has(t.id)) return false;
    if (search) {
      return t.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Check if the search term exactly matches an existing industry (case-insensitive)
  const exactMatch = search
    ? knownIndustries.some((t) => t.name.toLowerCase() === search.trim().toLowerCase())
    : true;

  const handleRemove = (id: string) => {
    if (disabled) return;
    onChange(selectedIndustries.filter((t) => t.id !== id));
  };

  const handleAdd = (industry: Industry) => {
    if (disabled) return;
    onChange([...selectedIndustries, industry]);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || creating) return;

    setCreating(true);
    try {
      const res = await authedApiFetch('/api/admin/industries', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create industry');
      const industry: Industry = await res.json();

      // Add to known list so it shows up in future searches
      setKnownIndustries((prev) =>
        prev.some((i) => i.id === industry.id) ? prev : [...prev, industry]
      );

      // Select it
      handleAdd(industry);
    } catch (err) {
      console.error('Failed to create industry:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Selected tags as pills */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-white p-2 min-h-[42px]">
        {selectedIndustries.map((ind) => (
          <span
            key={ind.id}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {ind.name}
            {!disabled && (
              <button
                onClick={() => handleRemove(ind.id)}
                className="ml-0.5 rounded-full p-0.5 text-primary/60 hover:bg-primary/20 hover:text-primary"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedIndustries.length === 0 ? 'Add industries...' : 'Add...'}
            className="min-w-[80px] flex-1 border-none bg-transparent px-1 py-0.5 text-xs outline-none placeholder:text-gray-400"
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (available.length > 0 || (search.trim() && !exactMatch)) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
          {available.map((ind) => (
            <button
              key={ind.id}
              onClick={() => handleAdd(ind)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-blue-50"
            >
              <span className="font-medium text-text">{ind.name}</span>
            </button>
          ))}

          {/* Create new option */}
          {search.trim() && !exactMatch && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs hover:bg-green-50"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-medium text-green-700">
                {creating ? 'Creating...' : `Create "${search.trim()}"`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

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

export function IndustryPicker({ selectedIndustries, allIndustries, onChange, disabled = false }: IndustryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const available = allIndustries.filter((t) => {
    if (selectedIds.has(t.id)) return false;
    if (search) {
      return t.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

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
      {isOpen && !disabled && available.length > 0 && (
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
        </div>
      )}

      {isOpen && !disabled && search && available.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-white p-3 shadow-lg">
          <p className="text-center text-xs text-text-muted">No matching industries</p>
        </div>
      )}
    </div>
  );
}

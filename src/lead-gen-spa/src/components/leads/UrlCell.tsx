import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Lead } from '@/types';

interface UrlCellProps {
  lead: Lead;
  field: 'website' | 'googleMapsUri';
  icon: ReactNode;
  onChange: (id: string, value: string | null, onError: () => void) => void;
}

export function UrlCell({ lead, field, icon, onChange }: UrlCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [optimisticValue, setOptimisticValue] = useState<string | null | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const currentValue = optimisticValue !== undefined ? optimisticValue : lead[field] ?? null;

  useEffect(() => {
    if (optimisticValue !== undefined && lead[field] === optimisticValue) {
      setOptimisticValue(undefined);
    }
  }, [lead[field], optimisticValue]);

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(currentValue ?? '');
    setIsOpen(true);
  }, [currentValue]);

  const save = useCallback(() => {
    setIsOpen(false);
    const trimmed = draft.trim() || null;
    if (trimmed !== currentValue) {
      setOptimisticValue(trimmed);
      onChange(lead.id, trimmed, () => setOptimisticValue(undefined));
    }
  }, [draft, currentValue, lead.id, onChange]);

  const cancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clear = useCallback(() => {
    setDraft('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel],
  );

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    if (currentValue) {
      e.stopPropagation();
      window.open(currentValue, '_blank', 'noopener,noreferrer');
    }
  }, [currentValue]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        save();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, save]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
  }, [isOpen]);

  return (
    <div className="-m-4 p-4 relative flex justify-center" onDoubleClick={!isOpen ? open : undefined}>
      <span
        onClick={handleIconClick}
        className={currentValue
          ? 'text-primary hover:text-primary/80 cursor-pointer transition-colors'
          : 'text-muted-foreground opacity-30'
        }
      >
        {icon}
      </span>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-popover border rounded-md shadow-md p-2 min-w-[280px]"
        >
          {/* Arrow */}
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border-l border-t rounded-tl-sm" />
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground min-w-0"
            />
            {draft && (
              <button
                type="button"
                onClick={clear}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

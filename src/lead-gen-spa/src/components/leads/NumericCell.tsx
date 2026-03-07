import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Lead } from '@/types';

interface NumericCellProps {
  lead: Lead;
  field: 'rating' | 'reviewCount';
  icon?: ReactNode;
  format?: (n: number) => string;
  validate: (s: string) => number | null;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric';
  onChange: (id: string, value: number | null, onError: () => void) => void;
}

export function NumericCell({ lead, field, icon, format, validate, placeholder, inputMode, onChange }: NumericCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [optimisticValue, setOptimisticValue] = useState<number | null | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = optimisticValue !== undefined ? optimisticValue : lead[field];

  useEffect(() => {
    if (optimisticValue !== undefined && lead[field] === optimisticValue) {
      setOptimisticValue(undefined);
    }
  }, [lead[field], optimisticValue]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(currentValue !== null ? String(currentValue) : '');
    setIsEditing(true);
  }, [currentValue]);

  const save = useCallback(() => {
    setIsEditing(false);
    const trimmed = draft.trim();
    const newValue = trimmed === '' ? null : validate(trimmed);
    // If validate returned null for a non-empty string, it's invalid — don't save
    if (trimmed !== '' && newValue === null) return;
    if (newValue !== currentValue) {
      setOptimisticValue(newValue);
      onChange(lead.id, newValue, () => setOptimisticValue(undefined));
    }
  }, [draft, currentValue, lead.id, onChange, validate]);

  const cancel = useCallback(() => {
    setIsEditing(false);
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

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
  }, [isEditing]);

  const displayText = currentValue !== null
    ? (format ? format(currentValue) : String(currentValue))
    : '-';

  return (
    <div
      className={`-m-4 p-4 relative ${isEditing ? 'ring-1 ring-inset ring-ring z-10' : ''}`}
      onDoubleClick={!isEditing ? startEditing : undefined}
    >
      {/* Always rendered for stable sizing */}
      <span className={`whitespace-nowrap ${isEditing ? 'invisible' : ''} ${currentValue !== null ? '' : 'text-muted-foreground'}`}>
        {currentValue !== null && icon ? (
          <span className="inline-flex items-center gap-1">
            {icon}
            <span className="font-mono">{displayText}</span>
          </span>
        ) : (
          <span className={currentValue !== null ? 'font-mono' : ''}>{displayText}</span>
        )}
      </span>

      {isEditing && (
        <div className="absolute inset-0 p-4">
          <input
            ref={inputRef}
            type="text"
            inputMode={inputMode ?? 'numeric'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={save}
            placeholder={placeholder}
            className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
    </div>
  );
}

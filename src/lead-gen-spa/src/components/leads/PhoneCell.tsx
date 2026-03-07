import { useState, useRef, useCallback, useEffect } from 'react';
import type { Lead } from '@/types';

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

interface PhoneCellProps {
  lead: Lead;
  onChangePhone: (id: string, phone: string, onError: () => void) => void;
}

export function PhoneCell({ lead, onChangePhone }: PhoneCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [digits, setDigits] = useState('');
  const [optimisticPhone, setOptimisticPhone] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayPhone = optimisticPhone ?? lead.phone;

  useEffect(() => {
    if (optimisticPhone !== null && lead.phone === optimisticPhone) {
      setOptimisticPhone(null);
    }
  }, [lead.phone, optimisticPhone]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDigits(digitsOnly(displayPhone ?? ''));
    setIsEditing(true);
  }, [displayPhone]);

  const save = useCallback(() => {
    setIsEditing(false);
    const formatted = formatPhone(digits);
    if (formatted && formatted !== displayPhone) {
      setOptimisticPhone(formatted);
      onChangePhone(lead.id, formatted, () => setOptimisticPhone(null));
    }
  }, [digits, displayPhone, lead.id, onChangePhone]);

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

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = digitsOnly(e.target.value);
    setDigits(raw.slice(0, 10));
  }, []);

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

  return (
    <div
      className={`-m-4 p-4 relative ${isEditing ? 'ring-1 ring-inset ring-ring z-10' : ''}`}
      onDoubleClick={!isEditing ? startEditing : undefined}
    >
      {/* Always rendered for stable sizing */}
      <span className={`font-mono text-sm whitespace-nowrap ${isEditing ? 'invisible' : ''} ${displayPhone ? '' : 'text-muted-foreground'}`}>
        {displayPhone || '-'}
      </span>

      {isEditing && (
        <div className="absolute inset-0 p-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={formatPhone(digits)}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={save}
            placeholder="(555) 123-4567"
            className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
    </div>
  );
}

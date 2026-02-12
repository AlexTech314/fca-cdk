'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableInlineFieldProps {
  /** Current value */
  value: string;
  /** Called on blur with the new value */
  onChangeValue: (value: string) => void;
  /** Original value -- if differs from value, shows amber dirty outline */
  originalValue?: string;
  /** HTML element to render as */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  /** If true, Enter inserts a newline instead of committing */
  multiline?: boolean;
  /** Additional class names */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Placeholder when empty */
  placeholder?: string;
  /** Disable editing (e.g. for deleted items) */
  disabled?: boolean;
}

/**
 * Lightweight inline editable field for entity components.
 * Uses the same contentEditable + outline UX as EditableField,
 * but accepts a simple onChangeValue callback instead of being
 * wired to AdminPageContext.
 */
export function EditableInlineField({
  value,
  onChangeValue,
  originalValue,
  as: Component = 'span',
  multiline = false,
  className,
  style,
  placeholder = 'Click to edit...',
  disabled = false,
}: EditableInlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const snapshotValue = useRef(value);

  // Sync displayed text when value changes externally (save/discard)
  useEffect(() => {
    if (!isEditing && ref.current) {
      ref.current.textContent = value || placeholder;
    }
    snapshotValue.current = value;
  }, [value, isEditing, placeholder]);

  const isDirty = originalValue !== undefined && originalValue !== value;

  const handleClick = useCallback(() => {
    if (disabled || isEditing) return;
    setIsEditing(true);
    snapshotValue.current = value;
    requestAnimationFrame(() => {
      if (ref.current) {
        // Clear placeholder when entering edit mode on an empty field
        if (!value) {
          ref.current.textContent = '';
        }
        ref.current.focus();
        // Place cursor at end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
  }, [disabled, isEditing, value]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const rawValue = ref.current?.textContent || '';
    // Don't save the placeholder as a real value
    const newValue = rawValue === placeholder ? '' : rawValue;
    if (newValue !== value) {
      onChangeValue(newValue);
    }
  }, [value, onChangeValue, placeholder]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline && !e.shiftKey) {
        e.preventDefault();
        ref.current?.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (ref.current) {
          ref.current.textContent = snapshotValue.current || '';
        }
        setIsEditing(false);
      }
    },
    [multiline]
  );

  return (
    <Component
      ref={ref as React.Ref<HTMLElement & HTMLDivElement>}
      className={cn(
        'relative transition-all duration-150',
        // Hover state
        !disabled && !isEditing && isHovered && 'cursor-pointer outline-dashed outline-2 outline-offset-4 outline-blue-500/60',
        // Editing state
        isEditing && 'cursor-text outline-solid outline-2 outline-offset-4 outline-blue-500 ring-2 ring-blue-500/20',
        // Dirty indicator
        isDirty && !isEditing && !isHovered && 'outline-dotted outline-1 outline-offset-4 outline-amber-400/60',
        // Disabled (deleted)
        disabled && 'cursor-default line-through opacity-60',
        // Empty placeholder style
        !value && !isEditing && 'italic text-gray-300',
        className
      )}
      style={style}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={isEditing ? handleKeyDown : undefined}
    >
      {value || placeholder}
    </Component>
  );
}

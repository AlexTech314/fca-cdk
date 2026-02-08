'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  /** The metadata key this field maps to */
  fieldKey: string;
  /** Current value */
  value: string;
  /** Called when the value changes */
  onChange: (key: string, value: string) => void;
  /** HTML element to render as */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  /** Additional class names */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Whether this field has been modified */
  isDirty?: boolean;
  /** Placeholder text when value is empty */
  placeholder?: string;
}

export function EditableField({
  fieldKey,
  value,
  onChange,
  as: Component = 'span',
  className,
  style,
  isDirty = false,
  placeholder = 'Click to edit...',
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const originalValue = useRef(value);

  // Update original value when value prop changes from external source (e.g., save/discard)
  useEffect(() => {
    originalValue.current = value;
  }, [value]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      originalValue.current = value;
      // Focus the element after React re-renders with contentEditable
      requestAnimationFrame(() => {
        if (ref.current) {
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
    }
  }, [isEditing, value]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const newValue = ref.current?.textContent || '';
    if (newValue !== value) {
      onChange(fieldKey, newValue);
    }
  }, [fieldKey, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ref.current?.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Revert to original value
        if (ref.current) {
          ref.current.textContent = originalValue.current;
        }
        setIsEditing(false);
      }
    },
    []
  );

  return (
    <Component
      ref={ref as React.Ref<HTMLElement & HTMLDivElement>}
      className={cn(
        'relative transition-all duration-150',
        // Hover state
        !isEditing && isHovered && 'cursor-pointer outline-dashed outline-2 outline-offset-4 outline-blue-500/60',
        // Editing state
        isEditing && 'cursor-text outline-solid outline-2 outline-offset-4 outline-blue-500 ring-2 ring-blue-500/20',
        // Dirty indicator
        isDirty && !isEditing && !isHovered && 'outline-dotted outline-1 outline-offset-4 outline-amber-400/60',
        className
      )}
      style={style}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      data-field-key={fieldKey}
    >
      {value || placeholder}
    </Component>
  );
}

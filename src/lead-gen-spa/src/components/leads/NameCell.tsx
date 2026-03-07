import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PipelineStatusDot } from './PipelineStatusDot';
import type { Lead } from '@/types';

interface NameCellProps {
  lead: Lead;
  onRename: (id: string, name: string, onError: () => void) => void;
}

export function NameCell({ lead, onRename }: NameCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(lead.name);
  const editRef = useRef<HTMLSpanElement>(null);

  // Clear optimistic override once the server value catches up
  useEffect(() => {
    if (optimisticName !== null && lead.name === optimisticName) {
      setOptimisticName(null);
    }
  }, [lead.name, optimisticName]);

  const displayName = optimisticName ?? lead.name;

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(displayName);
    setIsEditing(true);
  }, [displayName]);

  const save = useCallback(() => {
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== displayName) {
      setOptimisticName(trimmed);
      onRename(lead.id, trimmed, () => setOptimisticName(null));
    }
  }, [editValue, displayName, lead.id, onRename]);

  const cancel = useCallback(() => {
    setEditValue(displayName);
    setIsEditing(false);
  }, [displayName]);

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

  // Focus + select text on edit start
  useEffect(() => {
    if (isEditing && editRef.current) {
      const el = editRef.current;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="-m-4 p-4 ring-1 ring-inset ring-ring z-10 relative">
        <div className="flex items-center gap-1.5">
          <PipelineStatusDot
            status={lead.pipelineStatus}
            scrapeError={lead.scrapeError}
            scoringError={lead.scoringError}
          />
          <span
            ref={editRef}
            role="textbox"
            contentEditable
            suppressContentEditableWarning
            className="font-medium text-foreground outline-none caret-foreground"
            onInput={(e) => setEditValue(e.currentTarget.textContent ?? '')}
            onBlur={save}
            onKeyDown={handleKeyDown}
          >
            {displayName}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 p-4" onDoubleClick={startEditing}>
      <div className="flex items-center gap-1.5">
        <PipelineStatusDot
          status={lead.pipelineStatus}
          scrapeError={lead.scrapeError}
          scoringError={lead.scoringError}
        />
        <Link
          to={`/leads/${lead.id}`}
          className="font-medium text-primary hover:underline"
        >
          {displayName}
        </Link>
      </div>
      {lead.franchise && (
        <div className="text-xs text-muted-foreground mt-0.5">
          Location of: {lead.franchise.displayName ?? lead.franchise.name}
        </div>
      )}
    </div>
  );
}

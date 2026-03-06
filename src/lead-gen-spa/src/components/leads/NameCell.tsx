import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { PipelineStatusDot } from './PipelineStatusDot';
import type { Lead } from '@/types';

interface NameCellProps {
  lead: Lead;
  onRename: (id: string, name: string) => void;
}

export function NameCell({ lead, onRename }: NameCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(lead.name);
  const editRef = useRef<HTMLSpanElement>(null);

  // Sync if lead.name changes externally (e.g. after refetch)
  useEffect(() => {
    if (!isEditing) setEditValue(lead.name);
  }, [lead.name, isEditing]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(lead.name);
    setIsEditing(true);
  }, [lead.name]);

  const save = useCallback(() => {
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== lead.name) {
      onRename(lead.id, trimmed);
    } else {
      setEditValue(lead.name);
    }
  }, [editValue, lead.id, lead.name, onRename]);

  const cancel = useCallback(() => {
    setEditValue(lead.name);
    setIsEditing(false);
  }, [lead.name]);

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
          className="font-medium text-foreground outline-none caret-foreground rounded px-1 -mx-1 ring-1 ring-ring"
          onInput={(e) => setEditValue(e.currentTarget.textContent ?? '')}
          onBlur={save}
          onKeyDown={handleKeyDown}
        >
          {lead.name}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="group/name flex items-center gap-1.5">
        <PipelineStatusDot
          status={lead.pipelineStatus}
          scrapeError={lead.scrapeError}
          scoringError={lead.scoringError}
        />
        <Link
          to={`/leads/${lead.id}`}
          className="font-medium text-primary hover:underline"
        >
          {lead.name}
        </Link>
        <button
          onClick={startEditing}
          className="ml-auto opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
          aria-label={`Rename ${lead.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {lead.franchise && (
        <div className="text-xs text-muted-foreground mt-0.5">
          Location of: {lead.franchise.displayName ?? lead.franchise.name}
        </div>
      )}
    </>
  );
}

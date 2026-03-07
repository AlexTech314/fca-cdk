import { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, X } from 'lucide-react';
import type { Lead } from '@/types';

interface EmailEntry {
  id: string;
  value: string;
}

interface MultiEmailCellProps {
  lead: Lead;
  onUpdateEmail: (leadId: string, emailId: string, value: string, onError: () => void) => void;
  onCreateEmail: (leadId: string, value: string, onError: () => void) => void;
  onDeleteEmail: (leadId: string, emailId: string, onError: () => void) => void;
}

export function MultiEmailCell({ lead, onUpdateEmail, onCreateEmail, onDeleteEmail }: MultiEmailCellProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [optimisticEmails, setOptimisticEmails] = useState<EmailEntry[] | null>(null);
  const editRef = useRef<HTMLSpanElement>(null);
  const createRef = useRef<HTMLSpanElement>(null);

  const emails: EmailEntry[] = optimisticEmails ?? lead.leadEmails ?? [];

  // Clear optimistic state when server data catches up
  useEffect(() => {
    if (optimisticEmails !== null) {
      const serverEmails = lead.leadEmails ?? [];
      // Check if server data has converged (same count and values match)
      const serverValues = new Set(serverEmails.map((e) => e.value));
      const optValues = new Set(optimisticEmails.map((e) => e.value));
      if (serverValues.size === optValues.size && [...optValues].every((v) => serverValues.has(v))) {
        setOptimisticEmails(null);
      }
    }
  }, [lead.leadEmails, optimisticEmails]);

  const visibleEmails = expanded ? emails : emails.slice(0, 1);
  const hiddenCount = emails.length - 1;

  // ── Edit existing email ──────────────────────────────────
  const startEditing = useCallback((e: React.MouseEvent, email: EmailEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(email.id);
    setEditValue(email.value);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    setEditingId(null);

    if (!trimmed) {
      // Empty = delete
      const prev = emails;
      setOptimisticEmails(prev.filter((em) => em.id !== editingId));
      onDeleteEmail(lead.id, editingId, () => setOptimisticEmails(null));
      return;
    }

    const current = emails.find((em) => em.id === editingId);
    if (current && trimmed !== current.value) {
      setOptimisticEmails(emails.map((em) => (em.id === editingId ? { ...em, value: trimmed } : em)));
      onUpdateEmail(lead.id, editingId, trimmed, () => setOptimisticEmails(null));
    }
  }, [editingId, editValue, emails, lead.id, onUpdateEmail, onDeleteEmail]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    },
    [saveEdit, cancelEdit],
  );

  // ── Create new email ─────────────────────────────────────
  const startCreating = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCreateValue('');
    setIsCreating(true);
    if (!expanded && emails.length > 0) setExpanded(true);
  }, [expanded, emails.length]);

  const saveCreate = useCallback(() => {
    setIsCreating(false);
    const trimmed = createValue.trim();
    if (!trimmed) return;
    // Optimistically add with a temp ID
    const tempId = `temp-${Date.now()}`;
    setOptimisticEmails([...emails, { id: tempId, value: trimmed }]);
    onCreateEmail(lead.id, trimmed, () => setOptimisticEmails(null));
  }, [createValue, emails, lead.id, onCreateEmail]);

  const cancelCreate = useCallback(() => {
    setIsCreating(false);
  }, []);

  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); saveCreate(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelCreate(); }
    },
    [saveCreate, cancelCreate],
  );

  // ── Focus management ─────────────────────────────────────
  useEffect(() => {
    if (editingId && editRef.current) {
      const el = editRef.current;
      requestAnimationFrame(() => {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
    }
  }, [editingId]);

  useEffect(() => {
    if (isCreating && createRef.current) {
      requestAnimationFrame(() => createRef.current?.focus());
    }
  }, [isCreating]);

  const handleExpandClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const isActive = editingId !== null || isCreating;

  return (
    <div
      className={`-m-4 p-4 relative group/email ${isActive ? 'ring-1 ring-inset ring-ring z-10' : ''}`}
    >
      {emails.length === 0 && !isCreating ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          {visibleEmails.map((email) => (
            <span key={email.id} className="inline-flex">
              {editingId === email.id ? (
                <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap px-2 py-0.5">
                  <span
                    ref={editRef}
                    role="textbox"
                    contentEditable
                    suppressContentEditableWarning
                    className="outline-none caret-foreground min-w-[2ch]"
                    onInput={(e) => setEditValue(e.currentTarget.textContent ?? '')}
                    onBlur={saveEdit}
                    onKeyDown={handleEditKeyDown}
                  >
                    {email.value}
                  </span>
                </Badge>
              ) : (
                <span className="relative group/chip inline-flex">
                  <a
                    href={`mailto:${email.value}`}
                    className="inline-flex"
                    onDoubleClick={(e) => startEditing(e, email)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge variant="secondary" className="text-xs font-normal hover:bg-accent cursor-pointer whitespace-nowrap pr-4">
                      {email.value}
                    </Badge>
                  </a>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const prev = emails;
                      setOptimisticEmails(prev.filter((em) => em.id !== email.id));
                      onDeleteEmail(lead.id, email.id, () => setOptimisticEmails(null));
                    }}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/chip:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </span>
          ))}

          {!expanded && hiddenCount > 0 && (
            <button onClick={handleExpandClick}>
              <Badge variant="outline" className="text-xs font-normal shrink-0 cursor-pointer hover:bg-accent">
                +{hiddenCount}
              </Badge>
            </button>
          )}

          {expanded && hiddenCount > 0 && (
            <button
              onClick={handleExpandClick}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer italic"
            >
              collapse
            </button>
          )}

          {isCreating && (
            <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap px-2 py-0.5">
              <span
                ref={createRef}
                role="textbox"
                contentEditable
                suppressContentEditableWarning
                className="outline-none caret-foreground min-w-[4ch]"
                onInput={(e) => setCreateValue(e.currentTarget.textContent ?? '')}
                onBlur={saveCreate}
                onKeyDown={handleCreateKeyDown}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Plus icon on hover */}
      {!isCreating && (
        <button
          onClick={startCreating}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/email:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          <PlusCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminPage } from '../AdminPageContext';
import { EditableInlineField } from '../EditableInlineField';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

interface EditableFAQListProps {
  initialFaqs: FAQ[];
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-faq-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.startsWith('temp-faq-');
}

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

export function EditableFAQList({ initialFaqs }: EditableFAQListProps) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalFaqs, setOriginalFaqs] = useState<FAQ[]>(initialFaqs);
  const [currentFaqs, setCurrentFaqs] = useState<FAQ[]>(initialFaqs);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const currentRef = useRef(currentFaqs);
  const originalRef = useRef(originalFaqs);
  const deletedRef = useRef(deletedIds);
  currentRef.current = currentFaqs;
  originalRef.current = originalFaqs;
  deletedRef.current = deletedIds;

  const getOriginal = (id: string) => originalFaqs.find((f) => f.id === id);

  const getStatus = useCallback((faq: FAQ): ItemStatus => {
    if (deletedIds.has(faq.id)) return 'deleted';
    if (isTempId(faq.id)) return 'new';
    const orig = originalFaqs.find((f) => f.id === faq.id);
    if (orig && (orig.question !== faq.question || orig.answer !== faq.answer)) return 'modified';
    return 'unchanged';
  }, [originalFaqs, deletedIds]);

  const computeDirtyCount = useCallback((): number => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    let count = deleted.size;
    count += curr.filter((f) => isTempId(f.id)).length;

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((f) => f.id === c.id);
      if (o && (o.question !== c.question || o.answer !== c.answer)) count++;
    }

    return count;
  }, []);

  const saveFaqs = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;
    const deleted = deletedRef.current;

    const creates = curr.filter((f) => isTempId(f.id) && !deleted.has(f.id));
    for (const faq of creates) {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: faq.question, answer: faq.answer, sortOrder: faq.sortOrder }),
      });
      if (!res.ok) throw new Error('Failed to create FAQ');
    }

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((f) => f.id === c.id);
      if (o && (o.question !== c.question || o.answer !== c.answer)) {
        const res = await fetch(`/api/admin/faqs/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: c.question, answer: c.answer }),
        });
        if (!res.ok) throw new Error('Failed to update FAQ');
      }
    }

    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete FAQ');
    }

    const listRes = await fetch('/api/admin/faqs');
    if (listRes.ok) {
      const fresh: FAQ[] = await listRes.json();
      setOriginalFaqs(fresh);
      setCurrentFaqs(fresh);
      setDeletedIds(new Set());
    }
  }, []);

  const discardFaqs = useCallback(() => {
    setCurrentFaqs([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges('faqs', {
      count: computeDirtyCount(),
      save: saveFaqs,
      discard: discardFaqs,
    });
  }, [currentFaqs, originalFaqs, deletedIds, registerChanges, computeDirtyCount, saveFaqs, discardFaqs]);

  useEffect(() => {
    return () => unregisterChanges('faqs');
  }, [unregisterChanges]);

  const updateFaqField = (id: string, field: string, value: string) => {
    setCurrentFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleAdd = () => {
    setCurrentFaqs((prev) => [
      ...prev,
      { id: nextTempId(), question: '', answer: '', sortOrder: prev.length },
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrentFaqs((prev) => prev.filter((f) => f.id !== id));
    } else {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
    setDeleteConfirm(null);
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const borderClass = (status: ItemStatus): string => {
    switch (status) {
      case 'new': return 'border-2 border-dashed border-amber-400';
      case 'modified': return 'border-2 border-dashed border-amber-400';
      case 'deleted': return 'border-2 border-red-400 opacity-50';
      default: return 'border border-border';
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="space-y-6">
        {currentFaqs.map((faq) => {
          const status = getStatus(faq);
          const isDeleted = status === 'deleted';
          const orig = getOriginal(faq.id);

          return (
            <div
              key={faq.id}
              className={`group/card relative rounded-xl bg-white p-6 transition-all md:p-8 ${borderClass(status)}`}
            >
              {/* Status badge */}
              {status === 'new' && (
                <span className="absolute right-3 top-3 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">New</span>
              )}
              {status === 'modified' && (
                <span className="absolute right-3 top-3 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Modified</span>
              )}
              {status === 'deleted' && (
                <span className="absolute right-3 top-3 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">Will be removed</span>
              )}

              {/* Delete / Undo */}
              {isDeleted ? (
                <button onClick={() => handleUndoDelete(faq.id)} className="absolute left-3 top-3 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 shadow hover:bg-white">Undo</button>
              ) : (
                <button onClick={() => setDeleteConfirm(faq.id)} className="absolute right-3 top-3 rounded bg-white/80 p-1 text-gray-400 opacity-0 shadow transition-opacity hover:bg-white hover:text-red-500 group-hover/card:opacity-100" title="Delete FAQ">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}

              {/* Delete confirmation */}
              {deleteConfirm === faq.id && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/95">
                  <p className="text-sm font-medium text-gray-800">Delete this FAQ?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={() => handleDelete(faq.id)} className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">Delete</button>
                  </div>
                </div>
              )}

              {/* Question */}
              <div className="mb-4 pr-8">
                <EditableInlineField
                  value={faq.question}
                  onChangeValue={(v) => updateFaqField(faq.id, 'question', v)}
                  originalValue={orig?.question}
                  as="h2"
                  className="text-lg font-semibold text-text md:text-xl"
                  placeholder="Question..."
                  disabled={isDeleted}
                />
              </div>

              {/* Answer */}
              <EditableInlineField
                value={faq.answer}
                onChangeValue={(v) => updateFaqField(faq.id, 'answer', v)}
                originalValue={orig?.answer}
                as="p"
                multiline
                className="text-text-muted leading-relaxed"
                placeholder="Answer..."
                disabled={isDeleted}
              />
            </div>
          );
        })}

        {/* Add FAQ button */}
        <button
          onClick={handleAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-8 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-sm font-medium">Add FAQ</span>
        </button>
      </div>
    </div>
  );
}

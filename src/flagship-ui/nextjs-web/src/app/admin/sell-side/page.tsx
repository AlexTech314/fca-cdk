'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { EditableInlineField } from '@/components/admin/EditableInlineField';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

interface ServiceOffering {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  step: number | null;
  sortOrder: number;
}

// ============================================
// Temp ID helpers
// ============================================

let tempIdCounter = 0;
function nextTempId(prefix: string): string {
  return `${prefix}-new-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.includes('-new-');
}

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

// ============================================
// Editable Service Cards (title + description, 3-col grid)
// ============================================

function EditableServiceCards({ initialServices }: { initialServices: ServiceOffering[] }) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [original, setOriginal] = useState<ServiceOffering[]>(initialServices);
  const [current, setCurrent] = useState<ServiceOffering[]>(initialServices);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const currentRef = useRef(current);
  const originalRef = useRef(original);
  const deletedRef = useRef(deletedIds);
  currentRef.current = current;
  originalRef.current = original;
  deletedRef.current = deletedIds;

  const hasChanged = (a: ServiceOffering, b: ServiceOffering): boolean =>
    a.title !== b.title || a.description !== b.description;

  const getStatus = (item: ServiceOffering): ItemStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (isTempId(item.id)) return 'new';
    const orig = original.find((s) => s.id === item.id);
    if (orig && hasChanged(item, orig)) return 'modified';
    return 'unchanged';
  };

  const computeDirtyCount = useCallback((): number => {
    let count = deletedRef.current.size;
    for (const c of currentRef.current) {
      if (deletedRef.current.has(c.id)) continue;
      if (isTempId(c.id)) { count++; continue; }
      const o = originalRef.current.find((s) => s.id === c.id);
      if (o && hasChanged(c, o)) count++;
    }
    return count;
  }, []);

  const saveServices = useCallback(async () => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    // Creates
    for (const svc of curr.filter((s) => isTempId(s.id) && !deleted.has(s.id))) {
      const res = await authedApiFetch('/api/admin/service-offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: svc.title,
          description: svc.description,
          category: 'sell-side',
          type: 'service',
          sortOrder: svc.sortOrder,
        }),
      });
      if (!res.ok) throw new Error('Failed to create service');
    }

    // Updates
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((s) => s.id === c.id);
      if (o && hasChanged(c, o)) {
        const res = await authedApiFetch(`/api/admin/service-offerings/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: c.title, description: c.description }),
        });
        if (!res.ok) throw new Error('Failed to update service');
      }
    }

    // Deletes
    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await authedApiFetch(`/api/admin/service-offerings/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete service');
    }

    // Re-fetch
    const freshRes = await fetch(`${API_URL}/service-offerings?category=sell-side&type=service`);
    const fresh: ServiceOffering[] = freshRes.ok ? await freshRes.json() : [];
    setOriginal(fresh);
    setCurrent(fresh);
    setDeletedIds(new Set());
  }, []);

  const discardServices = useCallback(() => {
    setCurrent([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges('sellSideServices', {
      count: computeDirtyCount(),
      save: saveServices,
      discard: discardServices,
    });
  }, [current, original, deletedIds, registerChanges, computeDirtyCount, saveServices, discardServices]);

  useEffect(() => {
    return () => unregisterChanges('sellSideServices');
  }, [unregisterChanges]);

  const updateField = (id: string, field: 'title' | 'description', value: string) => {
    setCurrent((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleAdd = () => {
    setCurrent((prev) => [
      ...prev,
      { id: nextTempId('svc'), title: '', description: null, category: 'sell-side', type: 'service', step: null, sortOrder: prev.length },
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrent((prev) => prev.filter((s) => s.id !== id));
    } else {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {current.filter((s) => !deletedIds.has(s.id)).map((service) => {
          const status = getStatus(service);
          const orig = original.find((s) => s.id === service.id);

          return (
            <div
              key={service.id}
              className={`group/card relative rounded-xl border bg-white p-6 shadow-sm transition-all ${
                status === 'new' || status === 'modified'
                  ? 'border-amber-400 border-dashed'
                  : 'border-border hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10'
              }`}
            >
              <EditableInlineField
                value={service.title}
                onChangeValue={(v) => updateField(service.id, 'title', v)}
                originalValue={orig?.title}
                as="h3"
                className="mb-3 text-lg font-semibold text-primary"
                placeholder="Service title..."
              />
              <EditableInlineField
                value={service.description || ''}
                onChangeValue={(v) => updateField(service.id, 'description', v)}
                originalValue={orig?.description || ''}
                as="p"
                multiline
                className="text-text-muted"
                placeholder="Service description..."
              />

              {status !== 'unchanged' && (
                <p className="mt-2 text-[9px] font-medium text-amber-600">
                  {status === 'new' ? 'New' : 'Modified'}
                </p>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleDelete(service.id)}
                className="absolute right-2 top-2 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover/card:opacity-100"
                title="Remove"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Deleted items shown faded */}
        {current.filter((s) => deletedIds.has(s.id)).map((service) => (
          <div key={service.id} className="rounded-xl border border-red-300 bg-red-50/50 p-6 opacity-60">
            <h3 className="text-lg font-semibold text-primary line-through">{service.title}</h3>
            <p className="mt-2 text-[9px] font-medium text-red-500">Will be removed on save</p>
            <button onClick={() => handleUndoDelete(service.id)} className="mt-1 text-[10px] font-medium text-red-500 hover:text-red-700">
              Undo
            </button>
          </div>
        ))}

        {/* Add card */}
        <button
          onClick={handleAdd}
          className="flex min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Service
          </div>
        </button>
      </div>
    </>
  );
}

// ============================================
// Editable Process Steps (numbered cards, 4-col grid)
// ============================================

function EditableProcessSteps({ initialSteps }: { initialSteps: ServiceOffering[] }) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const sorted = [...initialSteps].sort((a, b) => (a.step ?? a.sortOrder) - (b.step ?? b.sortOrder));
  const [original, setOriginal] = useState<ServiceOffering[]>(sorted);
  const [current, setCurrent] = useState<ServiceOffering[]>(sorted);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const currentRef = useRef(current);
  const originalRef = useRef(original);
  const deletedRef = useRef(deletedIds);
  currentRef.current = current;
  originalRef.current = original;
  deletedRef.current = deletedIds;

  const hasChanged = (a: ServiceOffering, b: ServiceOffering): boolean =>
    a.title !== b.title || a.description !== b.description;

  const getStatus = (item: ServiceOffering): ItemStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (isTempId(item.id)) return 'new';
    const orig = original.find((s) => s.id === item.id);
    if (orig && hasChanged(item, orig)) return 'modified';
    return 'unchanged';
  };

  const computeDirtyCount = useCallback((): number => {
    let count = deletedRef.current.size;
    for (const c of currentRef.current) {
      if (deletedRef.current.has(c.id)) continue;
      if (isTempId(c.id)) { count++; continue; }
      const o = originalRef.current.find((s) => s.id === c.id);
      if (o && hasChanged(c, o)) count++;
    }
    return count;
  }, []);

  const saveSteps = useCallback(async () => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    // Creates
    const activeItems = curr.filter((s) => !deleted.has(s.id));
    for (const svc of curr.filter((s) => isTempId(s.id) && !deleted.has(s.id))) {
      const stepNum = activeItems.indexOf(svc) + 1;
      const res = await authedApiFetch('/api/admin/service-offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: svc.title,
          description: svc.description,
          category: 'sell-side',
          type: 'process-step',
          step: stepNum,
          sortOrder: stepNum,
        }),
      });
      if (!res.ok) throw new Error('Failed to create process step');
    }

    // Updates
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((s) => s.id === c.id);
      if (o && hasChanged(c, o)) {
        const res = await authedApiFetch(`/api/admin/service-offerings/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: c.title, description: c.description }),
        });
        if (!res.ok) throw new Error('Failed to update process step');
      }
    }

    // Deletes
    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await authedApiFetch(`/api/admin/service-offerings/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete process step');
    }

    // Re-fetch
    const freshRes = await fetch(`${API_URL}/service-offerings?category=sell-side&type=process-step`);
    const fresh: ServiceOffering[] = freshRes.ok ? await freshRes.json() : [];
    const freshSorted = [...fresh].sort((a, b) => (a.step ?? a.sortOrder) - (b.step ?? b.sortOrder));
    setOriginal(freshSorted);
    setCurrent(freshSorted);
    setDeletedIds(new Set());
  }, []);

  const discardSteps = useCallback(() => {
    setCurrent([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges('sellSideProcessSteps', {
      count: computeDirtyCount(),
      save: saveSteps,
      discard: discardSteps,
    });
  }, [current, original, deletedIds, registerChanges, computeDirtyCount, saveSteps, discardSteps]);

  useEffect(() => {
    return () => unregisterChanges('sellSideProcessSteps');
  }, [unregisterChanges]);

  const updateField = (id: string, field: 'title' | 'description', value: string) => {
    setCurrent((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleAdd = () => {
    const activeCount = current.filter((s) => !deletedIds.has(s.id)).length;
    setCurrent((prev) => [
      ...prev,
      { id: nextTempId('step'), title: '', description: null, category: 'sell-side', type: 'process-step', step: activeCount + 1, sortOrder: activeCount + 1 },
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrent((prev) => prev.filter((s) => s.id !== id));
    } else {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const activeSteps = current.filter((s) => !deletedIds.has(s.id));
  const deletedSteps = current.filter((s) => deletedIds.has(s.id));

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {activeSteps.map((step, index) => {
          const status = getStatus(step);
          const orig = original.find((s) => s.id === step.id);

          return (
            <div
              key={step.id}
              className={`group/step relative ${
                status === 'new' || status === 'modified'
                  ? 'rounded-lg border border-dashed border-amber-400 bg-amber-50/30 p-3 -m-3'
                  : ''
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white">
                {index + 1}
              </div>
              <EditableInlineField
                value={step.title}
                onChangeValue={(v) => updateField(step.id, 'title', v)}
                originalValue={orig?.title}
                as="h3"
                className="mb-2 text-lg font-semibold text-primary"
                placeholder="Step title..."
              />
              <EditableInlineField
                value={step.description || ''}
                onChangeValue={(v) => updateField(step.id, 'description', v)}
                originalValue={orig?.description || ''}
                as="p"
                multiline
                className="text-text-muted"
                placeholder="Step description..."
              />

              {status !== 'unchanged' && (
                <p className="mt-2 text-[9px] font-medium text-amber-600">
                  {status === 'new' ? 'New' : 'Modified'}
                </p>
              )}

              <button
                onClick={() => handleDelete(step.id)}
                className="absolute right-1 top-1 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover/step:opacity-100"
                title="Remove"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Deleted steps */}
        {deletedSteps.map((step) => (
          <div key={step.id} className="rounded-lg border border-red-300 bg-red-50/50 p-3 opacity-60">
            <h3 className="text-lg font-semibold text-primary line-through">{step.title}</h3>
            <p className="mt-2 text-[9px] font-medium text-red-500">Will be removed on save</p>
            <button onClick={() => handleUndoDelete(step.id)} className="mt-1 text-[10px] font-medium text-red-500 hover:text-red-700">
              Undo
            </button>
          </div>
        ))}

        {/* Add step */}
        <button
          onClick={handleAdd}
          className="flex min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Step
          </div>
        </button>
      </div>
    </>
  );
}

// ============================================
// Editable bullet list for whyChooseUs metadata
// ============================================

interface BulletItem {
  id: string;
  text: string;
}

type BulletStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

let bulletIdCounter = 0;
function nextBulletId(): string {
  return `bullet-new-${++bulletIdCounter}`;
}

function parseBullets(value: string): BulletItem[] {
  return value
    .split('\n')
    .filter((s) => s.trim())
    .map((text, i) => ({ id: `bullet-${i}`, text }));
}

function EditableBulletList({
  metaKey,
  value,
  onChange,
  itemLabel = 'item',
}: {
  metaKey: string;
  value: string;
  onChange: (key: string, value: string) => void;
  itemLabel?: string;
}) {
  const { saveStatus } = useAdminPage();

  const [items, setItems] = useState<BulletItem[]>(() => parseBullets(value));
  const [origItems, setOrigItems] = useState<BulletItem[]>(() => parseBullets(value));
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  // Track whether we triggered the value change ourselves
  const selfUpdate = useRef(false);

  // Re-initialize on save success
  useEffect(() => {
    if (saveStatus === 'success') {
      const parsed = parseBullets(value);
      setItems(parsed);
      setOrigItems(parsed);
      setDeletedIds(new Set());
    }
  }, [saveStatus, value]);

  // Detect external changes (discard) by watching the metadata value
  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    const parsed = parseBullets(value);
    setItems(parsed);
    setOrigItems(parsed);
    setDeletedIds(new Set());
  }, [value]);

  // Sync the "final" value (non-deleted items) to metadata
  const syncToMeta = (currentItems: BulletItem[], deleted: Set<string>) => {
    const finalValue = currentItems
      .filter((item) => !deleted.has(item.id))
      .map((item) => item.text)
      .filter((t) => t.trim())
      .join('\n');
    selfUpdate.current = true;
    onChange(metaKey, finalValue);
  };

  const getStatus = (item: BulletItem): BulletStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (item.id.startsWith('bullet-new-')) return 'new';
    const orig = origItems.find((o) => o.id === item.id);
    if (orig && orig.text !== item.text) return 'modified';
    return 'unchanged';
  };

  const updateItemText = (id: string, text: string) => {
    const updated = items.map((item) => (item.id === id ? { ...item, text } : item));
    setItems(updated);
    syncToMeta(updated, deletedIds);
  };

  const handleDelete = (id: string) => {
    if (id.startsWith('bullet-new-')) {
      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      syncToMeta(updated, deletedIds);
    } else {
      const newDeleted = new Set(deletedIds);
      newDeleted.add(id);
      setDeletedIds(newDeleted);
      syncToMeta(items, newDeleted);
    }
  };

  const handleUndoDelete = (id: string) => {
    const newDeleted = new Set(deletedIds);
    newDeleted.delete(id);
    setDeletedIds(newDeleted);
    syncToMeta(items, newDeleted);
  };

  const handleAdd = () => {
    const newItem: BulletItem = { id: nextBulletId(), text: '' };
    setItems((prev) => [...prev, newItem]);
  };

  return (
    <>
      <ul className="space-y-4">
        {items.map((item) => {
          const status = getStatus(item);
          const isDeleted = status === 'deleted';
          const orig = origItems.find((o) => o.id === item.id);

          return (
            <li key={item.id} className="group/item relative">
              <div className={`flex items-start gap-3 rounded px-1 py-0.5 transition-all ${
                status === 'new' || status === 'modified'
                  ? 'border border-dashed border-amber-400 bg-amber-50/50'
                  : isDeleted
                    ? 'border border-red-300 bg-red-50/50 opacity-60'
                    : ''
              }`}>
                <svg
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isDeleted ? 'text-red-400' : 'text-secondary'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>

                <EditableInlineField
                  value={item.text}
                  onChangeValue={(v) => updateItemText(item.id, v)}
                  originalValue={orig?.text}
                  as="span"
                  className="flex-1 text-text-muted"
                  placeholder={`${itemLabel}...`}
                  disabled={isDeleted}
                />

                {isDeleted ? (
                  <button onClick={() => handleUndoDelete(item.id)} className="shrink-0 text-[10px] font-medium text-red-500 hover:text-red-700">Undo</button>
                ) : (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
                    title="Remove"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {status === 'new' && <p className="ml-8 text-[9px] font-medium text-amber-600">New</p>}
              {status === 'modified' && <p className="ml-8 text-[9px] font-medium text-amber-600">Modified</p>}
              {status === 'deleted' && <p className="ml-8 text-[9px] font-medium text-red-500">Will be removed on save</p>}
            </li>
          );
        })}
      </ul>
      <button
        onClick={handleAdd}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-blue-500"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add {itemLabel}
      </button>
    </>
  );
}

// ============================================
// Inner content (needs AdminPageContext)
// ============================================

function SellSidePageContent({
  services,
  processSteps,
}: {
  services: ServiceOffering[];
  processSteps: ServiceOffering[];
}) {
  const { data, updateField, dirtyFields, saveStatus } = useAdminPage();
  const meta = data.metadata;

  // Split content at --- to separate intro from approach text
  const contentSections = (data.content || '').split('---').map((s) => s.trim()).filter(Boolean);
  const introParagraphs = contentSections[0]?.split('\n\n').filter((p: string) => p.trim()) || [];
  const approachText = contentSections[1]?.split('\n\n').filter((p: string) => p.trim()) || [];

  // Track original content for dirty detection
  const [origContent, setOrigContent] = useState(data.content || '');
  useEffect(() => {
    if (saveStatus === 'success') {
      setOrigContent(data.content || '');
    }
  }, [saveStatus, data.content]);

  const origSections = origContent.split('---').map((s) => s.trim()).filter(Boolean);
  const origIntroParagraphs = origSections[0]?.split('\n\n').filter((p: string) => p.trim()) || [];
  const origApproachParagraphs = origSections[1]?.split('\n\n').filter((p: string) => p.trim()) || [];

  const isIntroParagraphDirty = (index: number): boolean => {
    if (index >= origIntroParagraphs.length) return true;
    return introParagraphs[index] !== origIntroParagraphs[index];
  };

  const isApproachParagraphDirty = (index: number): boolean => {
    if (index >= origApproachParagraphs.length) return true;
    return approachText[index] !== origApproachParagraphs[index];
  };

  const rebuildContent = (introParas: string[], approachParas: string[]) => {
    const intro = introParas.join('\n\n');
    const approach = approachParas.join('\n\n');
    if (approach) {
      updateField('content', `${intro}\n\n---\n\n${approach}`);
    } else {
      updateField('content', intro);
    }
  };

  const handleIntroParagraphChange = (_key: string, value: string, index: number) => {
    const updated = [...introParagraphs];
    updated[index] = value;
    rebuildContent(updated, approachText);
  };

  const handleApproachParagraphChange = (_key: string, value: string, index: number) => {
    const updated = [...approachText];
    updated[index] = value;
    rebuildContent(introParagraphs, updated);
  };

  return (
    <div className="bg-background">
      {/* Hero — matches public Hero compact variant */}
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}
      >
        <div className="container-max text-center">
          <EditableField
            fieldKey="subtitle"
            value={meta.subtitle || ''}
            onChange={updateField}
            as="p"
            className="mb-2 text-sm font-semibold uppercase tracking-wider"
            style={{ color: '#7dd3fc' }}
            isDirty={dirtyFields.has('subtitle')}
            placeholder="Subtitle..."
          />
          <EditableField
            fieldKey="title"
            value={data.title}
            onChange={updateField}
            as="h1"
            className="text-3xl font-bold md:text-4xl lg:text-5xl"
            style={{ color: '#ffffff' }}
            isDirty={dirtyFields.has('title')}
            placeholder="Page title..."
          />
          <EditableField
            fieldKey="description"
            value={meta.description || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-lg"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            isDirty={dirtyFields.has('description')}
            placeholder="Hero description..."
          />
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Introduction</p>
            {introParagraphs.map((p: string, i: number) => (
              <EditableField
                key={`intro-${i}`}
                fieldKey={`intro-para-${i}`}
                value={p}
                onChange={(_key, value) => handleIntroParagraphChange(_key, value, i)}
                as="p"
                className={`text-lg leading-relaxed text-text-muted${i > 0 ? ' mt-4' : ''}`}
                isDirty={isIntroParagraphDirty(i)}
                placeholder="Paragraph text..."
              />
            ))}
          </div>
        </div>
      </section>

      {/* Services — editable card grid */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="servicesSubtitle"
              value={meta.servicesSubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('servicesSubtitle')}
              placeholder="Section subtitle..."
            />
            <EditableField
              fieldKey="servicesTitle"
              value={meta.servicesTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('servicesTitle')}
              placeholder="Section title..."
            />
            <EditableField
              fieldKey="servicesDescription"
              value={meta.servicesDescription || ''}
              onChange={updateField}
              as="p"
              className="mx-auto mt-4 max-w-2xl text-lg text-text-muted"
              isDirty={dirtyFields.has('servicesDescription')}
              placeholder="Section description..."
            />
          </div>

          <EditableServiceCards initialServices={services} />
        </div>
      </section>

      {/* Our Process — editable numbered step grid */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="processSubtitle"
              value={meta.processSubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('processSubtitle')}
              placeholder="Section subtitle..."
            />
            <EditableField
              fieldKey="processTitle"
              value={meta.processTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('processTitle')}
              placeholder="Section title..."
            />
            <EditableField
              fieldKey="processDescription"
              value={meta.processDescription || ''}
              onChange={updateField}
              as="p"
              className="mx-auto mt-4 max-w-2xl text-lg text-text-muted"
              isDirty={dirtyFields.has('processDescription')}
              placeholder="Section description..."
            />
          </div>

          <EditableProcessSteps initialSteps={processSteps} />
        </div>
      </section>

      {/* Why Choose Us — 2-column layout */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <div className="container-max">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <EditableField
                fieldKey="advantageTitle"
                value={meta.advantageTitle || ''}
                onChange={updateField}
                as="p"
                className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
                isDirty={dirtyFields.has('advantageTitle')}
                placeholder="The Flatirons Advantage"
              />
              <EditableField
                fieldKey="advantageSubtitle"
                value={meta.advantageSubtitle || ''}
                onChange={updateField}
                as="h2"
                className="mb-6 text-3xl font-bold text-primary md:text-4xl"
                isDirty={dirtyFields.has('advantageSubtitle')}
                placeholder="Why Choose Flatirons?"
              />
              {approachText.map((p: string, i: number) => (
                <EditableField
                  key={`approach-${i}`}
                  fieldKey={`approach-para-${i}`}
                  value={p}
                  onChange={(_key, value) => handleApproachParagraphChange(_key, value, i)}
                  as="p"
                  className={`text-lg text-text-muted${i > 0 ? ' mt-4' : ''}`}
                  isDirty={isApproachParagraphDirty(i)}
                  placeholder="Paragraph text..."
                />
              ))}
            </div>

            <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
              <EditableBulletList
                metaKey="whyChooseUs"
                value={meta.whyChooseUs || ''}
                onChange={updateField}
                itemLabel="reason"
              />
            </div>
          </div>

          <div className="mt-12 text-center">
            <span className="inline-flex items-center justify-center rounded-md border-2 border-primary px-6 py-3 text-base font-semibold text-primary opacity-60">
              View Our Transaction History
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}
      >
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <EditableField
              fieldKey="ctaTitle"
              value={meta.ctaTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold md:text-4xl"
              style={{ color: '#ffffff' }}
              isDirty={dirtyFields.has('ctaTitle')}
              placeholder="Ready to explore your options?"
            />
            <EditableField
              fieldKey="ctaDescription"
              value={meta.ctaDescription || ''}
              onChange={updateField}
              as="p"
              className="mt-4 text-lg"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
              isDirty={dirtyFields.has('ctaDescription')}
              placeholder="CTA description..."
            />
            <div className="mt-8">
              <span
                className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold transition-all duration-200"
                style={{
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
              >
                <EditableField
                  fieldKey="ctaText"
                  value={meta.ctaText || ''}
                  onChange={updateField}
                  as="span"
                  isDirty={dirtyFields.has('ctaText')}
                  placeholder="Button text..."
                />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// Main page component
// ============================================

export default function AdminSellSidePage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [processSteps, setProcessSteps] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, servicesRes, processRes] = await Promise.all([
          authedApiFetch('/api/admin/pages/sell-side'),
          fetch(`${API_URL}/service-offerings?category=sell-side&type=service`),
          fetch(`${API_URL}/service-offerings?category=sell-side&type=process-step`),
        ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const servicesData: ServiceOffering[] = servicesRes.ok ? await servicesRes.json() : [];
        const processData: ServiceOffering[] = processRes.ok ? await processRes.json() : [];

        const metadata: Record<string, string> = {};
        if (page.metadata) {
          for (const [key, value] of Object.entries(page.metadata)) {
            metadata[key] = String(value ?? '');
          }
        }

        setPageData({
          title: page.title || '',
          content: page.content || '',
          metadata,
        });
        setServices(servicesData);
        setProcessSteps(processData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-text-muted">Loading page editor...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Failed to load page data</p>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminPageProvider pageKey="sell-side" initialData={pageData}>
      <SellSidePageContent services={services} processSteps={processSteps} />
      <SaveBar />
    </AdminPageProvider>
  );
}

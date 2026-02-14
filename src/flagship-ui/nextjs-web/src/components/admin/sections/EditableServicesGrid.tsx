'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EditableField } from '../EditableField';
import { EditableInlineField } from '../EditableInlineField';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { useAdminPage } from '../AdminPageContext';

interface ServiceOffering {
  id: string;
  title: string;
  category: string;
  type: string;
  sortOrder?: number;
}

interface EditableServicesGridProps {
  initialBuySide: ServiceOffering[];
  initialSellSide: ServiceOffering[];
  initialStrategic: ServiceOffering[];
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-svc-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.startsWith('temp-svc-');
}

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

// Icons
const searchIcon = (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
const chartIcon = (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);
const analyticsIcon = (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
);

export function EditableServicesGrid({
  initialBuySide,
  initialSellSide,
  initialStrategic,
}: EditableServicesGridProps) {
  const { data, updateField, dirtyFields, registerChanges, unregisterChanges } = useAdminPage();
  const meta = data.metadata;

  // Combine all initial services into a flat list
  const allInitial = [...initialBuySide, ...initialSellSide, ...initialStrategic];

  const [originalServices, setOriginalServices] = useState<ServiceOffering[]>(allInitial);
  const [currentServices, setCurrentServices] = useState<ServiceOffering[]>(allInitial);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  // (editing state removed -- using EditableInlineField)

  // Refs for stable closures
  const currentRef = useRef(currentServices);
  const originalRef = useRef(originalServices);
  const deletedRef = useRef(deletedIds);
  currentRef.current = currentServices;
  originalRef.current = originalServices;
  deletedRef.current = deletedIds;

  // Helper to update a service title
  const updateServiceTitle = (id: string, title: string) => {
    setCurrentServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  };

  // Get items for a category
  const getItems = (category: string) =>
    currentServices.filter((s) => s.category === category && s.type === 'service');

  // Get status of an item
  const getStatus = useCallback((item: ServiceOffering): ItemStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (isTempId(item.id)) return 'new';
    const orig = originalServices.find((s) => s.id === item.id);
    if (orig && orig.title !== item.title) return 'modified';
    return 'unchanged';
  }, [originalServices, deletedIds]);

  // Compute dirty count
  const computeDirtyCount = useCallback((): number => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    let count = deleted.size;
    count += curr.filter((s) => isTempId(s.id)).length;

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((s) => s.id === c.id);
      if (o && o.title !== c.title) count++;
    }

    return count;
  }, []);

  // Save
  const saveServices = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;
    const deleted = deletedRef.current;

    // Creates
    const creates = curr.filter((s) => isTempId(s.id) && !deleted.has(s.id));
    for (const svc of creates) {
      const res = await authedApiFetch('/api/admin/service-offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: svc.title,
          category: svc.category,
          type: svc.type,
          sortOrder: svc.sortOrder ?? 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to create service offering');
    }

    // Updates
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((s) => s.id === c.id);
      if (o && o.title !== c.title) {
        const res = await authedApiFetch(`/api/admin/service-offerings/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: c.title }),
        });
        if (!res.ok) throw new Error('Failed to update service offering');
      }
    }

    // Deletes
    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await authedApiFetch(`/api/admin/service-offerings/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete service offering');
    }

    // Re-fetch all three categories
    const [buyRes, sellRes, stratRes] = await Promise.all([
      authedApiFetch('/api/admin/service-offerings?category=buy-side&type=service'),
      authedApiFetch('/api/admin/service-offerings?category=sell-side&type=service'),
      authedApiFetch('/api/admin/service-offerings?category=strategic&type=service'),
    ]);

    const fresh = [
      ...(buyRes.ok ? await buyRes.json() : []),
      ...(sellRes.ok ? await sellRes.json() : []),
      ...(stratRes.ok ? await stratRes.json() : []),
    ];

    setOriginalServices(fresh);
    setCurrentServices(fresh);
    setDeletedIds(new Set());
  }, []);

  // Discard
  const discardServices = useCallback(() => {
    setCurrentServices([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  // Register with change registry
  useEffect(() => {
    registerChanges('services', {
      count: computeDirtyCount(),
      save: saveServices,
      discard: discardServices,
    });
  }, [currentServices, originalServices, deletedIds, registerChanges, computeDirtyCount, saveServices, discardServices]);

  useEffect(() => {
    return () => unregisterChanges('services');
  }, [unregisterChanges]);

  // --- Handlers ---

  // (startEdit/commitEdit removed -- using EditableInlineField)

  const handleAdd = (category: string) => {
    const items = currentServices.filter((s) => s.category === category && s.type === 'service');
    const newId = nextTempId();
    setCurrentServices((prev) => [
      ...prev,
      { id: newId, title: '', category, type: 'service', sortOrder: items.length },
    ]);
    // New item will show as empty with placeholder
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrentServices((prev) => prev.filter((s) => s.id !== id));
    } else {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
    // (no editingId to clear -- using EditableInlineField)
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const categories = [
    { key: 'buy-side', title: 'Buy-Side Advisory', descriptionKey: 'buySideDescription', href: '/buy-side', icon: searchIcon },
    { key: 'sell-side', title: 'Sell-Side Advisory', descriptionKey: 'sellSideDescription', href: '/sell-side', icon: chartIcon },
    { key: 'strategic', title: 'Strategic Consulting', descriptionKey: 'strategicDescription', href: '/about', icon: analyticsIcon },
  ];

  return (
    <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
      <div className="container-max">
        {/* Section heading */}
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

        <div className="grid gap-8 md:grid-cols-3">
          {categories.map((cat) => {
            const items = getItems(cat.key);

            return (
              <div
                key={cat.key}
                className="group/card flex h-full flex-col rounded-xl border border-border bg-white p-8 shadow-sm transition-all duration-200 hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-primary">
                  {cat.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-primary">
                  {cat.title}
                </h3>
                <EditableField
                  fieldKey={cat.descriptionKey}
                  value={meta[cat.descriptionKey] || ''}
                  onChange={updateField}
                  as="p"
                  className="mb-4 text-text-muted"
                  isDirty={dirtyFields.has(cat.descriptionKey)}
                  placeholder="Category description..."
                />

                {/* Editable bullet list */}
                <ul className="mb-6 space-y-1">
                  {items.map((item) => {
                    const status = getStatus(item);
                    const isDeleted = status === 'deleted';
                    const orig = originalServices.find((s) => s.id === item.id);

                    return (
                      <li key={item.id} className="group/item relative">
                        <div className={`flex items-center gap-2 rounded px-1 py-0.5 transition-all ${
                          status === 'new' || status === 'modified'
                            ? 'border border-dashed border-amber-400 bg-amber-50/50'
                            : isDeleted
                              ? 'border border-red-300 bg-red-50/50 opacity-60'
                              : ''
                        }`}>
                          {/* Checkmark icon */}
                          <svg
                            className={`h-4 w-4 shrink-0 ${isDeleted ? 'text-red-400' : 'text-secondary'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>

                          {/* Title -- contentEditable inline field */}
                          <EditableInlineField
                            value={item.title}
                            onChangeValue={(v) => updateServiceTitle(item.id, v)}
                            originalValue={orig?.title}
                            as="span"
                            className="flex-1 text-sm text-text-muted"
                            placeholder="Service title..."
                            disabled={isDeleted}
                          />

                          {/* Action buttons */}
                          {isDeleted ? (
                            <button
                              onClick={() => handleUndoDelete(item.id)}
                              className="shrink-0 text-[10px] font-medium text-red-500 hover:text-red-700"
                            >
                              Undo
                            </button>
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

                        {/* Status label */}
                        {status === 'new' && (
                          <p className="ml-6 text-[9px] font-medium text-amber-600">New</p>
                        )}
                        {status === 'modified' && (
                          <p className="ml-6 text-[9px] font-medium text-amber-600">Modified</p>
                        )}
                        {status === 'deleted' && (
                          <p className="ml-6 text-[9px] font-medium text-red-500">Will be removed</p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Add button */}
                <button
                  onClick={() => handleAdd(cat.key)}
                  className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-blue-500"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add service
                </button>

                <div className="mt-auto flex justify-end">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary">
                    Learn More
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

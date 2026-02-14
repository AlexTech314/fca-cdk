'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminPage } from '../AdminPageContext';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { EditableInlineField } from '../EditableInlineField';

interface CommunityService {
  id: string;
  name: string;
  description: string;
  url: string;
  sortOrder: number;
}

interface EditableCommunityServicesProps {
  initialServices: CommunityService[];
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-cs-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.startsWith('temp-cs-');
}

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

export function EditableCommunityServices({ initialServices }: EditableCommunityServicesProps) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalServices, setOriginalServices] = useState<CommunityService[]>(initialServices);
  const [currentServices, setCurrentServices] = useState<CommunityService[]>(initialServices);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const currentRef = useRef(currentServices);
  const originalRef = useRef(originalServices);
  const deletedRef = useRef(deletedIds);
  currentRef.current = currentServices;
  originalRef.current = originalServices;
  deletedRef.current = deletedIds;

  const getOriginal = (id: string) => originalServices.find((s) => s.id === id);

  const getStatus = useCallback((svc: CommunityService): ItemStatus => {
    if (deletedIds.has(svc.id)) return 'deleted';
    if (isTempId(svc.id)) return 'new';
    const orig = originalServices.find((s) => s.id === svc.id);
    if (orig && (orig.name !== svc.name || orig.description !== svc.description || orig.url !== svc.url)) {
      return 'modified';
    }
    return 'unchanged';
  }, [originalServices, deletedIds]);

  const computeDirtyCount = useCallback((): number => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    let count = deleted.size;
    count += curr.filter((s) => isTempId(s.id)).length;

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((s) => s.id === c.id);
      if (o && (o.name !== c.name || o.description !== c.description || o.url !== c.url)) count++;
    }

    return count;
  }, []);

  const saveServices = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;
    const deleted = deletedRef.current;

    const creates = curr.filter((s) => isTempId(s.id) && !deleted.has(s.id));
    for (const svc of creates) {
      const res = await authedApiFetch('/api/admin/community-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: svc.name, description: svc.description, url: svc.url, sortOrder: svc.sortOrder }),
      });
      if (!res.ok) throw new Error('Failed to create community service');
    }

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((s) => s.id === c.id);
      if (o && (o.name !== c.name || o.description !== c.description || o.url !== c.url)) {
        const res = await authedApiFetch(`/api/admin/community-services/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: c.name, description: c.description, url: c.url }),
        });
        if (!res.ok) throw new Error('Failed to update community service');
      }
    }

    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await authedApiFetch(`/api/admin/community-services/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete community service');
    }

    const listRes = await authedApiFetch('/api/admin/community-services');
    if (listRes.ok) {
      const fresh: CommunityService[] = await listRes.json();
      setOriginalServices(fresh);
      setCurrentServices(fresh);
      setDeletedIds(new Set());
    }
  }, []);

  const discardServices = useCallback(() => {
    setCurrentServices([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges('community-services', {
      count: computeDirtyCount(),
      save: saveServices,
      discard: discardServices,
    });
  }, [currentServices, originalServices, deletedIds, registerChanges, computeDirtyCount, saveServices, discardServices]);

  useEffect(() => {
    return () => unregisterChanges('community-services');
  }, [unregisterChanges]);

  const updateField = (id: string, field: string, value: string) => {
    setCurrentServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAdd = () => {
    setCurrentServices((prev) => [
      ...prev,
      { id: nextTempId(), name: '', description: '', url: '', sortOrder: prev.length },
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrentServices((prev) => prev.filter((s) => s.id !== id));
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {currentServices.map((svc) => {
        const status = getStatus(svc);
        const isDeleted = status === 'deleted';
        const orig = getOriginal(svc.id);

        return (
          <div
            key={svc.id}
            className={`group/card relative rounded-lg bg-surface p-5 transition-all ${borderClass(status)}`}
          >
            {status === 'new' && (
              <span className="absolute right-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">New</span>
            )}
            {status === 'modified' && (
              <span className="absolute right-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Modified</span>
            )}
            {status === 'deleted' && (
              <span className="absolute right-2 top-2 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">Will be removed</span>
            )}

            {isDeleted ? (
              <button onClick={() => handleUndoDelete(svc.id)} className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 shadow hover:bg-white">Undo</button>
            ) : (
              <button onClick={() => setDeleteConfirm(svc.id)} className="absolute right-2 top-2 rounded bg-white/80 p-1 text-gray-400 opacity-0 shadow transition-opacity hover:bg-white hover:text-red-500 group-hover/card:opacity-100" title="Delete">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            )}

            {deleteConfirm === svc.id && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/95">
                <p className="text-sm font-medium text-gray-800">Delete {svc.name || 'this service'}?</p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(null)} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={() => handleDelete(svc.id)} className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">Delete</button>
                </div>
              </div>
            )}

            <div className="pr-8">
              <EditableInlineField
                value={svc.name}
                onChangeValue={(v) => updateField(svc.id, 'name', v)}
                originalValue={orig?.name}
                as="h4"
                className="text-base font-semibold text-primary"
                placeholder="Service name..."
                disabled={isDeleted}
              />
              <div className="mt-2">
                <EditableInlineField
                  value={svc.description}
                  onChangeValue={(v) => updateField(svc.id, 'description', v)}
                  originalValue={orig?.description}
                  as="p"
                  multiline
                  className="text-sm text-text-muted"
                  placeholder="Description..."
                  disabled={isDeleted}
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
                </svg>
                <EditableInlineField
                  value={svc.url}
                  onChangeValue={(v) => updateField(svc.id, 'url', v)}
                  originalValue={orig?.url}
                  as="span"
                  className="text-xs text-text-muted"
                  placeholder="URL..."
                  disabled={isDeleted}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={handleAdd}
        className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className="text-sm font-medium">Add Service</span>
      </button>
    </div>
  );
}

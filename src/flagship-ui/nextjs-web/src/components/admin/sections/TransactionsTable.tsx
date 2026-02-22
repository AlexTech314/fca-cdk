'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminPage } from '../AdminPageContext';
import { useUnsavedChanges } from '../UnsavedChangesContext';
import { EditableInlineField } from '../EditableInlineField';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { toAssetUrl } from '@/lib/utils';

interface Tombstone {
  id: string;
  name: string;
  slug: string;
  assetId: string | null;
  asset?: { id: string; s3Key: string; fileName: string; fileType: string } | null;
  industry: string | null;
  role: string | null;
  buyerPeFirm: string | null;
  buyerPlatform: string | null;
  transactionYear: number | null;
  isPublished: boolean;
  industries: { id: string; name: string; slug: string }[];
}

interface TransactionsTableProps {
  initialTombstones: Tombstone[];
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-tomb-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.startsWith('temp-tomb-');
}

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

export function TransactionsTable({ initialTombstones }: TransactionsTableProps) {
  const { registerChanges, unregisterChanges } = useAdminPage();
  const { requestNavigation } = useUnsavedChanges();

  const [originalItems, setOriginalItems] = useState<Tombstone[]>(initialTombstones);
  const [currentItems, setCurrentItems] = useState<Tombstone[]>(initialTombstones);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const currentRef = useRef(currentItems);
  const originalRef = useRef(originalItems);
  const deletedRef = useRef(deletedIds);
  currentRef.current = currentItems;
  originalRef.current = originalItems;
  deletedRef.current = deletedIds;

  const getOriginal = (id: string) => originalItems.find((t) => t.id === id);

  const hasFieldChanged = (curr: Tombstone, orig: Tombstone): boolean => {
    return (
      curr.name !== orig.name ||
      curr.industry !== orig.industry ||
      curr.buyerPeFirm !== orig.buyerPeFirm ||
      curr.buyerPlatform !== orig.buyerPlatform ||
      (curr.transactionYear ?? null) !== (orig.transactionYear ?? null) ||
      curr.isPublished !== orig.isPublished
    );
  };

  const getStatus = useCallback((item: Tombstone): ItemStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (isTempId(item.id)) return 'new';
    const orig = originalItems.find((t) => t.id === item.id);
    if (orig && hasFieldChanged(item, orig)) return 'modified';
    return 'unchanged';
  }, [originalItems, deletedIds]);

  const computeDirtyCount = useCallback((): number => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    let count = deleted.size;
    count += curr.filter((t) => isTempId(t.id)).length;

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((t) => t.id === c.id);
      if (o && hasFieldChanged(c, o)) count++;
    }

    return count;
  }, []);

  const saveItems = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;
    const deleted = deletedRef.current;

    // Creates
    const creates = curr.filter((t) => isTempId(t.id) && !deleted.has(t.id));
    for (const item of creates) {
      const res = await authedApiFetch('/api/admin/tombstones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name || 'Untitled Transaction',
          industry: item.industry,
          buyerPeFirm: item.buyerPeFirm,
          buyerPlatform: item.buyerPlatform,
          transactionYear: item.transactionYear,
          isPublished: item.isPublished,
        }),
      });
      if (!res.ok) throw new Error('Failed to create transaction');
    }

    // Updates
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((t) => t.id === c.id);
      if (o && hasFieldChanged(c, o)) {
        const res = await authedApiFetch(`/api/admin/tombstones/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: c.name,
            industry: c.industry,
            buyerPeFirm: c.buyerPeFirm,
            buyerPlatform: c.buyerPlatform,
            transactionYear: c.transactionYear,
          }),
        });
        if (!res.ok) throw new Error('Failed to update transaction');
      }

      // Handle publish toggle separately
      if (o && c.isPublished !== o.isPublished) {
        const res = await authedApiFetch(`/api/admin/tombstones/${c.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish: c.isPublished }),
        });
        if (!res.ok) throw new Error('Failed to update publish status');
      }
    }

    // Deletes
    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await authedApiFetch(`/api/admin/tombstones/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete transaction');
    }

    // Re-fetch
    const listRes = await authedApiFetch('/api/admin/tombstones?limit=200');
    if (listRes.ok) {
      const data = await listRes.json();
      const fresh: Tombstone[] = (data.items || data).map((t: Tombstone) => ({
        ...t,
        asset: t.asset ? { ...t.asset, s3Key: t.asset.s3Key } : null,
      }));
      setOriginalItems(fresh);
      setCurrentItems(fresh);
      setDeletedIds(new Set());
    }
  }, []);

  const discardItems = useCallback(() => {
    setCurrentItems([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges('tombstones', {
      count: computeDirtyCount(),
      save: saveItems,
      discard: discardItems,
    });
  }, [currentItems, originalItems, deletedIds, registerChanges, computeDirtyCount, saveItems, discardItems]);

  useEffect(() => {
    return () => unregisterChanges('tombstones');
  }, [unregisterChanges]);

  // --- Handlers ---

  const updateField = (id: string, field: string, value: string | number | null) => {
    setCurrentItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const togglePublished = (id: string) => {
    setCurrentItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPublished: !t.isPublished } : t))
    );
  };

  const handleAdd = () => {
    setCurrentItems((prev) => [
      {
        id: nextTempId(),
        name: '',
        slug: '',
        assetId: null,
        asset: null,
        industry: null,
        role: null,
        buyerPeFirm: null,
        buyerPlatform: null,
        transactionYear: null,
        isPublished: false,
        industries: [],
      },
      ...prev,
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrentItems((prev) => prev.filter((t) => t.id !== id));
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

  // Filter by search
  const filtered = currentItems.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.industry || '').toLowerCase().includes(q) ||
      (t.buyerPeFirm || '').toLowerCase().includes(q) ||
      (t.buyerPlatform || '').toLowerCase().includes(q)
    );
  });

  const rowClass = (status: ItemStatus): string => {
    switch (status) {
      case 'new': return 'bg-amber-50/50';
      case 'modified': return 'bg-amber-50/30';
      case 'deleted': return 'bg-red-50/50 opacity-50';
      default: return '';
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Transaction
        </button>
        <span className="text-sm text-text-muted">{filtered.length} transactions</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-text-muted">
              <th className="px-3 py-3 w-10"></th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Industry</th>
              <th className="px-3 py-3">PE Firm</th>
              <th className="px-3 py-3">Platform</th>
              <th className="px-3 py-3 w-16">Year</th>
              <th className="px-3 py-3 w-14 text-center">Live</th>
              <th className="px-3 py-3 w-10"></th>
              <th className="px-3 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const status = getStatus(item);
              const isDeleted = status === 'deleted';
              const orig = getOriginal(item.id);
              const imageUrl = item.asset?.s3Key ? toAssetUrl(item.asset.s3Key) : null;

              return (
                <tr
                  key={item.id}
                  className={`group border-b border-border/50 transition-colors hover:bg-blue-50/30 ${rowClass(status)}`}
                >
                  {/* Thumbnail */}
                  <td className="px-3 py-2">
                    <div className="relative h-8 w-8 overflow-hidden rounded bg-gray-100">
                      {imageUrl ? (
                        <Image src={imageUrl} alt="" fill className="object-cover" sizes="32px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[8px] text-gray-300">--</div>
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2 font-medium">
                    <EditableInlineField
                      value={item.name}
                      onChangeValue={(v) => updateField(item.id, 'name', v)}
                      originalValue={orig?.name}
                      as="span"
                      className="text-sm text-text"
                      placeholder="Name..."
                      disabled={isDeleted}
                    />
                  </td>

                  {/* Industry */}
                  <td className="px-3 py-2">
                    <EditableInlineField
                      value={item.industry || ''}
                      onChangeValue={(v) => updateField(item.id, 'industry', v || null)}
                      originalValue={orig?.industry || ''}
                      as="span"
                      className="text-sm text-text-muted"
                      placeholder="--"
                      disabled={isDeleted}
                    />
                  </td>

                  {/* PE Firm */}
                  <td className="px-3 py-2">
                    <EditableInlineField
                      value={item.buyerPeFirm || ''}
                      onChangeValue={(v) => updateField(item.id, 'buyerPeFirm', v || null)}
                      originalValue={orig?.buyerPeFirm || ''}
                      as="span"
                      className="text-sm text-text-muted"
                      placeholder="--"
                      disabled={isDeleted}
                    />
                  </td>

                  {/* Platform */}
                  <td className="px-3 py-2">
                    <EditableInlineField
                      value={item.buyerPlatform || ''}
                      onChangeValue={(v) => updateField(item.id, 'buyerPlatform', v || null)}
                      originalValue={orig?.buyerPlatform || ''}
                      as="span"
                      className="text-sm text-text-muted"
                      placeholder="--"
                      disabled={isDeleted}
                    />
                  </td>

                  {/* Year */}
                  <td className="px-3 py-2">
                    <EditableInlineField
                      value={item.transactionYear?.toString() || ''}
                      onChangeValue={(v) => updateField(item.id, 'transactionYear', v ? parseInt(v, 10) || null : null)}
                      originalValue={orig?.transactionYear?.toString() || ''}
                      as="span"
                      className="text-sm text-text-muted"
                      placeholder="--"
                      disabled={isDeleted}
                    />
                  </td>

                  {/* Published toggle */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => !isDeleted && togglePublished(item.id)}
                      disabled={isDeleted}
                      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        item.isPublished ? 'bg-green-500' : 'bg-gray-300'
                      } ${isDeleted ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          item.isPublished ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    {status === 'new' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">New</span>}
                    {status === 'modified' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Edited</span>}
                    {status === 'deleted' && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">Deleted</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {isDeleted ? (
                        <button
                          onClick={() => handleUndoDelete(item.id)}
                          className="rounded px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50"
                        >
                          Undo
                        </button>
                      ) : (
                        <>
                          {!isTempId(item.id) && (
                            <button
                              onClick={() => requestNavigation(`/admin/transactions/${item.slug}`)}
                              className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit details"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Delete confirmation popover */}
                    {deleteConfirm === item.id && (
                      <div className="absolute right-4 z-30 mt-1 rounded-lg border border-border bg-white p-3 shadow-lg">
                        <p className="mb-2 text-xs font-medium text-gray-800">Delete?</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => setDeleteConfirm(null)} className="rounded border border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50">Cancel</button>
                          <button onClick={() => handleDelete(item.id)} className="rounded bg-red-600 px-2 py-0.5 text-[10px] text-white hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">
            {search ? 'No transactions match your search.' : 'No transactions yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

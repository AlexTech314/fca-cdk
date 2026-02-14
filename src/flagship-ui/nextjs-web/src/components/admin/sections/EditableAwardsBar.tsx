'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminPage } from '../AdminPageContext';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { AssetPickerModal } from '../AssetPickerModal';
import { AwardNameModal } from '../AwardNameModal';

interface Award {
  id: string;
  name: string;
  image: string;
  sortOrder?: number;
}

interface EditableAwardsBarProps {
  initialAwards: Award[];
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-${++tempIdCounter}`;
}

function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

type AwardStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

/**
 * Editable awards bar with staged local state.
 * All changes are local until the SaveBar flushes them.
 */
export function EditableAwardsBar({ initialAwards }: EditableAwardsBarProps) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalAwards, setOriginalAwards] = useState<Award[]>(initialAwards);
  const [currentAwards, setCurrentAwards] = useState<Award[]>(initialAwards);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [nameModalTarget, setNameModalTarget] = useState<string | null>(null);
  const [pendingNewImage, setPendingNewImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Refs for stable closures
  const currentAwardsRef = useRef(currentAwards);
  const originalAwardsRef = useRef(originalAwards);
  const deletedIdsRef = useRef(deletedIds);
  currentAwardsRef.current = currentAwards;
  originalAwardsRef.current = originalAwards;
  deletedIdsRef.current = deletedIds;

  // Get the status of an award
  const getStatus = useCallback((award: Award): AwardStatus => {
    if (deletedIds.has(award.id)) return 'deleted';
    if (isTempId(award.id)) return 'new';
    const orig = originalAwards.find((a) => a.id === award.id);
    if (orig && (orig.name !== award.name || orig.image !== award.image)) return 'modified';
    return 'unchanged';
  }, [originalAwards, deletedIds]);

  // Compute dirty count
  const computeDirtyCount = useCallback((): number => {
    const curr = currentAwardsRef.current;
    const deleted = deletedIdsRef.current;
    const orig = originalAwardsRef.current;

    let count = deleted.size; // deleted awards
    count += curr.filter((a) => isTempId(a.id)).length; // new awards

    // modified awards
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((a) => a.id === c.id);
      if (o && (o.name !== c.name || o.image !== c.image)) count++;
    }

    return count;
  }, []);

  // Save: flush pending changes to API
  const saveAwards = useCallback(async () => {
    const orig = originalAwardsRef.current;
    const curr = currentAwardsRef.current;
    const deleted = deletedIdsRef.current;

    // Creates (temp IDs, not deleted)
    const creates = curr.filter((a) => isTempId(a.id) && !deleted.has(a.id));
    for (const award of creates) {
      const res = await authedApiFetch('/api/admin/awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: award.name, image: award.image, sortOrder: award.sortOrder ?? 0 }),
      });
      if (!res.ok) throw new Error('Failed to create award');
    }

    // Updates (changed name or image, not deleted)
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((a) => a.id === c.id);
      if (o && (o.name !== c.name || o.image !== c.image)) {
        const res = await authedApiFetch(`/api/admin/awards/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: c.name, image: c.image }),
        });
        if (!res.ok) throw new Error('Failed to update award');
      }
    }

    // Deletes
    for (const id of deleted) {
      if (isTempId(id)) continue; // temp awards were never persisted
      const res = await authedApiFetch(`/api/admin/awards/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete award');
    }

    // Re-fetch fresh state
    const listRes = await authedApiFetch('/api/admin/awards');
    if (listRes.ok) {
      const freshAwards: Award[] = await listRes.json();
      setOriginalAwards(freshAwards);
      setCurrentAwards(freshAwards);
      setDeletedIds(new Set());
    }
  }, []);

  // Discard: revert everything
  const discardAwards = useCallback(() => {
    setCurrentAwards([...originalAwardsRef.current]);
    setDeletedIds(new Set());
  }, []);

  // Register with change registry
  useEffect(() => {
    registerChanges('awards', {
      count: computeDirtyCount(),
      save: saveAwards,
      discard: discardAwards,
    });
  }, [currentAwards, originalAwards, deletedIds, registerChanges, computeDirtyCount, saveAwards, discardAwards]);

  useEffect(() => {
    return () => unregisterChanges('awards');
  }, [unregisterChanges]);

  // --- Handlers ---

  const handleImageSelected = (s3Url: string) => {
    if (pickerTarget === 'new') {
      setPendingNewImage(s3Url);
      setPickerTarget(null);
      setNameModalTarget('new');
    } else if (pickerTarget) {
      setCurrentAwards((prev) =>
        prev.map((a) => (a.id === pickerTarget ? { ...a, image: s3Url } : a))
      );
      setPickerTarget(null);
    }
  };

  const handleNameSubmit = (name: string) => {
    if (nameModalTarget === 'new' && pendingNewImage) {
      setCurrentAwards((prev) => [
        ...prev,
        { id: nextTempId(), name, image: pendingNewImage, sortOrder: prev.length },
      ]);
      setPendingNewImage(null);
    } else if (nameModalTarget) {
      setCurrentAwards((prev) =>
        prev.map((a) => (a.id === nameModalTarget ? { ...a, name } : a))
      );
    }
    setNameModalTarget(null);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      // Temp awards can be removed outright -- they were never saved
      setCurrentAwards((prev) => prev.filter((a) => a.id !== id));
    } else {
      // Mark existing awards as pending delete
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

  const dirtyCount = computeDirtyCount();

  // Status label for subtitle
  const statusLabel = (status: AwardStatus): string | null => {
    switch (status) {
      case 'new': return 'New — will be created on save';
      case 'modified': return 'Modified — will be updated on save';
      case 'deleted': return 'Deleted — will be removed on save';
      default: return null;
    }
  };

  // Border classes by status
  const borderClass = (status: AwardStatus): string => {
    switch (status) {
      case 'new': return 'border-2 border-dashed border-amber-400';
      case 'modified': return 'border-2 border-dashed border-amber-400';
      case 'deleted': return 'border-2 border-red-400 opacity-50';
      default: return 'border-2 border-transparent';
    }
  };

  return (
    <section className="border-y border-border/50 bg-gradient-to-r from-surface via-white to-surface py-12 md:py-16 lg:py-20">
      <div className="container-max">
        <p className="mb-8 text-center text-base font-semibold uppercase tracking-wider text-primary/60 md:mb-10 md:text-lg">
          Awards &amp; Recognition
          {dirtyCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {dirtyCount} unsaved
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          {currentAwards.map((award) => {
            const status = getStatus(award);
            const isDeleted = status === 'deleted';
            const label = statusLabel(status);

            return (
              <div key={award.id} className="group relative">
                {/* Award image with status border */}
                <div className={`relative h-20 w-32 rounded-lg transition-all sm:h-24 sm:w-36 md:h-28 md:w-44 lg:h-32 lg:w-48 ${borderClass(status)}`}>
                  <Image
                    src={award.image}
                    alt={award.name}
                    fill
                    className={`object-contain p-1 ${isDeleted ? 'grayscale' : ''}`}
                    sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, (max-width: 1024px) 176px, 192px"
                  />

                  {/* Hover actions (hidden for deleted) */}
                  {!isDeleted && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setPickerTarget(award.id)}
                        className="rounded-md bg-white/90 p-1.5 text-gray-700 shadow hover:bg-white"
                        title="Change image"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setNameModalTarget(award.id)}
                        className="rounded-md bg-white/90 p-1.5 text-gray-700 shadow hover:bg-white"
                        title="Edit name"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(award.id)}
                        className="rounded-md bg-red-500/90 p-1.5 text-white shadow hover:bg-red-600"
                        title="Delete award"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Undo delete overlay */}
                  {isDeleted && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                      <button
                        onClick={() => handleUndoDelete(award.id)}
                        className="rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-medium text-red-600 shadow hover:bg-white"
                      >
                        Undo
                      </button>
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {deleteConfirm === award.id && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/95 p-2">
                      <p className="text-center text-[10px] font-medium text-gray-800">Delete?</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded border border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(award.id)}
                          className="rounded bg-red-600 px-2 py-0.5 text-[10px] text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status label / award name */}
                {label ? (
                  <p className={`mt-1.5 w-32 text-center text-[9px] font-medium sm:w-36 md:w-44 lg:w-48 ${
                    isDeleted ? 'text-red-500' : 'text-amber-600'
                  }`}>
                    {label}
                  </p>
                ) : (
                  <p className="mt-2 w-32 truncate text-center text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 sm:w-36 md:w-44 lg:w-48">
                    {award.name}
                  </p>
                )}
              </div>
            );
          })}

          {/* Add Award button */}
          <button
            onClick={() => setPickerTarget('new')}
            className="flex h-20 w-32 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500 sm:h-24 sm:w-36 md:h-28 md:w-44 lg:h-32 lg:w-48"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-xs font-medium">Add Award</span>
          </button>
        </div>
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => { setPickerTarget(null); setPendingNewImage(null); }}
        onSelect={handleImageSelected}
        currentValue={
          pickerTarget && pickerTarget !== 'new'
            ? currentAwards.find((a) => a.id === pickerTarget)?.image
            : undefined
        }
      />

      {/* Award Name Modal */}
      <AwardNameModal
        isOpen={nameModalTarget !== null}
        onClose={() => { setNameModalTarget(null); setPendingNewImage(null); }}
        onSubmit={handleNameSubmit}
        initialValue={
          nameModalTarget && nameModalTarget !== 'new'
            ? currentAwards.find((a) => a.id === nameModalTarget)?.name
            : ''
        }
      />
    </section>
  );
}

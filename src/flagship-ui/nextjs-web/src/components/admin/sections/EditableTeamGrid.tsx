'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminPage } from '../AdminPageContext';
import { AssetPickerModal } from '../AssetPickerModal';
import { EditableInlineField } from '../EditableInlineField';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { toAssetUrl } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  image: string | null;
  bio: string;
  email: string | null;
  linkedIn: string | null;
  category: string;
  sortOrder: number;
}

interface EditableTeamGridProps {
  initialMembers: TeamMember[];
  category: 'leadership' | 'analyst';
  changeKey: string;
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-member-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.startsWith('temp-member-');
}

type MemberStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

export function EditableTeamGrid({ initialMembers, category, changeKey }: EditableTeamGridProps) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalMembers, setOriginalMembers] = useState<TeamMember[]>(initialMembers);
  const [currentMembers, setCurrentMembers] = useState<TeamMember[]>(initialMembers);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Photo picker
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Refs for stable closures
  const currentRef = useRef(currentMembers);
  const originalRef = useRef(originalMembers);
  const deletedRef = useRef(deletedIds);
  currentRef.current = currentMembers;
  originalRef.current = originalMembers;
  deletedRef.current = deletedIds;

  const getOriginal = (id: string) => originalMembers.find((m) => m.id === id);

  const getStatus = useCallback((member: TeamMember): MemberStatus => {
    if (deletedIds.has(member.id)) return 'deleted';
    if (isTempId(member.id)) return 'new';
    const orig = originalMembers.find((m) => m.id === member.id);
    if (orig) {
      if (
        orig.name !== member.name ||
        orig.title !== member.title ||
        orig.bio !== member.bio ||
        orig.image !== member.image ||
        orig.email !== member.email ||
        orig.linkedIn !== member.linkedIn
      ) return 'modified';
    }
    return 'unchanged';
  }, [originalMembers, deletedIds]);

  const computeDirtyCount = useCallback((): number => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    let count = deleted.size;
    count += curr.filter((m) => isTempId(m.id)).length;

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((m) => m.id === c.id);
      if (o && (
        o.name !== c.name || o.title !== c.title || o.bio !== c.bio ||
        o.image !== c.image || o.email !== c.email || o.linkedIn !== c.linkedIn
      )) count++;
    }

    return count;
  }, []);

  const saveMembers = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;
    const deleted = deletedRef.current;

    const creates = curr.filter((m) => isTempId(m.id) && !deleted.has(m.id));
    for (const member of creates) {
      const res = await authedApiFetch('/api/admin/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: member.name, title: member.title, bio: member.bio,
          image: member.image, email: member.email, linkedIn: member.linkedIn,
          category: member.category, sortOrder: member.sortOrder,
        }),
      });
      if (!res.ok) throw new Error('Failed to create team member');
    }

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((m) => m.id === c.id);
      if (o && (
        o.name !== c.name || o.title !== c.title || o.bio !== c.bio ||
        o.image !== c.image || o.email !== c.email || o.linkedIn !== c.linkedIn
      )) {
        const res = await authedApiFetch(`/api/admin/team-members/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: c.name, title: c.title, bio: c.bio,
            image: c.image, email: c.email, linkedIn: c.linkedIn,
          }),
        });
        if (!res.ok) throw new Error('Failed to update team member');
      }
    }

    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await authedApiFetch(`/api/admin/team-members/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete team member');
    }

    const listRes = await authedApiFetch(`/api/admin/team-members?category=${category}`);
    if (listRes.ok) {
      const raw: TeamMember[] = await listRes.json();
      const fresh = raw.map((m) => ({ ...m, image: toAssetUrl(m.image) ?? m.image }));
      setOriginalMembers(fresh);
      setCurrentMembers(fresh);
      setDeletedIds(new Set());
    }
  }, [category]);

  const discardMembers = useCallback(() => {
    setCurrentMembers([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges(changeKey, {
      count: computeDirtyCount(),
      save: saveMembers,
      discard: discardMembers,
    });
  }, [currentMembers, originalMembers, deletedIds, registerChanges, computeDirtyCount, saveMembers, discardMembers, changeKey]);

  useEffect(() => {
    return () => unregisterChanges(changeKey);
  }, [unregisterChanges, changeKey]);

  // --- Handlers ---

  const updateMemberField = (id: string, field: string, value: string) => {
    setCurrentMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleImageSelected = (s3Url: string) => {
    if (pickerTarget) {
      setCurrentMembers((prev) =>
        prev.map((m) => (m.id === pickerTarget ? { ...m, image: s3Url } : m))
      );
      setPickerTarget(null);
    }
  };

  const handleAdd = () => {
    const newId = nextTempId();
    setCurrentMembers((prev) => [
      ...prev,
      {
        id: newId, name: '', title: '', image: null, bio: '',
        email: null, linkedIn: null, category, sortOrder: prev.length,
      },
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrentMembers((prev) => prev.filter((m) => m.id !== id));
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

  const borderClass = (status: MemberStatus): string => {
    switch (status) {
      case 'new': return 'border-2 border-dashed border-amber-400';
      case 'modified': return 'border-2 border-dashed border-amber-400';
      case 'deleted': return 'border-2 border-red-400 opacity-50';
      default: return 'border border-border';
    }
  };

  const isLeadership = category === 'leadership';

  return (
    <>
      <div className={`grid gap-6 ${isLeadership ? 'lg:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {currentMembers.map((member) => {
          const status = getStatus(member);
          const isDeleted = status === 'deleted';
          const orig = getOriginal(member.id);

          return (
            <div
              key={member.id}
              className={`group/card relative overflow-hidden rounded-xl bg-white transition-all ${borderClass(status)}`}
            >
              {/* Status badge */}
              {status === 'new' && (
                <div className="absolute left-2 top-2 z-10 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">New</div>
              )}
              {status === 'modified' && (
                <div className="absolute left-2 top-2 z-10 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Modified</div>
              )}
              {status === 'deleted' && (
                <div className="absolute left-2 top-2 z-10 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">Will be removed</div>
              )}

              {/* Delete / Undo */}
              {isDeleted ? (
                <button onClick={() => handleUndoDelete(member.id)} className="absolute right-2 top-2 z-10 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 shadow hover:bg-white">Undo</button>
              ) : (
                <button onClick={() => setDeleteConfirm(member.id)} className="absolute right-2 top-2 z-10 rounded bg-white/80 p-1 text-gray-400 opacity-0 shadow transition-opacity hover:bg-white hover:text-red-500 group-hover/card:opacity-100" title="Delete">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}

              {/* Delete confirmation */}
              {deleteConfirm === member.id && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/95">
                  <p className="text-sm font-medium text-gray-800">Delete {member.name || 'this member'}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={() => handleDelete(member.id)} className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">Delete</button>
                  </div>
                </div>
              )}

              {/* Leadership photo */}
              {isLeadership && (
                <>
                  <div className="group/photo relative h-40 w-full cursor-pointer bg-gray-100 sm:hidden" onClick={() => !isDeleted && setPickerTarget(member.id)}>
                    {member.image ? (
                      <Image src={member.image} alt={member.name || 'Team member'} fill className={`object-cover object-top ${isDeleted ? 'grayscale' : ''}`} sizes="100vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                      </div>
                    )}
                    {!isDeleted && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/photo:opacity-100">
                        <span className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">{member.image ? 'Change Photo' : 'Add Photo'}</span>
                      </div>
                    )}
                  </div>
                  <div className="group/photo absolute inset-y-0 left-0 hidden w-36 cursor-pointer bg-gray-100 sm:block" onClick={() => !isDeleted && setPickerTarget(member.id)}>
                    {member.image ? (
                      <Image src={member.image} alt={member.name || 'Team member'} fill className={`object-cover object-top ${isDeleted ? 'grayscale' : ''}`} sizes="144px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                      </div>
                    )}
                    {!isDeleted && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/photo:opacity-100">
                        <span className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">{member.image ? 'Change Photo' : 'Add Photo'}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Analyst photo */}
              {!isLeadership && (
                <div className="group/photo relative aspect-square w-full cursor-pointer bg-gray-100" onClick={() => !isDeleted && setPickerTarget(member.id)}>
                  {member.image ? (
                    <Image src={member.image} alt={member.name || 'Team member'} fill className={`object-cover object-top ${isDeleted ? 'grayscale' : ''}`} sizes="(max-width: 640px) 50vw, 25vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                    </div>
                  )}
                  {!isDeleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/photo:opacity-100">
                      <span className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">{member.image ? 'Change Photo' : 'Add Photo'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={`flex-1 p-3 ${isLeadership ? 'sm:ml-36' : ''}`}>
                <EditableInlineField
                  value={member.name}
                  onChangeValue={(v) => updateMemberField(member.id, 'name', v)}
                  originalValue={orig?.name}
                  as="h3"
                  className="text-lg font-semibold text-text"
                  placeholder="Name..."
                  disabled={isDeleted}
                />
                <EditableInlineField
                  value={member.title}
                  onChangeValue={(v) => updateMemberField(member.id, 'title', v)}
                  originalValue={orig?.title}
                  as="p"
                  className="mt-0.5 text-sm text-secondary"
                  placeholder="Title..."
                  disabled={isDeleted}
                />
                <div className="mt-3">
                  <EditableInlineField
                    value={member.bio}
                    onChangeValue={(v) => updateMemberField(member.id, 'bio', v)}
                    originalValue={orig?.bio}
                    as="p"
                    multiline
                    className="text-sm text-text-muted"
                    placeholder="Bio..."
                    disabled={isDeleted}
                  />
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <EditableInlineField
                      value={member.email || ''}
                      onChangeValue={(v) => updateMemberField(member.id, 'email', v)}
                      originalValue={orig?.email || ''}
                      as="span"
                      className="text-xs text-text-muted"
                      placeholder="Email..."
                      disabled={isDeleted}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <EditableInlineField
                      value={member.linkedIn || ''}
                      onChangeValue={(v) => updateMemberField(member.id, 'linkedIn', v)}
                      originalValue={orig?.linkedIn || ''}
                      as="span"
                      className="text-xs text-text-muted"
                      placeholder="LinkedIn URL..."
                      disabled={isDeleted}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add button */}
        <button
          onClick={handleAdd}
          className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-sm font-medium">Add {isLeadership ? 'Leader' : 'Analyst'}</span>
        </button>
      </div>

      <AssetPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleImageSelected}
        currentValue={pickerTarget ? currentMembers.find((m) => m.id === pickerTarget)?.image ?? undefined : undefined}
      />
    </>
  );
}
